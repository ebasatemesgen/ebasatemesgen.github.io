// Real-world fly-to maps: Esri World Imagery satellite tiles over open elevation data
// (Mapzen terrain tiles on AWS), rendered as a globe with MapLibre GL.
const MAPLIBRE = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl';

export const PLACES = {
	vienna: { name: 'VIECON – Vienna Congress & Convention Center', note: 'IEEE ICRA 2026 · Messeplatz 1, 1020 Vienna, Austria', center: [16.4156, 48.2166], zoom: 16, pitch: 62, bearing: -30 },
	'santa-clara': { name: 'Santa Clara University', note: 'IEEE/ACM SEC 2026 · 500 El Camino Real, Santa Clara, CA 95053, USA', center: [-121.938, 37.3496], zoom: 15.2, pitch: 58, bearing: -20 },
	auckland: { name: 'Cordis, Auckland', note: 'AAMAS 2024 · 83 Symonds Street, Grafton, Auckland 1010, New Zealand', center: [174.7612, -36.8606], zoom: 16, pitch: 58, bearing: 20 },
	atlanta: { name: 'Georgia World Congress Center', note: 'IEEE ICRA 2025 · 285 Andrew Young International Blvd NW, Atlanta, GA 30313, USA', center: [-84.3963, 33.759], zoom: 16, pitch: 60, bearing: -20 },
	philadelphia: { name: 'Pennsylvania Convention Center', note: 'AAAI 2025 · 1101 Arch Street, Philadelphia, PA 19107, USA', center: [-75.1581, 39.9551], zoom: 16, pitch: 58, bearing: -20 },
	detroit: { name: 'Huntington Place', note: 'IEEE IROS 2023 · 1 Washington Boulevard, Detroit, MI 48226, USA', center: [-83.0536, 42.3263], zoom: 16, pitch: 58, bearing: -20 },
	'washington-dc': { name: 'Walter E. Washington Convention Center', note: 'AAAI SIAIA 2023 · 801 Mt Vernon Place NW, Washington, DC 20001, USA', center: [-77.0229, 38.9048], zoom: 16, pitch: 58, bearing: -20 },
	haughton: { name: 'Haughton Crater, Devon Island', note: 'Mars-analog field site in the Canadian High Arctic', center: [-89.68, 75.38], zoom: 10.4, pitch: 64, bearing: 25 },
	bishop: { name: 'Bishop Tuff, California', note: 'TRIDENT field testing with NASA Ames and the Goddard Instrument Field Team, fall 2023', center: [-118.44, 37.47], zoom: 11.2, pitch: 64, bearing: 15 },
	// Esri only has real imagery down to zoom 13 in Antarctica (deeper tiles are "no data" placeholders)
	untersee: { name: 'Lake Untersee, Antarctica', note: 'Ice-covered lake in Dronning Maud Land · TRIDENT fieldwork', center: [13.45, -71.343], zoom: 10.6, pitch: 50, bearing: 160, imageryMaxZoom: 13, exaggeration: 1 },
	antarctica: { name: 'Dronning Maud Land, Antarctica', note: 'Lake Untersee and Schirmacher Oasis', center: [12.55, -71.06], zoom: 7.6, pitch: 42, bearing: -10, imageryMaxZoom: 13, exaggeration: 1 },
	schirmacher: { name: 'Schirmacher Oasis, Antarctica', note: 'Ice-free cold-desert hills · TRIDENT fieldwork', center: [11.64, -70.758], zoom: 11.8, pitch: 64, bearing: 30, imageryMaxZoom: 13 },
};

let libPromise = null;
export function loadMaplibre() {
	if (window.maplibregl) return Promise.resolve(window.maplibregl);
	if (!libPromise) {
		libPromise = new Promise((resolve, reject) => {
			const css = document.createElement('link');
			css.rel = 'stylesheet';
			css.href = `${MAPLIBRE}.css`;
			document.head.appendChild(css);
			const s = document.createElement('script');
			s.src = `${MAPLIBRE}.js`;
			s.onload = () => resolve(window.maplibregl);
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}
	return libPromise;
}

function style(imageryMaxZoom = 18) {
	return {
		version: 8,
		// a globe while zoomed out that flattens into a regular map close in
		projection: { type: ['interpolate', ['linear'], ['zoom'], 6, 'vertical-perspective', 8, 'mercator'] },
		sources: {
			satellite: {
				type: 'raster',
				tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
				tileSize: 256,
				maxzoom: imageryMaxZoom,
				attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
			},
			labels: {
				type: 'raster',
				tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
				tileSize: 256,
				maxzoom: 18,
			},
			elevation: {
				type: 'raster-dem',
				tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
				tileSize: 256,
				maxzoom: 14,
				encoding: 'terrarium',
				attribution: 'Elevation: Mapzen Terrain Tiles on AWS',
			},
		},
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': '#05070d' } },
			{ id: 'satellite', type: 'raster', source: 'satellite' },
			{ id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.85 } },
		],
	};
}

function markerEl(place) {
	const el = document.createElement('div');
	el.className = 'place-marker';
	el.innerHTML = `<span class="place-marker__dot"></span><span class="place-marker__name">${place.name}</span>`;
	return el;
}

