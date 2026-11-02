// Interactive "how uneven is the CIFAR-10 split" figure, in the talk's style.
// Each class is spread over the 20 clients with a Dirichlet(α) draw, as in the paper (α = 0.3);
// the other settings show what a gentler or harsher split would look like. Draws are seeded.
(function () {
	'use strict';
	const host = document.querySelector('[data-cifar]');
	if (!host) return;

	const NS = 'http://www.w3.org/2000/svg';
	const CLASSES = ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck'];
	const C = 20;
	const K = 10;
	const SETTINGS = [
		{ id: 'iid', label: 'IID', alpha: null, text: '<b>IID:</b> every client holds roughly 10% of each class, so local models all learn the same thing.' },
		{ id: '1', label: 'α = 1', alpha: 1, text: '<b>α = 1:</b> mild skew. Clients lean toward some classes but still see most of them.' },
		{ id: '0.3', label: 'α = 0.3 · paper', alpha: 0.3, text: '<b>α = 0.3, the paper\'s setting:</b> most clients hold mainly two or three classes, so local models drift apart. This is the hard, realistic case for deciding when to sync.' },
		{ id: '0.1', label: 'α = 0.1', alpha: 0.1, text: '<b>α = 0.1:</b> extreme skew. Many clients see only one or two classes.' },
	];
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// seeded randomness, so the page always shows the same split
	function rng(seed) {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function gamma(r, a) {
		if (a < 1) return gamma(r, a + 1) * Math.pow(r(), 1 / a);
		const d = a - 1 / 3;
		const c = 1 / Math.sqrt(9 * d);
		for (;;) {
			let x;
			let v;
			do {
				const u1 = r() || 1e-12;
				const u2 = r();
				x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
				v = 1 + c * x;
			} while (v <= 0);
			v = v * v * v;
			const u = r();
			if (u < 1 - 0.0331 * x ** 4) return d * v;
			if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
		}
	}
	// share[c][k]: fraction of client c's images that belong to class k
	function split(alpha) {
		const r = rng(2026);
		if (alpha === null) {
			return Array.from({ length: C }, () => {
				const g = CLASSES.map(() => 1 + 0.08 * (r() - 0.5));
				const s = g.reduce((a, b) => a + b, 0);
				return g.map((v) => v / s);
			});
		}
		const perClass = CLASSES.map(() => {
			const g = Array.from({ length: C }, () => gamma(r, alpha));
			const s = g.reduce((a, b) => a + b, 0);
			return g.map((v) => v / s);
		});
		return Array.from({ length: C }, (_, c) => {
			const row = CLASSES.map((_, k) => perClass[k][c]);
			const s = row.reduce((a, b) => a + b, 0);
			return row.map((v) => v / s);
		});
	}
	const DATA = Object.fromEntries(SETTINGS.map((s) => [s.id, split(s.alpha)]));

	const el = (tag, attrs, parent) => {
		const n = document.createElementNS(NS, tag);
		Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
		if (parent) parent.appendChild(n);
		return n;
	};

	host.innerHTML = `
		<div class="cifar__left">
			<div class="cifar__seg" role="group" aria-label="How uneven the split is">
				${SETTINGS.map((s) => `<button type="button" data-a="${s.id}">${s.label}</button>`).join('')}
			</div>
			<svg class="cifar__grid" viewBox="0 0 640 400" role="img" aria-label="Share of each CIFAR-10 class held by each of 20 clients"></svg>
			<p class="cifar__hint">Each column is one client; bigger dots mean more of that class. Click a column.</p>
		</div>
		<div class="cifar__right">
			<p class="cifar__who"><b>Client 1</b><span></span></p>
			<svg class="cifar__bars" viewBox="0 0 360 300" role="img" aria-label="Class mix of the selected client"></svg>
			<p class="cifar__text" aria-live="polite"></p>
		</div>
		<div class="cifar__tip" hidden></div>`;

	const grid = host.querySelector('.cifar__grid');
	const bars = host.querySelector('.cifar__bars');
	const buttons = [...host.querySelectorAll('.cifar__seg button')];
	const whoName = host.querySelector('.cifar__who b');
	const whoTop = host.querySelector('.cifar__who span');
	const textEl = host.querySelector('.cifar__text');
	const tip = host.querySelector('.cifar__tip');

	// --- grid: classes down, clients across ---
	const GX = 112;
	const DX = 26;
	const GY = 18;
	const DY = 34;
	const RMAX = 15;
	CLASSES.forEach((name, k) => {
		el('text', { x: GX - 16, y: GY + k * DY + 4, class: 'cifar__cls' }, grid).textContent = name;
	});
	const cols = [];
	const dots = [];
	for (let c = 0; c < C; c += 1) {
		const x = GX + c * DX;
		const col = el('g', { class: 'cifar__col', tabindex: 0, role: 'button', 'aria-label': `Client ${c + 1}` }, grid);
		el('rect', { x: x - DX / 2, y: GY - DY / 2, width: DX, height: DY * K, rx: 6, class: 'cifar__colbg' }, col);
		for (let k = 0; k < K; k += 1) {
			el('circle', { cx: x, cy: GY + k * DY, r: 1.6, class: 'cifar__pin' }, col);
			const d = el('circle', { cx: x, cy: GY + k * DY, r: 0, class: 'cifar__dot' }, col);
			d.dataset.c = c;
			d.dataset.k = k;
			dots.push({ d, c, k, r: 0 });
		}
		el('text', { x, y: GY + K * DY + 2, class: 'cifar__num' }, col).textContent = c + 1;
		cols.push(col);
	}

	// --- detail bars for the selected client ---
	const BX = 80;
	const BW = 250;
	const BH = 20;
	const BG = 8;
	const detail = CLASSES.map((name, k) => {
		const y = 6 + k * (BH + BG);
		el('text', { x: BX - 10, y: y + 15, class: 'cifar__bname' }, bars).textContent = name;
		el('rect', { x: BX, y, width: BW, height: BH, rx: 3, class: 'cifar__btrack' }, bars);
		const rect = el('rect', { x: BX, y, width: 0, height: BH, rx: 3, class: 'cifar__bar' }, bars);
		const val = el('text', { x: BX + 6, y: y + 15, class: 'cifar__bval' }, bars);
		return { rect, val, w: 0 };
	});
	const evenX = BX + BW * 0.1;
	bars.insertBefore(el('line', { x1: evenX, x2: evenX, y1: 0, y2: K * (BH + BG), class: 'cifar__even' }), bars.querySelector('.cifar__bar'));
	el('text', { x: evenX + 4, y: K * (BH + BG) + 12, class: 'cifar__evenlab' }, bars).textContent = 'even share (10%)';

	// --- state + animation ---
	let setting = 'iid';
	let client = 0;
	let raf = 0;
	let auto = !reduce;
	let tour = 0;

	function render(instant) {
		const share = DATA[setting];
		const t0 = performance.now();
		const fromDots = dots.map((o) => o.r);
		const fromBars = detail.map((b) => b.w);
		cancelAnimationFrame(raf);
		const tick = (now) => {
			const f = instant || reduce ? 1 : Math.max(0, Math.min(1, (now - t0) / 700));
			const e = 1 - Math.pow(1 - f, 3);
			dots.forEach((o, i) => {
				const target = Math.min(RMAX, RMAX * Math.sqrt(share[o.c][o.k] / 0.6));
				o.r = fromDots[i] + (target - fromDots[i]) * e;
				o.d.setAttribute('r', o.r.toFixed(2));
			});
			detail.forEach((b, k) => {
				const v = share[client][k];
				b.w = fromBars[k] + (v - fromBars[k]) * e;
				const w = Math.min(1, b.w) * BW;
				b.rect.setAttribute('width', w.toFixed(1));
				b.val.setAttribute('x', (BX + w + 6).toFixed(1));
				b.val.textContent = f === 1 ? (v < 0.005 ? '0%' : `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`) : '';
			});
			if (f < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		const row = share[client];
		const top = row.indexOf(Math.max(...row));
		whoName.textContent = `Client ${client + 1}`;
		whoTop.textContent = `top class: ${CLASSES[top]} ${(row[top] * 100).toFixed(0)}%`;
		buttons.forEach((b) => b.classList.toggle('is-on', b.dataset.a === setting));
		cols.forEach((g, c) => g.classList.toggle('is-sel', c === client));
		textEl.innerHTML = SETTINGS.find((s) => s.id === setting).text;
	}

	function stopTour() {
		auto = false;
		clearTimeout(tour);
	}
	buttons.forEach((b) => b.addEventListener('click', () => {
		stopTour();
		setting = b.dataset.a;
		render();
	}));
	cols.forEach((g, c) => {
		const pick = () => {
			stopTour();
			client = c;
			render();
		};
		g.addEventListener('click', pick);
		g.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				pick();
			}
		});
	});

	// hover a dot for its exact share
	grid.addEventListener('pointermove', (e) => {
		const d = e.target.closest('.cifar__dot');
		if (!d) {
			tip.hidden = true;
			return;
		}
		const c = +d.dataset.c;
		const k = +d.dataset.k;
		tip.innerHTML = `<b>Client ${c + 1}</b> · ${CLASSES[k]} <span>${(DATA[setting][c][k] * 100).toFixed(1)}% of its images</span>`;
		tip.hidden = false;
		const box = host.getBoundingClientRect();
		const x = Math.min(e.clientX - box.left + 14, box.width - tip.offsetWidth - 4);
		tip.style.left = `${x}px`;
		tip.style.top = `${e.clientY - box.top - 40}px`;
	});
	grid.addEventListener('pointerleave', () => {
		tip.hidden = true;
	});

	render(true);

	// on first view, start balanced, then show the paper's split
	let started = false;
	new IntersectionObserver((entries) => {
		if (!entries[0].isIntersecting || started) return;
		started = true;
		if (!auto) {
			setting = '0.3';
			render();
			return;
		}
		tour = setTimeout(() => {
			if (!auto) return;
			setting = '0.3';
			render();
		}, 1400);
	}, { threshold: 0.4 }).observe(host);
})();
