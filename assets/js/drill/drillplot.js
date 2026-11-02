// Interactive replot of TRIDENT's hole 7 telemetry (Haughton Crater, Devon Island), digitized from
// Fig. 2 of Boelter et al., "A Concept for Planetary Drilling Autonomy" (ICRA 2025 Workshop on Field Robotics).
// Drag across the hour to read every signal; pick one of the paper's annotated events to highlight it,
// with the paper's callout pointing at the moment it describes.
const SVG = 'http://www.w3.org/2000/svg';

const LANES = [
	{ key: 'depth', label: 'Bit depth', unit: 'mm', color: '#1f77b4', min: 0, max: 760, invert: true, digits: 0, area: true, ticks: [0, 350, 700] },
	{ key: 'wob', label: 'Weight on bit', unit: 'N', color: '#ff7f0e', min: -185, max: 60, digits: 0, ticks: [-150, -50, 50] },
	{ key: 'rop', label: 'Rate of penetration', unit: 'mm/s', color: '#2ca02c', min: -2.6, max: 5.4, digits: 2, ticks: [-2, 1, 4] },
	{ key: 'torque', label: 'Auger torque', unit: 'N·m', color: '#d62728', min: -3, max: 20, digits: 1, ticks: [0, 10, 20] },
];

const sw = (key, text) => {
	const lane = LANES.find((l) => l.key === key);
	return `<span class="dplot__sw" style="--c:${lane.color}">${text}</span>`;
};

// Minutes after 18:00 local time, from the paper's annotations. Each callout uses the paper's label
// and points where the paper's arrow points: `lane` and `at` give the target, `value` overrides the
// trace value, and dx/dy place the label box relative to the target.
const EVENTS = [
	{ id: 'boulder', name: 'Boulder', color: '#8b5cf6', start: 8.5, end: 33.8,
		callout: { label: 'Slow Progress (Boulder)', lane: 'depth', at: 21, dx: 0, dy: -34, bracket: true },
		text: `For about 25 minutes the ${sw('depth', 'bit depth')} barely moves, from 635 to 681 mm, while ${sw('torque', 'torque')} slowly climbs. The bit is grinding on a boulder.` },
	{ id: 'choking', name: 'Choking fault', color: '#e0459b', start: 34.6, end: 38.4,
		callout: { label: 'Choking Fault', lane: 'rop', at: 35.3, value: 4.6, dx: -96, dy: 4 },
		text: `Cuttings pile up faster than the auger can carry them out of the hole. ${sw('torque', 'Torque')} and ${sw('wob', 'weight on bit')} spike and the ${sw('rop', 'rate of penetration')} swings wildly.` },
	{ id: 'binding', name: 'Binding recovery', color: '#0ea5a5', start: 39.6, end: 47.0,
		callout: { label: 'Binding Recovery', lane: 'torque', at: 45.7, dx: 70, dy: -26 },
		text: `Gravel is wedged between the auger and the borehole wall. To recover, the drill pulls the auger all the way out (${sw('depth', 'depth')} climbs back to 0) to clear the hole, then drills back down.` },
	{ id: 'rock', name: 'Encountered rock', color: '#515aac', start: 50.4, end: 52.8,
		callout: { label: 'Encountered Rock', lane: 'torque', at: 52.4, dx: 55, dy: -36 },
		text: `Back down near 730 mm the bit reaches rock: ${sw('torque', 'torque')} bumps up and the drill retracts.` },
];

const DOMAIN = [-0.5, 59.5];

function el(name, attrs = {}, parent = null) {
	const n = document.createElementNS(SVG, name);
	Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
	if (parent) parent.appendChild(n);
	return n;
}

function setAttrs(node, attrs) {
	Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
}