// Terrain is only switched on once the camera has arrived: moving the camera while 3D terrain
// is still loading on the globe makes MapLibre 5.6 throw in its tile fading.
const flights = new WeakMap();
const TERRAIN = 1.4; // default relief exaggeration; steep basins like Lake Untersee use true scale

function lowerTerrain(map) {
	if (map.getTerrain()) map.setTerrain(null);
}

// the mountains rise out of the satellite image over about a second
function raiseTerrain(map, id, target = TERRAIN) {
	let step = 0;
	const rise = () => {
		if (flights.get(map) !== id) return;
		step += 1;
		map.setTerrain({ source: 'elevation', exaggeration: (target * step) / 12 });
		if (step < 12) setTimeout(rise, 90);
	};
	rise();
}

// Starts on the whole globe from above, then descends and tilts into a 3D view of the place.
export function flyTo(map, place, { duration = 7000 } = {}) {
	// a newer flight cancels the terrain and orbit queued by an older one
	const id = (flights.get(map) || 0) + 1;
	flights.set(map, id);
	map.stop();
	lowerTerrain(map);
	map.flyTo({ center: place.center, zoom: place.zoom, pitch: place.pitch, bearing: place.bearing, duration, curve: 1.5, essential: true });
	map.once('moveend', () => {
		if (flights.get(map) !== id) return;
		raiseTerrain(map, id, place.exaggeration || TERRAIN);
		// then a slow orbit, so the terrain reads as 3D
		setTimeout(() => {
			if (flights.get(map) === id) map.easeTo({ bearing: place.bearing + 40, duration: 24000, easing: (x) => x });
		}, 1400);
	});
}

export async function createMap(container, { places = [], start = null, interactive = true } = {}) {
	const maplibregl = await loadMaplibre();
	const first = PLACES[start || places[0]];
	const imageryMaxZoom = Math.min(...[start, ...places].filter(Boolean).map((k) => PLACES[k].imageryMaxZoom || 18));
	const map = new maplibregl.Map({
		container,
		style: style(imageryMaxZoom),
		center: [first.center[0], first.center[1] * 0.35],
		zoom: 0.9,
		pitch: 0,
		attributionControl: { compact: true },
		interactive,
		maxPitch: 75,
	});
	map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: true }), 'top-right');
	map.scrollZoom.disable();
	await new Promise((resolve) => map.once('load', resolve));
	places.forEach((key) => {
		const p = PLACES[key];
		const el = markerEl(p);
		el.addEventListener('click', () => flyTo(map, p, { duration: 4000 }));
		new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(p.center).addTo(map);
	});
	return map;
}

// Full-screen place viewer opened from any [data-place] link on the page.
// Each opening gets a fresh map: re-flying a reused MapLibre 5.6 map makes its tile fading throw.
let overlay = null;
let overlayMap = null;
let lastFocus = null;

function closeOverlay() {
	if (!overlay || overlay.hidden) return;
	overlay.hidden = true;
	document.documentElement.classList.remove('place-open');
	if (overlayMap) {
		flights.set(overlayMap, (flights.get(overlayMap) || 0) + 1);
		overlayMap.remove();
		overlayMap = null;
	}
	if (lastFocus) lastFocus.focus();
}

export async function openPlace(key) {
	const place = PLACES[key];
	if (!place) return;
	lastFocus = document.activeElement;
	if (!overlay) {
		overlay = document.createElement('div');
		overlay.className = 'place-overlay';
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.innerHTML = `
			<div class="place-overlay__panel">
				<div class="place-overlay__head">
					<div><strong class="place-overlay__name"></strong><span class="place-overlay__note"></span></div>
					<button type="button" class="place-overlay__close" aria-label="Close map">×</button>
				</div>
				<div class="place-overlay__map"></div>
				<p class="place-overlay__hint">Drag to look around · right-drag or two fingers to tilt</p>
			</div>`;
		document.body.appendChild(overlay);
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) closeOverlay();
		});
		overlay.querySelector('.place-overlay__close').addEventListener('click', closeOverlay);
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') closeOverlay();
		});
	}
	overlay.querySelector('.place-overlay__name').textContent = place.name;
	overlay.querySelector('.place-overlay__note').textContent = place.note;
	overlay.setAttribute('aria-label', `Map of ${place.name}`);
	overlay.hidden = false;
	document.documentElement.classList.add('place-open');
	overlay.querySelector('.place-overlay__close').focus();

	const host = overlay.querySelector('.place-overlay__map');
	host.innerHTML = '';
	const container = document.createElement('div');
	container.className = 'place-overlay__canvas';
	host.appendChild(container);
	try {
		const map = await createMap(container, { places: [key] });
		if (overlay.hidden || !container.isConnected) {
			map.remove();
			return;
		}
		overlayMap = map;
		setTimeout(() => {
			if (overlayMap === map) flyTo(map, place);
		}, 500);
	} catch (e) {
		host.innerHTML = `<p class="place-overlay__error">The map could not load. <a href="https://www.openstreetmap.org/#map=${Math.round(place.zoom)}/${place.center[1]}/${place.center[0]}" target="_blank" rel="noopener noreferrer">Open ${place.name} in OpenStreetMap ↗</a></p>`;
	}
}

export function bindPlaces(root = document) {
	root.addEventListener('click', (e) => {
		const el = e.target.closest('[data-place]');
		if (!el) return;
		e.preventDefault();
		openPlace(el.dataset.place);
	});
}
