// Interactive figures for the NASA drilling papers in the Publications section.
// Each paper's figure is built the first time its card is shown, and only animates while visible.
import { bindPlaces, createMap, flyTo, PLACES } from './placemap.js';
import { PARTS, ROVER_PARTS } from './trident-specs.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let tridentModule = null;
function loadTrident() {
	tridentModule = tridentModule || import('./trident3d.js');
	return tridentModule;
}

function webglAvailable() {
	try {
		const c = document.createElement('canvas');
		return !!(c.getContext('webgl2') || c.getContext('webgl'));
	} catch (e) {
		return false;
	}
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// MASSpace'24: the real K-REX2 rover breaking out of its photo, with the drill explorable in 3D
async function setupDrillViewer(box) {
	const model = box.querySelector('.pub-trident__model');
	const rover = box.querySelector('.pub-rover');
	const view = box.querySelector('.pub-trident__view');
	const info = box.querySelector('.pub-rover__info');
	const spots = box.querySelectorAll('.pub-rover__spot');
	const modeBtn = box.querySelector('[data-action="mode"]');
	const deployBtn = box.querySelector('[data-action="deploy"]');
	const biteBtn = box.querySelector('[data-action="bite"]');
	const facts = { ...PARTS, ...ROVER_PARTS };

	// hotspots on the real hardware
	let activeSpot = null;
	const closeInfo = () => {
		info.hidden = true;
		activeSpot = null;
		spots.forEach((s) => s.classList.remove('is-active'));
	};
	spots.forEach((spot) => {
		spot.addEventListener('click', () => {
			if (activeSpot === spot) {
				closeInfo();
				return;
			}
			activeSpot = spot;
			spots.forEach((s) => s.classList.toggle('is-active', s === spot));
			const fact = facts[spot.dataset.part];
			info.innerHTML = `<button type="button" class="trident3d__close" aria-label="Close">×</button><strong>${fact.name}</strong>${fact.text}`;
			info.querySelector('.trident3d__close').addEventListener('click', closeInfo);
			info.hidden = false;
		});
	});

	// depth: the photo and the cut-out rover shift by different amounts as the pointer moves,
	// and drift slowly on their own when nobody is pointing at them
	const aim = { x: 0, y: 0 };
	const at = { x: 0, y: 0 };
	let hovering = false;
	let parallaxRaf = 0;
	rover.addEventListener('pointermove', (e) => {
		const r = rover.getBoundingClientRect();
		aim.x = ((e.clientX - r.left) / r.width) * 2 - 1;
		aim.y = ((e.clientY - r.top) / r.height) * 2 - 1;
		hovering = true;
	});
	rover.addEventListener('pointerleave', () => {
		hovering = false;
	});
	const parallax = (now) => {
		parallaxRaf = requestAnimationFrame(parallax);
		if (!hovering) {
			aim.x = Math.sin(now / 2600) * 0.45;
			aim.y = Math.sin(now / 3900) * 0.25;
		}
		at.x += (aim.x - at.x) * 0.07;
		at.y += (aim.y - at.y) * 0.07;
		rover.style.setProperty('--tx', at.x.toFixed(4));
		rover.style.setProperty('--ty', at.y.toFixed(4));
	};

	// the drill on its own in 3D, built the first time someone asks for it
	let drill = null;
	let mode = 'real';
	let visible = false;
	let deployed = false;
	const run = async (task) => {
		deployBtn.disabled = true;
		biteBtn.disabled = true;
		try {
			await task();
		} finally {
			deployBtn.disabled = false;
			biteBtn.disabled = false;
			deployBtn.textContent = deployed ? 'Stow' : 'Deploy';
		}
	};
	const deploy = async () => {
		drill.setSpeed(1);
		drill.setDeploy(1);
		await drill.settle();
		deployed = true;
	};
	const stow = async () => {
		drill.setSpeed(1);
		drill.setRpm(0);
		drill.setPercussion(false);
		drill.setDepth(0);
		await drill.settle();
		drill.setDeploy(0);
		await drill.settle();
		deployed = false;
	};
	deployBtn.addEventListener('click', () => run(deployed ? stow : deploy));
	// footpad down, drill one 10 cm bite with rotation and percussion, then pull the auger back up
	biteBtn.addEventListener('click', () => run(async () => {
		const { SPEC } = await loadTrident();
		await deploy();
		drill.setSpeed(0.22);
		drill.setRpm(SPEC.drillRpm);
		drill.setPercussion(true);
		drill.setDepth(SPEC.biteDepth);
		await drill.settle();
		drill.setPercussion(false);
		drill.setRpm(SPEC.retractRpm);
		drill.setSpeed(0.6);
		drill.setDepth(0);
		await drill.settle();
		drill.setRpm(0);
	}));

	const controller = {
		start() {
			visible = true;
			cancelAnimationFrame(parallaxRaf);
			if (mode === 'real' && !reducedMotion) parallaxRaf = requestAnimationFrame(parallax);
			if (mode === '3d' && drill) drill.start();
		},
		stop() {
			visible = false;
			cancelAnimationFrame(parallaxRaf);
			if (drill) drill.stop();
		},
	};

	const has3d = webglAvailable();
	if (!has3d) modeBtn.hidden = true;
	modeBtn.addEventListener('click', async () => {
		closeInfo();
		mode = mode === 'real' ? '3d' : 'real';
		const in3d = mode === '3d';
		rover.hidden = in3d;
		view.hidden = !in3d;
		deployBtn.hidden = !in3d;
		biteBtn.hidden = !in3d;
		modeBtn.textContent = in3d ? 'Back to the real rover' : 'Explore TRIDENT in 3D';
		modeBtn.classList.toggle('is-primary', !in3d);
		if (in3d && !drill) {
			const { createTrident } = await loadTrident();
			drill = createTrident(view, { ground: null, shadow: true, transparent: true, view: 'focus', autoRotate: !reducedMotion, infoHost: model });
		}
		if (in3d) {
			drill.setDeploy(deployed ? 1 : 0, true);
		} else if (drill) {
			drill.stop();
		}
		if (visible) controller.start();
	});
	return controller;
}

// ICRA 2025 workshop: interactive replot of the paper's hole 7 telemetry
async function setupPlot(box) {
	const [{ createDrillPlot }, data] = await Promise.all([
		import('./drillplot.js'),
		fetch(box.dataset.telemetry).then((r) => r.json()),
	]);
	return createDrillPlot(box, data, { reducedMotion });
}

// Annals: a real satellite map of the two Antarctic sites. It flies in, circles the pair, then
// travels to each site and hands over to that site's real field photo.
const SITE_THUMBS = {
	untersee: 'images/highlighted-projects/drill/annals26-lake-untersee.jpg',
	schirmacher: 'images/highlighted-projects/drill/annals26-schirmacher-oasis.jpg',
};

async function setupSites(box) {
	const mapHost = box.querySelector('.pub-sites__map');
	const photos = box.querySelectorAll('.pub-sites__photo');
	const tabs = box.querySelectorAll('.pub-sites__tab');
	let map = null;
	let run = 0; // each new request cancels the sequence before it
	let autoTimer = 0;
	let started = false;

	const setTab = (id) => tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.go === id));
	const showPhoto = (id) => photos.forEach((p) => p.classList.toggle('is-shown', p.dataset.site === id));
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const fly = (place, duration) => {
		if (reducedMotion) {
			map.jumpTo({ center: place.center, zoom: place.zoom, pitch: place.pitch, bearing: place.bearing });
			return Promise.resolve();
		}
		// start the flight first: stopping the previous orbit fires its own moveend
		flyTo(map, place, { duration });
		return new Promise((r) => map.once('moveend', r));
	};

	async function go(id) {
		const mine = ++run;
		clearTimeout(autoTimer);
		setTab(id);
		const photoUp = [...photos].some((p) => p.classList.contains('is-shown'));
		showPhoto(null);
		if (!map) return;
		if (id === 'overview') {
			await fly(PLACES.antarctica, photoUp ? 2500 : 6000);
			return;
		}
		// back out over both sites, then down into the chosen one, then its photo
		if (photoUp) {
			await wait(400);
			if (mine !== run) return;
			await fly(PLACES.antarctica, 2200);
			if (mine !== run) return;
		}
		await fly(PLACES[id], 3200);
		if (mine !== run) return;
		await wait(reducedMotion ? 0 : 900);
		if (mine === run) showPhoto(id);
	}

	tabs.forEach((t) => t.addEventListener('click', () => go(t.dataset.go)));

	// the photos lean very slightly toward the pointer
	photos.forEach((p) => {
		const frame = p.querySelector('.pub-sites__frame');
		p.addEventListener('pointermove', (e) => {
			if (reducedMotion) return;
			const r = p.getBoundingClientRect();
			const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
			const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
			frame.style.transform = `perspective(900px) rotateY(${(nx * 3).toFixed(2)}deg) rotateX(${(-ny * 2).toFixed(2)}deg) scale(1.015)`;
		});
		p.addEventListener('pointerleave', () => {
			frame.style.transform = '';
		});
	});

	async function begin() {
		if (started) return;
		started = true;
		setTab('overview');
		try {
			map = await createMap(mapHost, { start: 'antarctica' });
		} catch (e) {
			mapHost.innerHTML = '<p class="place-overlay__error">The map could not load.</p>';
			go('untersee');
			return;
		}
		// each site's pin carries a thumbnail of its real photo
		['untersee', 'schirmacher'].forEach((id) => {
			const el = document.createElement('button');
			el.type = 'button';
			el.className = 'site-marker';
			el.innerHTML = `<img src="${SITE_THUMBS[id]}" alt=""><span class="site-marker__name">${PLACES[id].name.split(',')[0]}</span><span class="site-marker__dot"></span>`;
			el.addEventListener('click', () => go(id));
			new window.maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(PLACES[id].center).addTo(map);
		});
		// frame both sites, leaving room above each pin for its photo
		try {
			const cam = map.cameraForBounds([[11.64, -71.343], [13.45, -70.758]], {
				padding: { top: 150, bottom: 50, left: 90, right: 90 },
				bearing: PLACES.antarctica.bearing,
			});
			if (cam) Object.assign(PLACES.antarctica, { center: cam.center.toArray(), zoom: cam.zoom - 0.25, pitch: 30 });
		} catch (e) {
			// keep the preset overview
		}
		const mine = ++run;
		await fly(PLACES.antarctica, 6000);
		// circle the two sites for a moment, then visit Lake Untersee
		if (mine === run && !reducedMotion) autoTimer = setTimeout(() => go('untersee'), 5000);
	}

	return {
		start: begin,
		stop() {},
	};
}

const SETUPS = {
	trident: setupDrillViewer,
	plot: setupPlot,
	sites: setupSites,
};

function wirePanel(panel) {
	const box = panel.querySelector('[data-interactive]');
	if (!box) return;
	let controller = null;
	let pending = null;
	let onScreen = false;

	const sync = async () => {
		const active = panel.classList.contains('is-active');
		if (active && !controller && !pending) {
			pending = SETUPS[box.dataset.interactive](box).catch((e) => {
				console.warn('Interactive figure unavailable:', e);
				return null;
			});
			controller = await pending;
			pending = null;
		}
		if (!controller) return;
		if (active && onScreen) controller.start();
		else controller.stop();
	};

	new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['class'] });
	new IntersectionObserver((entries) => {
		onScreen = entries[0].isIntersecting;
		sync();
	}, { rootMargin: '120px' }).observe(panel);
}

bindPlaces(document);
document.querySelectorAll('.pub-chain__panel').forEach(wirePanel);