function clockLabel(m, withSeconds = false) {
	const s = Math.max(0, Math.round(m * 60));
	const h = 18 + Math.floor(s / 3600);
	const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
	return withSeconds ? `${h}:${mm}:${String(s % 60).padStart(2, '0')}` : `${h}:${mm}`;
}

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function createDrillPlot(host, data, { reducedMotion = false } = {}) {
	const minutes = data.minutes;
	host.innerHTML = `
		<div class="dplot__head">
			<span class="dplot__title">Hole 7 · Haughton Crater, Devon Island</span>
			<b class="dplot__clock"></b>
		</div>
		<p class="dplot__legend">${sw('depth', 'Bit depth')} <i>(lower is deeper)</i> ${sw('wob', 'Weight on bit')} ${sw('rop', 'Rate of penetration')} ${sw('torque', 'Auger torque')}</p>
		<div class="dplot__stage">
			<svg class="dplot__svg" role="img" aria-label="Interactive plot of bit depth, weight on bit, rate of penetration and auger torque during one hour of drilling"></svg>
		</div>
		<div class="dplot__story">
			<div class="dplot__chips" role="group" aria-label="Events in the paper"></div>
			<p class="dplot__text" aria-live="polite"></p>
		</div>`;

	const svg = host.querySelector('svg');
	const stage = host.querySelector('.dplot__stage');
	const clockEl = host.querySelector('.dplot__clock');
	const chipsEl = host.querySelector('.dplot__chips');
	const textEl = host.querySelector('.dplot__text');

	// static structure
	const defs = el('defs', {}, svg);
	const clipRect = el('rect', {}, el('clipPath', { id: 'dplot-clip' }, defs));
	LANES.forEach((lane) => {
		const g = el('linearGradient', { id: `dplot-fill-${lane.key}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
		el('stop', { offset: 0, 'stop-color': lane.color, 'stop-opacity': 0.02 }, g);
		el('stop', { offset: 1, 'stop-color': lane.color, 'stop-opacity': 0.12 }, g);
	});
	EVENTS.forEach((ev) => {
		const marker = el('marker', { id: `dplot-arrow-${ev.id}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
		el('path', { d: 'M0,0 L10,5 L0,10 z', fill: ev.color }, marker);
	});
	const gTrack = el('g', { class: 'dplot__track', 'clip-path': 'url(#dplot-clip)' }, svg);
	const gLanes = el('g', { class: 'dplot__lanes' }, svg);
	const gCols = el('g', { class: 'dplot__cols', 'clip-path': 'url(#dplot-clip)' }, svg);
	const gData = el('g', { class: 'dplot__data', 'clip-path': 'url(#dplot-clip)' }, svg);
	const axisBg = el('rect', { class: 'dplot__axisbg' }, svg);
	const gYTicks = el('g', { class: 'dplot__yticks' }, svg);
	const gAxis = el('g', { class: 'dplot__axis' }, svg);
	const gLabels = el('g', { class: 'dplot__labels' }, svg);
	const gCallouts = el('g', { class: 'dplot__callouts' }, svg);
	const gCursor = el('g', { class: 'dplot__cursor' }, svg);
	const hit = el('rect', { class: 'dplot__hit' }, svg);

	LANES.forEach((lane) => {
		lane.bg = el('rect', { class: 'dplot__lane', rx: 6 }, gLanes);
		lane.grid = lane.ticks.map(() => el('line', { class: 'dplot__gridline' }, gLanes));
		lane.band = el('path', { class: 'dplot__band', fill: lane.color }, gData);
		if (lane.area) lane.fill = el('path', { class: 'dplot__area', fill: `url(#dplot-fill-${lane.key})` }, gData);
		lane.line = el('path', { class: 'dplot__line', stroke: lane.color, pathLength: 1 }, gData);
		lane.pill = el('rect', { class: 'dplot__labelbg', rx: 9 }, gLabels);
		lane.text = el('text', { class: 'dplot__lanelabel' }, gLabels);
		lane.text.innerHTML = `<tspan class="dplot__name" fill="${lane.color}">${lane.label}</tspan><tspan class="dplot__value" dx="8"></tspan><tspan class="dplot__unit" dx="3">${lane.unit}</tspan>`;
		lane.valueEl = lane.text.querySelector('.dplot__value');
		lane.unitEl = lane.text.querySelector('.dplot__unit');
		lane.dot = el('circle', { r: 4.5, class: 'dplot__dot', fill: lane.color }, gCursor);
	});
	const cursorLine = el('line', { class: 'dplot__cursorline' }, gCursor);
	gCursor.insertBefore(cursorLine, gCursor.firstChild);

	EVENTS.forEach((ev) => {
		ev.col = el('rect', { class: 'dplot__col', rx: 6, fill: ev.color }, gCols);
		ev.bar = el('g', { class: 'dplot__event', tabindex: 0, role: 'button', 'aria-label': `Highlight ${ev.name}` }, gTrack);
		ev.barRect = el('rect', { rx: 9, fill: ev.color }, ev.bar);
		ev.barText = el('text', {}, ev.bar);
		ev.barText.textContent = ev.name;
		// the paper's callout: a labeled box and an arrow to the moment it describes
		ev.call = el('g', { class: 'dplot__callout', style: `--c:${ev.color}` }, gCallouts);
		if (ev.callout.bracket) ev.callBracket = el('path', { class: 'dplot__bracket', pathLength: 1 }, ev.call);
		ev.callArrow = el('path', { class: 'dplot__arrow', pathLength: 1, 'marker-end': `url(#dplot-arrow-${ev.id})` }, ev.call);
		ev.callBox = el('rect', { class: 'dplot__callbox', rx: 5 }, ev.call);
		ev.callText = el('text', { class: 'dplot__calltext' }, ev.call);
		ev.callText.textContent = ev.callout.label;
		const chip = document.createElement('button');
		chip.type = 'button';
		chip.className = 'dplot__chip';
		chip.style.setProperty('--c', ev.color);
		chip.textContent = ev.name;
		chipsEl.appendChild(chip);
		ev.chip = chip;
	});

	// layout + rendering
	const M = { l: 10, r: 10, track: 32, axis: 24, gap: 7 };
	let W = 0;
	let H = 0;
	let laneH = 0;
	let selected = null;
	let hoverT = null;

	const x = (m) => M.l + ((m - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * (W - M.l - M.r);
	const invX = (px) => DOMAIN[0] + ((px - M.l) / (W - M.l - M.r)) * (DOMAIN[1] - DOMAIN[0]);
	const laneTop = (i) => M.track + i * (laneH + M.gap);
	const laneIndex = (key) => LANES.findIndex((l) => l.key === key);
	const y = (lane, i, v) => {
		const f = Math.max(0, Math.min(1, (v - lane.min) / (lane.max - lane.min)));
		const top = laneTop(i) + 8;
		const h = laneH - 16;
		return lane.invert ? top + f * h : top + h - f * h;
	};

	function indexAt(m) {
		let lo = 0;
		let hi = minutes.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (minutes[mid] < m) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	function valueAt(key, m) {
		const i = indexAt(m);
		for (let k = 0; k < 10; k += 1) {
			const v = data[key][i - k];
			if (v) return v[1];
		}
		return null;
	}

	function paths(lane, i) {
		const series = data[lane.key];
		let line = '';
		let band = '';
		let area = '';
		let seg = [];
		const flush = () => {
			if (seg.length > 1) {
				band += `M${seg.map((p) => `${p[0]},${p[1]}`).join('L')}L${seg.slice().reverse().map((p) => `${p[0]},${p[3]}`).join('L')}Z`;
				if (lane.area) {
					const base = laneTop(i) + 8;
					area += `M${seg[0][0]},${base}L${seg.map((p) => `${p[0]},${p[2]}`).join('L')}L${seg[seg.length - 1][0]},${base}Z`;
				}
			}
			seg = [];
		};
		for (let k = 0; k < minutes.length; k += 1) {
			const v = series[k];
			if (!v) {
				flush();
				continue;
			}
			const px = x(minutes[k]).toFixed(1);
			seg.push([px, y(lane, i, v[0]).toFixed(1), y(lane, i, v[1]).toFixed(1), y(lane, i, v[2]).toFixed(1)]);
			line += `${seg.length === 1 ? 'M' : 'L'}${px},${seg[seg.length - 1][2]}`;
		}
		flush();
		return { line, band, area };
	}

	function placeCallout(ev) {
		const c = ev.callout;
		const li = laneIndex(c.lane);
		const lane = LANES[li];
		const v = c.value !== undefined ? c.value : valueAt(c.lane, c.at);
		const tx = x(c.at);
		const ty = y(lane, li, v);
		// size the box to its label, then keep it inside the plot
		const tb = ev.callText.getBBox();
		const bw = tb.width + 16;
		const bh = 20;
		const scale = Math.min(1, (W - M.l - M.r) / 640);
		let cx = tx + c.dx * Math.max(0.6, scale);
		let cy = ty + c.dy;
		cx = Math.max(M.l + bw / 2 + 4, Math.min(W - M.r - bw / 2 - 4, cx));
		cy = Math.max(M.track + bh / 2 + 2, Math.min(laneTop(LANES.length - 1) + laneH - bh / 2 - 2, cy));
		setAttrs(ev.callBox, { x: cx - bw / 2, y: cy - bh / 2, width: bw, height: bh });
		setAttrs(ev.callText, { x: cx, y: cy + 4 });
		// the arrow leaves the box edge nearest the target
		const sx = Math.max(cx - bw / 2, Math.min(cx + bw / 2, tx));
		const sy = Math.abs(tx - cx) > bw / 2 ? cy : ty > cy ? cy + bh / 2 : cy - bh / 2;
		const len = Math.hypot(tx - sx, ty - sy) || 1;
		const ex = tx - ((tx - sx) / len) * 4;
		const ey = ty - ((ty - sy) / len) * 4;
		ev.callArrow.setAttribute('d', `M${sx.toFixed(1)},${sy.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`);
		if (ev.callBracket) {
			// the paper's brace under the slow stretch of the depth trace
			const by = ty + 9;
			const x0 = x(ev.start);
			const x1 = x(ev.end);
			const xm = tx;
			ev.callBracket.setAttribute('d', `M${x0},${by - 6} L${x0},${by} L${xm - 5},${by} L${xm},${by + 5} L${xm + 5},${by} L${x1},${by} L${x1},${by - 6}`);
			ev.callArrow.setAttribute('d', `M${sx.toFixed(1)},${sy.toFixed(1)} L${tx.toFixed(1)},${(ty - 5).toFixed(1)}`);
		}
	}

	function render() {
		setAttrs(clipRect, { x: M.l, y: 0, width: W - M.l - M.r, height: H });
		const plotBottom = laneTop(LANES.length - 1) + laneH;

		LANES.forEach((lane, i) => {
			const top = laneTop(i);
			setAttrs(lane.bg, { x: M.l, y: top, width: W - M.l - M.r, height: laneH });
			lane.ticks.forEach((v, k) => {
				const ty = y(lane, i, v);
				setAttrs(lane.grid[k], { x1: M.l, x2: W - M.r, y1: ty, y2: ty });
			});
			const p = paths(lane, i);
			lane.line.setAttribute('d', p.line);
			lane.band.setAttribute('d', p.band);
			if (lane.fill) lane.fill.setAttribute('d', p.area);
			setAttrs(lane.text, { x: M.l + 12, y: top + 18 });
		});

		EVENTS.forEach((ev) => {
			const x0 = x(ev.start);
			const x1 = x(ev.end);
			setAttrs(ev.col, { x: x0, y: M.track - 2, width: Math.max(2, x1 - x0), height: plotBottom - M.track + 4 });
			const bw = Math.max(16, x1 - x0);
			setAttrs(ev.barRect, { x: x0, y: 7, width: bw, height: 18 });
			setAttrs(ev.barText, { x: x0 + 9, y: 20 });
			ev.barText.style.display = bw > ev.name.length * 6.2 + 18 ? '' : 'none';
			placeCallout(ev);
		});

		// y-axis numbers at the right edge of each lane
		gYTicks.innerHTML = '';
		LANES.forEach((lane, i) => {
			lane.ticks.forEach((v) => {
				const t = el('text', { x: W - M.r - 6, y: y(lane, i, v) + 3.5, class: 'dplot__yticklabel' }, gYTicks);
				t.textContent = v;
			});
		});

		// time axis on a white strip inside the plot; the end labels stay inside its edges
		setAttrs(axisBg, { x: 0, y: plotBottom + 3, width: W, height: H - plotBottom - 3 });
		gAxis.innerHTML = '';
		for (let m = 0; m <= 60; m += 10) {
			const px = x(m);
			el('line', { x1: px, x2: px, y1: M.track, y2: plotBottom, class: 'dplot__tick' }, gAxis);
			const t = el('text', { x: Math.max(M.l + 4, Math.min(W - M.r - 4, px)), y: plotBottom + 17, class: 'dplot__ticklabel' }, gAxis);
			t.setAttribute('text-anchor', px - M.l < 20 ? 'start' : W - M.r - px < 20 ? 'end' : 'middle');
			t.textContent = clockLabel(m);
		}

		setAttrs(hit, { x: M.l, y: 0, width: W - M.l - M.r, height: plotBottom });
		setAttrs(cursorLine, { y1: M.track - 2, y2: plotBottom + 2 });
		drawCursor();
	}

	function drawCursor() {
		const show = hoverT !== null && hoverT >= DOMAIN[0] && hoverT <= DOMAIN[1];
		gCursor.style.opacity = show ? 1 : 0;
		LANES.forEach((lane, i) => {
			const v = show ? valueAt(lane.key, hoverT) : null;
			lane.valueEl.textContent = v === null ? '' : v.toFixed(lane.digits);

			if (v === null) {
				lane.dot.style.opacity = 0;
			} else {
				lane.dot.style.opacity = 1;
				setAttrs(lane.dot, { cx: x(hoverT), cy: y(lane, i, v) });
			}
			// solid backing behind each label, sized to its current text
			const a = lane.text.querySelector('.dplot__name').getBBox();
			const b = lane.unitEl.getBBox();
			const right = Math.max(a.x + a.width, b.x + b.width);
			setAttrs(lane.pill, { x: a.x - 7, y: a.y - 3, width: right - a.x + 14, height: a.height + 6 });
		});
		if (show) {
			const px = x(hoverT);
			setAttrs(cursorLine, { x1: px, x2: px });
			clockEl.textContent = clockLabel(hoverT, true);
		} else {
			clockEl.textContent = '';
		}
		const under = show ? EVENTS.find((e) => hoverT >= e.start && hoverT <= e.end) : null;
		EVENTS.forEach((e) => e.col.classList.toggle('is-hover', e === under));
	}

	function select(ev) {
		selected = ev;
		host.classList.toggle('has-selection', !!ev);
		EVENTS.forEach((e) => {
			const on = e === ev;
			e.chip.classList.toggle('is-active', on);
			e.chip.setAttribute('aria-pressed', String(on));
			e.col.classList.toggle('is-active', on);
			e.bar.classList.toggle('is-active', on);
			e.call.classList.remove('is-active');
		});
		textEl.innerHTML = ev ? `<b style="color:${ev.color}">${ev.name}.</b> ${ev.text}` : '';
		if (ev) {
			// restart the arrow's draw-in each time
			void ev.call.getBoundingClientRect();
			ev.call.classList.add('is-active');
		}
	}

	// interaction
	let ghostRaf = 0;
	let touched = false;
	const stopGhost = () => {
		touched = true;
		cancelAnimationFrame(ghostRaf);
	};
	const pointerT = (e) => {
		const r = svg.getBoundingClientRect();
		return invX(((e.clientX - r.left) / r.width) * W);
	};
	hit.addEventListener('pointermove', (e) => {
		stopGhost();
		hoverT = pointerT(e);
		drawCursor();
	});
	hit.addEventListener('pointerdown', (e) => {
		stopGhost();
		hoverT = pointerT(e);
		drawCursor();
	});
	hit.addEventListener('pointerleave', () => {
		hoverT = null;
		drawCursor();
	});
	hit.addEventListener('click', (e) => {
		const t = pointerT(e);
		const ev = EVENTS.find((x2) => t >= x2.start && t <= x2.end);
		if (ev && ev !== selected) select(ev);
	});
	EVENTS.forEach((ev) => {
		const go = () => {
			stopGhost();
			select(selected === ev ? null : ev);
		};
		ev.chip.setAttribute('aria-pressed', 'false');
		ev.chip.addEventListener('click', go);
		ev.bar.addEventListener('click', go);
		ev.bar.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				go();
			}
		});
	});

	const ro = new ResizeObserver(() => {
		W = stage.clientWidth;
		H = stage.clientHeight;
		svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
		laneH = (H - M.track - M.axis - M.gap * (LANES.length - 1)) / LANES.length;
		render();
	});
	ro.observe(stage);

	// first appearance: the traces draw themselves in, then a ghost cursor sweeps once
	let introduced = false;
	function intro() {
		if (introduced) return;
		introduced = true;
		if (reducedMotion) return;
		host.classList.add('is-drawing');
		setTimeout(() => host.classList.remove('is-drawing'), 1900);
		setTimeout(() => {
			if (touched) return;
			const t0 = performance.now();
			const sweep = (now) => {
				const k = (now - t0) / 4200;
				if (touched || k >= 1) {
					if (!touched) {
						hoverT = null;
						drawCursor();
					}
					return;
				}
				hoverT = DOMAIN[0] + 2 + ease(k) * (DOMAIN[1] - DOMAIN[0] - 4);
				drawCursor();
				ghostRaf = requestAnimationFrame(sweep);
			};
			ghostRaf = requestAnimationFrame(sweep);
		}, 2000);
	}

	return {
		start: intro,
		stop() {
			cancelAnimationFrame(ghostRaf);
		},
	};
}
