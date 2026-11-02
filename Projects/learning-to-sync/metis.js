// Interactive "how to split the sensor graph into clients" figure, in the talk's style.
// Road layout, sensor placement and partition orders follow the SEC 2026 talk; cluster sizes are
// from the paper (PeMSD7(M), 228 sensors, k = 5). The map is a schematic.
(function () {
	'use strict';
	const host = document.querySelector('[data-metis]');
	if (!host) return;

	const NS = 'http://www.w3.org/2000/svg';
	const COLORS = ['#7a0019', '#f15a22', '#c99700', '#0c2340', '#3e8e87'];
	const SIZES = { louvain: [165, 18, 16, 21, 8], kmeans: [71, 35, 57, 32, 33], metis: [46, 46, 45, 46, 45] };
	const TEXT = {
		louvain: '<b>Louvain</b> follows community structure and makes one giant client of 165 sensors, so one client dominates aggregation and communication.',
		kmeans: '<b>K-Means</b> groups sensors by position: better, but clients still range from 32 to 71 sensors.',
		metis: '<b>METIS</b> gives 45–46 sensors per client and keeps whole stretches of road together. This is the split used in the experiments.',
	};
	const N = 228;
	const W = 1040;
	const H = 660;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const el = (tag, attrs, parent) => {
		const n = document.createElementNS(NS, tag);
		Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
		if (parent) parent.appendChild(n);
		return n;
	};

	// roads as smooth curves, sensors spaced evenly along them
	function catmull(pts, n) {
		const out = [];
		for (let i = 0; i < pts.length - 1; i += 1) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			for (let k = 0; k < n; k += 1) {
				const t = k / n;
				const t2 = t * t;
				const t3 = t2 * t;
				out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
			}
		}
		out.push(pts[pts.length - 1]);
		return out;
	}
	const len = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
	function at(p, u) {
		const L = len(p) * u;
		let acc = 0;
		for (let i = 1; i < p.length; i += 1) {
			const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
			if (acc + d >= L) {
				const f = d ? (L - acc) / d : 0;
				return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f];
			}
			acc += d;
		}
		return p[p.length - 1];
	}
	function hilbert(n, x, y) {
		let d = 0;
		for (let s = n / 2; s >= 1; s /= 2) {
			const rx = (x & s) > 0 ? 1 : 0;
			const ry = (y & s) > 0 ? 1 : 0;
			d += s * s * ((3 * rx) ^ ry);
			if (ry === 0) {
				if (rx === 1) {
					x = s - 1 - x;
					y = s - 1 - y;
				}
				[x, y] = [y, x];
			}
		}
		return d;
	}

	const roads = [
		[[30, 180], [250, 150], [520, 205], [760, 168], [990, 212]],
		[[30, 440], [300, 478], [560, 425], [800, 468], [990, 436]],
		[[178, 24], [214, 250], [168, 430], [222, 626]],
		[[482, 20], [450, 224], [522, 402], [478, 626]],
		[[806, 22], [772, 206], [834, 384], [790, 626]],
		[[60, 604], [330, 336], [620, 286], [960, 62]],
	].map((p) => catmull(p.map((q) => [q[0] + 10, q[1] + 10]), 16));
	const total = roads.reduce((s, r) => s + len(r), 0);
	const counts = roads.map((r) => Math.round((N * len(r)) / total));
	counts[0] += N - counts.reduce((a, b) => a + b, 0);
	const nodes = [];
	roads.forEach((r, ri) => {
		for (let i = 0; i < counts[ri]; i += 1) {
			const [x, y] = at(r, (i + 0.5) / counts[ri]);
			nodes.push({ x, y });
		}
	});

	// spatial orders that the three methods carve into clusters of the paper's sizes
	const byHilbert = nodes
		.map((n, i) => ({ i, h: hilbert(64, Math.min(63, Math.floor((n.x / W) * 64)), Math.min(63, Math.floor((n.y / H) * 64))) }))
		.sort((a, b) => a.h - b.h)
		.map((o) => o.i);
	const byAngle = nodes
		.map((n, i) => ({ i, a: (Math.atan2(n.y - 330, n.x - 520) + Math.PI * 1.25) % (Math.PI * 2) }))
		.sort((a, b) => a.a - b.a)
		.map((o) => o.i);
	function assign(order, sizes) {
		const lab = new Array(N);
		let k = 0;
		let c = 0;
		order.forEach((ni, rank) => {
			while (c >= sizes[k]) {
				k += 1;
				c = 0;
			}
			lab[ni] = { k, rank };
			c += 1;
		});
		return lab;
	}
	const LABELS = {
		louvain: assign(byHilbert.slice().reverse(), SIZES.louvain),
		kmeans: assign(byAngle, SIZES.kmeans),
		metis: assign(byHilbert, SIZES.metis),
	};

	// --- markup ---
	host.innerHTML = `
		<div class="metis__map"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schematic road network with 228 traffic sensors colored by client"></svg></div>
		<div class="metis__side">
			<div class="metis__seg" role="group" aria-label="Partition method">
				<button type="button" data-m="louvain">Louvain</button>
				<button type="button" data-m="kmeans">K-Means</button>
				<button type="button" data-m="metis">METIS</button>
			</div>
			<p class="metis__ratio">largest / smallest = <b>–</b></p>
			<svg class="metis__bars" viewBox="0 0 400 230" role="img" aria-label="Sensors per client"></svg>
			<p class="metis__text" aria-live="polite">Pick a method to split the 228 sensors into five clients.</p>
			<p class="metis__note">Sensors per client, PeMSD7(M), 228 sensors, k = 5 (paper data). Dashed line = even split. The map is a schematic.</p>
		</div>`;
	const map = host.querySelector('.metis__map svg');
	const bars = host.querySelector('.metis__bars');
	const buttons = [...host.querySelectorAll('.metis__seg button')];
	const ratioEl = host.querySelector('.metis__ratio b');
	const textEl = host.querySelector('.metis__text');

	roads.forEach((r) => {
		const d = 'M' + r.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L');
		el('path', { d, class: 'metis__road' }, map);
	});
	const dots = nodes.map((n) => el('circle', { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: 6.5, class: 'metis__node' }, map));
	const tags = COLORS.map((c, k) => {
		const g = el('g', { class: 'metis__tag', style: `--c:${c}` }, map);
		el('rect', { x: -24, y: -15, width: 48, height: 30, rx: 15 }, g);
		el('text', { x: 0, y: 6 }, g).textContent = 'K' + (k + 1);
		return g;
	});

	// bars
	const X0 = 46;
	const BW = 52;
	const GAP = 20;
	const Y0 = 190;
	const SC = 160 / 170;
	[0, 50, 100, 150].forEach((v) => {
		const y = Y0 - v * SC;
		el('line', { x1: X0 - 6, x2: X0 + 5 * (BW + GAP), y1: y, y2: y, class: 'metis__grid' }, bars);
		el('text', { x: X0 - 12, y: y + 4, class: 'metis__tick' }, bars).textContent = v;
	});
	const evenY = Y0 - 45.6 * SC;
	el('line', { x1: X0 - 6, x2: X0 + 5 * (BW + GAP), y1: evenY, y2: evenY, class: 'metis__even' }, bars);
	const barEls = COLORS.map((c, k) => {
		const x = X0 + k * (BW + GAP) + 6;
		const g = el('g', { class: 'metis__bar', tabindex: 0, 'data-k': k }, bars);
		const rect = el('rect', { x, y: Y0, width: BW, height: 0, rx: 3, fill: c }, g);
		const val = el('text', { x: x + BW / 2, y: Y0 - 6, class: 'metis__val' }, g);
		el('text', { x: x + BW / 2, y: Y0 + 20, class: 'metis__lab' }, g).textContent = 'K' + (k + 1);
		return { g, rect, val, cur: 0 };
	});
	el('line', { x1: X0 - 6, x2: X0 + 5 * (BW + GAP), y1: Y0, y2: Y0, class: 'metis__axis' }, bars);

	// --- state + drawing ---
	let method = null;
	let auto = !reduce;
	let raf = 0;
	let tour = 0;

	function setBars(sizes, instant) {
		const from = barEls.map((b) => b.cur);
		const t0 = performance.now();
		cancelAnimationFrame(raf);
		const tick = (now) => {
			const f = instant ? 1 : Math.max(0, Math.min(1, (now - t0) / 650));
			const e = 1 - Math.pow(1 - f, 3);
			barEls.forEach((b, k) => {
				b.cur = from[k] + (sizes[k] - from[k]) * e;
				const h = b.cur * SC;
				b.rect.setAttribute('y', Y0 - h);
				b.rect.setAttribute('height', Math.max(0, h));
				b.val.setAttribute('y', Y0 - h - 6);
				b.val.textContent = f === 1 ? sizes[k] : Math.round(b.cur);
			});
			if (f < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
	}

	function choose(m) {
		method = m;
		buttons.forEach((b) => b.classList.toggle('is-on', b.dataset.m === m));
		const lab = LABELS[m];
		const sums = COLORS.map(() => [0, 0, 0]);
		dots.forEach((d, i) => {
			const { k, rank } = lab[i];
			d.style.setProperty('--d', reduce ? '0s' : `${((rank / N) * 0.7).toFixed(3)}s`);
			d.style.fill = COLORS[k];
			d.classList.add('is-on');
			d.dataset.k = k;
			sums[k][0] += nodes[i].x;
			sums[k][1] += nodes[i].y;
			sums[k][2] += 1;
		});
		tags.forEach((t, k) => {
			const [sx, sy, n] = sums[k];
			t.setAttribute('transform', `translate(${(sx / n).toFixed(1)},${(sy / n).toFixed(1)})`);
			t.classList.add('is-on');
		});
		const sz = SIZES[m];
		ratioEl.textContent = (Math.max(...sz) / Math.min(...sz)).toFixed(m === 'metis' ? 2 : 1) + '×';
		textEl.innerHTML = TEXT[m];
		setBars(sz, reduce);
	}

	// hovering a bar or a client tag picks out that client's sensors on the map
	function focus(k) {
		host.classList.toggle('has-focus', k !== null);
		dots.forEach((d) => d.classList.toggle('is-focus', k !== null && +d.dataset.k === k));
		tags.forEach((t, i) => t.classList.toggle('is-focus', i === k));
		barEls.forEach((b, i) => b.g.classList.toggle('is-focus', i === k));
	}
	barEls.forEach((b, k) => {
		b.g.addEventListener('mouseenter', () => method && focus(k));
		b.g.addEventListener('focus', () => method && focus(k));
		b.g.addEventListener('mouseleave', () => focus(null));
		b.g.addEventListener('blur', () => focus(null));
	});
	tags.forEach((t, k) => {
		t.addEventListener('mouseenter', () => focus(k));
		t.addEventListener('mouseleave', () => focus(null));
	});

	buttons.forEach((b) => b.addEventListener('click', () => {
		auto = false;
		clearTimeout(tour);
		choose(b.dataset.m);
	}));

	// on first view, walk through the three methods once, ending on METIS
	let started = false;
	new IntersectionObserver((entries) => {
		if (!entries[0].isIntersecting || started) return;
		started = true;
		if (!auto) {
			choose('metis');
			return;
		}
		const seq = ['louvain', 'kmeans', 'metis'];
		const step = (i) => {
			if (!auto) return;
			choose(seq[i]);
			if (i < seq.length - 1) tour = setTimeout(() => step(i + 1), 3200);
		};
		tour = setTimeout(() => step(0), 500);
	}, { threshold: 0.4 }).observe(host);
})();
