// Multi-agent path finding with auctions on a time-extended graph, after Barman et al. (ARMS @ AAMAS 2024)
// and their code (SBrman/mapf). Ported to the browser: the warehouse map rule from randomMap.py, the
// earliest-arrival search in the time-expanded graph, and the min / max / random auctioneers from test.py,
// where each winner's space-time path is reserved (node and swap edges) so later robots cannot collide with it.
(function () {
	'use strict';
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---------- seeded randomness ----------
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

	// ---------- maps (randomMap.py) ----------
	function warehouseMap(R, C) {
		const free = Array.from({ length: R }, () => new Array(C).fill(1));
		for (let i = 3; i < R - 1; i += 4) {
			for (let j = 3; j < C - 1; j += 6) {
				for (let r = i; r <= i + 2 && r < R; r += 1) for (let c = j; c <= j + 2 && c < C; c += 1) free[r][c] = 0;
			}
		}
		return free;
	}
	function randomMap(R, C, rand, p = 0.2) {
		const free = Array.from({ length: R }, () => Array.from({ length: C }, () => (rand() < p ? 0 : 1)));
		// remove isolated cells
		for (let r = 0; r < R; r += 1) {
			for (let c = 0; c < C; c += 1) {
				if (free[r][c] && !nbrs(free, r, c).length) free[r][c] = 0;
			}
		}
		return free;
	}
	function nbrs(free, r, c) {
		const out = [];
		[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
			const rr = r + dr;
			const cc = c + dc;
			if (rr >= 0 && cc >= 0 && rr < free.length && cc < free[0].length && free[rr][cc]) out.push([rr, cc]);
		});
		return out;
	}
	function reachable(free, a, b) {
		const seen = new Set([a.join()]);
		const q = [a];
		while (q.length) {
			const [r, c] = q.shift();
			if (r === b[0] && c === b[1]) return true;
			nbrs(free, r, c).forEach((n) => {
				if (!seen.has(n.join())) {
					seen.add(n.join());
					q.push(n);
				}
			});
		}
		return false;
	}

	// ---------- the planner (tgraph.py / test.py) ----------
	function plan(world, order) {
		const { free, agents, T } = world;
		const R = free.length;
		const C = free[0].length;
		const removed = new Set(); // reserved space-time nodes "r,c,t"
		const blocked = new Set(); // reserved space-time edges "r,c,t>r,c"
		const key = (r, c, t) => `${r},${c},${t}`;

		// earliest-arrival path from (start, 0) to (goal, t) in the time-expanded graph; the goal must stay free afterwards
		function earliest(a) {
			const goalFreeFrom = (t) => {
				for (let k = t; k <= T; k += 1) if (removed.has(key(a.goal[0], a.goal[1], k))) return false;
				return true;
			};
			if (removed.has(key(a.start[0], a.start[1], 0))) return null;
			let layer = new Map([[a.start.join(), null]]);
			const preds = [layer];
			for (let t = 0; t <= T; t += 1) {
				if (layer.has(a.goal.join()) && goalFreeFrom(t)) {
					const path = [];
					let cur = a.goal.join();
					for (let k = t; k >= 0; k -= 1) {
						path.push(cur.split(',').map(Number));
						cur = preds[k].get(cur);
					}
					return path.reverse();
				}
				if (t === T) break;
				const next = new Map();
				layer.forEach((_, cell) => {
					const [r, c] = cell.split(',').map(Number);
					[[r, c], ...nbrs(free, r, c)].forEach(([rr, cc]) => {
						const k = `${rr},${cc}`;
						if (next.has(k) || removed.has(key(rr, cc, t + 1)) || blocked.has(`${r},${c},${t}>${rr},${cc}`)) return;
						next.set(k, cell);
					});
				});
				preds.push(next);
				layer = next;
				if (!layer.size) return null;
			}
			return null;
		}

		function reserve(path, goal) {
			path.forEach(([r, c], t) => removed.add(key(r, c, t)));
			for (let t = path.length; t <= T; t += 1) removed.add(key(goal[0], goal[1], t));
			for (let t = 0; t < path.length - 1; t += 1) {
				const [r1, c1] = path[t];
				const [r2, c2] = path[t + 1];
				blocked.add(`${r1},${c1},${t}>${r2},${c2}`);
				blocked.add(`${r2},${c2},${t}>${r1},${c1}`); // no swaps
			}
		}

		const rand = rng(world.seed * 7 + 1);
		const queue = new Set(agents.map((_, i) => i));
		const rounds = [];
		const paths = [];
		while (queue.size) {
			const bids = {};
			const tmp = {};
			for (const i of queue) {
				const p = earliest(agents[i]);
				if (!p) return null;
				tmp[i] = p;
				bids[i] = p.length; // the bid is the path length, as in the code
			}
			const ids = [...queue];
			let w;
			if (order === 'min') w = ids.reduce((a, b) => (bids[b] < bids[a] ? b : a));
			else if (order === 'max') w = ids.reduce((a, b) => (bids[b] > bids[a] ? b : a));
			else w = ids[Math.floor(rand() * ids.length)];
			reserve(tmp[w], agents[w].goal);
			paths[w] = tmp[w];
			rounds.push({ bids, winner: w });
			queue.delete(w);
		}
		const lens = paths.map((p) => p.length);
		return { rounds, paths, flowtime: lens.reduce((a, b) => a + b, 0), makespan: Math.max(...lens) };
	}

	function makeWorld(kind, seed) {
		for (let s = seed; s < seed + 50; s += 1) {
			const rand = rng(s);
			const R = kind === 'warehouse' ? 19 : 16;
			const C = kind === 'warehouse' ? 25 : 16;
			const N = kind === 'warehouse' ? 16 : 12;
			const free = kind === 'warehouse' ? warehouseMap(R, C) : randomMap(R, C, rand);
			const cells = [];
			free.forEach((row, r) => row.forEach((v, c) => v && cells.push([r, c])));
			const used = new Set();
			const pick = () => {
				for (;;) {
					const cell = cells[Math.floor(rand() * cells.length)];
					if (!used.has(cell.join())) {
						used.add(cell.join());
						return cell;
					}
				}
			};
			const agents = [];
			for (let i = 0; i < N; i += 1) {
				const start = pick();
				let goal = pick();
				let tries = 0;
				while (!reachable(free, start, goal) && tries < 20) {
					goal = pick();
					tries += 1;
				}
				agents.push({ start, goal });
			}
			const world = { kind, seed: s, free, agents, T: kind === 'warehouse' ? 70 : 50 };
			world.runs = {};
			let ok = true;
			['min', 'max', 'random'].forEach((o) => {
				const res = ok && plan(world, o);
				if (!res) ok = false;
				world.runs[o] = res;
			});
			if (ok) return world;
		}
		return null;
	}

	// ---------- colors ----------
	const HUES = [252, 152, 12, 200, 290, 40, 175, 330, 220, 95, 265, 20, 185, 310, 60, 235];
	const color = (i, l = 52) => `hsl(${HUES[i % HUES.length]}, 62%, ${l}%)`;

	// ---------- UI ----------
	const root = document.querySelector('[data-mapf]');
	if (!root) return;
	root.innerHTML = `
		<div class="mf__bar">
			<div class="mf__seg" data-group="kind" role="group" aria-label="Map">
				<button type="button" data-v="warehouse" class="is-on">Warehouse</button>
				<button type="button" data-v="random">Random grid</button>
			</div>
			<div class="mf__seg" data-group="order" role="group" aria-label="Auctioneer">
				<button type="button" data-v="min" class="is-on">Min bid</button>
				<button type="button" data-v="max">Max bid</button>
				<button type="button" data-v="random">Random</button>
			</div>
			<button type="button" class="mf__btn" data-act="new">↻ New robots</button>
			<button type="button" class="mf__btn mf__btn--solid" data-act="run">▶ Run auction</button>
		</div>
		<div class="mf__main">
			<div class="mf__stage">
				<div class="mf__views" role="group" aria-label="View">
					<button type="button" data-view="map" class="is-on">Map</button>
					<button type="button" data-view="st">Space–time</button>
				</div>
				<svg class="mf__map" role="img" aria-label="Warehouse map with robots, goals and planned paths"></svg>
				<canvas class="mf__st" hidden aria-label="Space-time view: each robot's path rises through time"></canvas>
				<p class="mf__hint" data-hint></p>
			</div>
			<aside class="mf__side">
				<p class="mf__kicker"><span data-round>Auction</span><b data-status></b></p>
				<div class="mf__bids"></div>
			</aside>
		</div>
		<div class="mf__play">
			<button type="button" class="mf__playbtn" data-act="play" aria-label="Play">▶</button>
			<input type="range" min="0" max="1" step="0.01" value="0" aria-label="Time">
			<span class="mf__time">t = 0</span>
		</div>
		<div class="mf__stats">
			<div><b data-k="flowtime">–</b><span>flowtime<small>sum of arrival times</small></span></div>
			<div><b data-k="makespan">–</b><span>makespan<small>last robot to arrive</small></span></div>
			<div><b>0</b><span>collisions<small>guaranteed by reservation</small></span></div>
			<div class="mf__cmp"><span class="mf__cmphead">Same robots, each auctioneer</span><div data-cmp></div></div>
		</div>`;

	const svg = root.querySelector('.mf__map');
	const canvas = root.querySelector('.mf__st');
	const bidsEl = root.querySelector('.mf__bids');
	const roundEl = root.querySelector('[data-round]');
	const statusEl = root.querySelector('[data-status]');
	const hintEl = root.querySelector('[data-hint]');
	const slider = root.querySelector('input[type=range]');
	const timeEl = root.querySelector('.mf__time');
	const playBtn = root.querySelector('[data-act=play]');
	const NS = 'http://www.w3.org/2000/svg';
	const el = (tag, attrs, parent) => {
		const n = document.createElementNS(NS, tag);
		Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
		if (parent) parent.appendChild(n);
		return n;
	};

	const state = { kind: 'warehouse', order: 'min', seed: 11, world: null, shown: 0, t: 0, view: 'map', theta: -0.62, playing: false };
	let timers = [];
	const clearTimers = () => {
		timers.forEach(clearTimeout);
		timers = [];
	};

	// ---- map view ----
	let pathEls = [];
	let robotEls = [];
	function drawMap() {
		const { free, agents } = state.world;
		const R = free.length;
		const C = free[0].length;
		const S = 20;
		svg.setAttribute('viewBox', `0 0 ${C * S} ${R * S}`);
		svg.innerHTML = '';
		const floor = el('g', {}, svg);
		el('rect', { x: 0, y: 0, width: C * S, height: R * S, rx: 6, class: 'mf__floor' }, floor);
		for (let r = 0; r <= R; r += 1) el('line', { x1: 0, x2: C * S, y1: r * S, y2: r * S, class: 'mf__gridline' }, floor);
		for (let c = 0; c <= C; c += 1) el('line', { x1: c * S, x2: c * S, y1: 0, y2: R * S, class: 'mf__gridline' }, floor);
		free.forEach((row, r) => row.forEach((v, c) => {
			if (!v) el('rect', { x: c * S + 1.5, y: r * S + 1.5, width: S - 3, height: S - 3, rx: 3, class: 'mf__shelf' }, floor);
		}));
		const gp = el('g', {}, svg);
		pathEls = agents.map((_, i) => el('polyline', { class: 'mf__path', stroke: color(i), 'stroke-width': 3.2 }, gp));
		agents.forEach((a, i) => {
			const g = el('g', { class: 'mf__goal' }, svg);
			el('rect', { x: a.goal[1] * S + 4, y: a.goal[0] * S + 4, width: S - 8, height: S - 8, rx: 2.5, stroke: color(i), fill: '#fff' }, g);
		});
		const gr = el('g', {}, svg);
		robotEls = agents.map((a, i) => {
			const g = el('g', { class: 'mf__robot' }, gr);
			el('circle', { r: S * 0.38, fill: color(i) }, g);
			el('text', { y: 3.5 }, g).textContent = i + 1;
			return g;
		});
	}
	function showPaths() {
		const run = state.world.runs[state.order];
		const S = 20;
		const won = new Set(run.rounds.slice(0, state.shown).map((r) => r.winner));
		run.paths.forEach((p, i) => {
			const pts = p.map(([r, c]) => `${c * S + S / 2},${r * S + S / 2}`).join(' ');
			pathEls[i].setAttribute('points', pts);
			pathEls[i].classList.toggle('is-on', won.has(i));
		});
	}
	function posAt(i, t) {
		const p = state.world.runs[state.order].paths[i];
		const k = Math.max(0, Math.min(p.length - 1, Math.floor(t)));
		const n = Math.min(p.length - 1, k + 1);
		const f = Math.min(1, t - k);
		return [p[k][0] + (p[n][0] - p[k][0]) * f, p[k][1] + (p[n][1] - p[k][1]) * f];
	}
	function placeRobots() {
		const S = 20;
		const arrived = [];
		robotEls.forEach((g, i) => {
			const [r, c] = posAt(i, state.t);
			g.setAttribute('transform', `translate(${c * S + S / 2},${r * S + S / 2})`);
			const done = state.t >= state.world.runs[state.order].paths[i].length - 1;
			g.classList.toggle('is-done', done);
			if (done) arrived.push(i);
		});
		return arrived.length;
	}

	// ---- auction panel ----
	function drawBids() {
		const run = state.world.runs[state.order];
		const N = state.world.agents.length;
		const k = Math.min(state.shown, run.rounds.length);
		if (k === 0) {
			roundEl.textContent = 'Auction';
			statusEl.textContent = 'not started';
			bidsEl.innerHTML = state.world.agents.map((_, i) => row(i, null, '')).join('');
			return;
		}
		const r = run.rounds[k - 1];
		roundEl.textContent = `Round ${k} of ${N}`;
		statusEl.textContent = k === N ? 'all paths reserved' : `robot ${r.winner + 1} wins`;
		const max = Math.max(...Object.values(run.rounds[0].bids), 1);
		const won = run.rounds.slice(0, k - 1).map((x) => x.winner);
		const ids = Object.keys(r.bids).map(Number).sort((a, b) => r.bids[a] - r.bids[b]);
		bidsEl.innerHTML = ids.map((i) => row(i, r.bids[i] / max, r.bids[i], i === r.winner ? 'is-win' : ''))
			.concat(won.map((i) => row(i, null, '✓', 'is-reserved'))).join('');
	}
	function row(i, f, v, cls = '') {
		return `<div class="mf__bid ${cls}" style="--c:${color(i)}"><span class="mf__dot">${i + 1}</span><span class="mf__track">${f === null ? '' : `<i style="width:${(f * 100).toFixed(1)}%"></i>`}</span><b>${v}</b></div>`;
	}

	function drawStats() {
		const run = state.world.runs[state.order];
		const done = state.shown >= run.rounds.length;
		root.querySelector('[data-k=flowtime]').textContent = done ? run.flowtime : '–';
		root.querySelector('[data-k=makespan]').textContent = done ? run.makespan : '–';
		const runs = state.world.runs;
		const maxF = Math.max(...['min', 'max', 'random'].map((o) => runs[o].flowtime));
		root.querySelector('[data-cmp]').innerHTML = [['min', 'Min bid'], ['max', 'Max bid'], ['random', 'Random']].map(([o, n]) =>
			`<div class="mf__cmprow${o === state.order ? ' is-on' : ''}"><span>${n}</span><span class="mf__cmpbar"><i style="width:${(runs[o].flowtime / maxF) * 100}%"></i></span><b>${runs[o].flowtime}</b><em>${runs[o].makespan}</em></div>`).join('')
			+ '<div class="mf__cmplegend"><span></span><span></span><b>flowtime</b><em>makespan</em></div>';
	}

	// ---- space-time view ----
	function drawSpaceTime() {
		if (canvas.hidden) return;
		const { free, agents, T } = state.world;
		const run = state.world.runs[state.order];
		const R = free.length;
		const C = free[0].length;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const W = canvas.clientWidth;
		const H = canvas.clientHeight;
		canvas.width = W * dpr;
		canvas.height = H * dpr;
		const ctx = canvas.getContext('2d');
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const tMax = Math.max(run.makespan + 2, 12);
		const span = Math.hypot(R, C);
		const k = Math.min(W / (span * 1.75), (H * 0.42) / (span * 0.5));
		const hz = (H * 0.5) / tMax;
		const cos = Math.cos(state.theta);
		const sin = Math.sin(state.theta);
		const P = (r, c, t) => {
			const x = c - (C - 1) / 2;
			const y = r - (R - 1) / 2;
			const u = x * cos - y * sin;
			const v = x * sin + y * cos;
			return [W / 2 + (u - v) * k * 0.87, H * 0.8 + (u + v) * k * 0.5 - t * hz];
		};
		// floor and shelves
		const corner = (r, c, t) => P(r, c, t);
		const quad = (r, c, t, inset = 0) => [corner(r - 0.5 + inset, c - 0.5 + inset, t), corner(r - 0.5 + inset, c + 0.5 - inset, t), corner(r + 0.5 - inset, c + 0.5 - inset, t), corner(r + 0.5 - inset, c - 0.5 + inset, t)];
		const fillPoly = (pts, fill, stroke) => {
			ctx.beginPath();
			pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
			ctx.closePath();
			if (fill) {
				ctx.fillStyle = fill;
				ctx.fill();
			}
			if (stroke) {
				ctx.strokeStyle = stroke;
				ctx.stroke();
			}
		};
		ctx.lineWidth = 1;
		fillPoly([corner(-0.5, -0.5, 0), corner(-0.5, C - 0.5, 0), corner(R - 0.5, C - 0.5, 0), corner(R - 0.5, -0.5, 0)], '#f6f7fb', '#d9dcea');
		free.forEach((rowv, r) => rowv.forEach((v, c) => {
			if (!v) fillPoly(quad(r, c, 0, 0.06), '#d4d7e6');
		}));
		// time axis at the far corner
		const [ax, ay] = corner(-0.5, -0.5, 0);
		const [bx, by] = corner(-0.5, -0.5, tMax);
		ctx.strokeStyle = '#b9bdd3';
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
		ctx.stroke();
		ctx.fillStyle = '#8a8fa8';
		ctx.font = '600 11px "Source Sans 3", system-ui, sans-serif';
		ctx.textAlign = 'right';
		for (let t = 0; t <= tMax; t += 10) {
			const [tx, ty] = corner(-0.5, -0.5, t);
			ctx.fillText(`t = ${t}`, tx - 6, ty + 4);
		}
		ctx.save();
		ctx.translate(bx - 8, by - 8);
		ctx.fillText('time ↑', 0, 0);
		ctx.restore();
		// the plane of the current time
		fillPoly([corner(-0.5, -0.5, state.t), corner(-0.5, C - 0.5, state.t), corner(R - 0.5, C - 0.5, state.t), corner(R - 0.5, -0.5, state.t)], 'rgba(81,90,172,0.06)', 'rgba(81,90,172,0.35)');
		// paths: one 3D line per robot; only reserved ones are drawn
		const won = new Set(run.rounds.slice(0, state.shown).map((r) => r.winner));
		agents.forEach((a, i) => {
			if (!won.has(i)) return;
			const p = run.paths[i];
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.strokeStyle = color(i);
			ctx.globalAlpha = 0.9;
			ctx.lineWidth = 2.2;
			ctx.beginPath();
			p.forEach(([r, c], t) => {
				const [x, y] = P(r, c, t);
				if (t) ctx.lineTo(x, y);
				else ctx.moveTo(x, y);
			});
			ctx.stroke();
			// waiting at the goal, reserved to the end of the horizon
			ctx.setLineDash([2, 4]);
			ctx.globalAlpha = 0.45;
			ctx.beginPath();
			const [gx, gy] = P(a.goal[0], a.goal[1], p.length - 1);
			const [hx, hy] = P(a.goal[0], a.goal[1], tMax);
			ctx.moveTo(gx, gy);
			ctx.lineTo(hx, hy);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;
		});
		// robots on the current time plane
		agents.forEach((a, i) => {
			if (!won.has(i)) return;
			const [r, c] = posAt(i, state.t);
			const [x, y] = P(r, c, Math.min(state.t, tMax));
			ctx.fillStyle = color(i);
			ctx.beginPath();
			ctx.arc(x, y, 4.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 1.5;
			ctx.stroke();
		});
	}

	function render() {
		showPaths();
		placeRobots();
		drawBids();
		drawStats();
		drawSpaceTime();
		const run = state.world.runs[state.order];
		slider.max = run.makespan;
		slider.value = state.t;
		timeEl.textContent = `t = ${Math.floor(state.t)}`;
		const allIn = state.shown >= run.rounds.length;
		hintEl.textContent = !allIn ? 'Each round every remaining robot bids its shortest path length; the winner reserves its path in space and time.'
			: state.view === 'map' ? 'Drag the time slider, or switch to Space–time to see the reservations as lines rising through time.'
				: 'Drag sideways to turn. Each line is one robot; its height is time. Lines never meet: the reservations guarantee no collisions.';
	}

	// ---- playback ----
	let raf = 0;
	function play(fromStart) {
		const run = state.world.runs[state.order];
		if (fromStart || state.t >= run.makespan) state.t = 0;
		state.playing = true;
		playBtn.textContent = '❚❚';
		playBtn.setAttribute('aria-label', 'Pause');
		let last = performance.now();
		cancelAnimationFrame(raf);
		const tick = (now) => {
			// the first frame's timestamp can precede `last`; never step backwards
			const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
			last = now;
			state.t = Math.min(run.makespan, state.t + dt * 4);
			render();
			if (state.t < run.makespan && state.playing) raf = requestAnimationFrame(tick);
			else stop();
		};
		raf = requestAnimationFrame(tick);
	}
	function stop() {
		state.playing = false;
		cancelAnimationFrame(raf);
		playBtn.textContent = '▶';
		playBtn.setAttribute('aria-label', 'Play');
	}

	// the auction, round by round, then the robots drive their reserved paths
	function runAuction() {
		clearTimers();
		stop();
		state.shown = 0;
		state.t = 0;
		render();
		const n = state.world.agents.length;
		if (reduce) {
			state.shown = n;
			render();
			return;
		}
		for (let k = 1; k <= n; k += 1) timers.push(setTimeout(() => {
			state.shown = k;
			render();
			if (k === n) timers.push(setTimeout(() => play(true), 500));
		}, k * 420));
	}

	function newWorld(seed) {
		clearTimers();
		stop();
		state.seed = seed;
		state.world = makeWorld(state.kind, seed);
		state.shown = 0;
		state.t = 0;
		drawMap();
		render();
	}

	// ---- controls ----
	root.querySelectorAll('.mf__seg').forEach((seg) => seg.addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		seg.querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b));
		state[seg.dataset.group] = b.dataset.v;
		if (seg.dataset.group === 'kind') newWorld(state.seed);
		runAuction();
	}));
	root.querySelector('[data-act=new]').addEventListener('click', () => {
		newWorld(state.seed + 53);
		runAuction();
	});
	root.querySelector('[data-act=run]').addEventListener('click', runAuction);
	playBtn.addEventListener('click', () => {
		if (state.playing) stop();
		else {
			clearTimers();
			state.shown = state.world.agents.length;
			play(false);
		}
	});
	slider.addEventListener('input', () => {
		clearTimers();
		stop();
		state.shown = state.world.agents.length;
		state.t = +slider.value;
		render();
	});
	root.querySelectorAll('.mf__views button').forEach((b) => b.addEventListener('click', () => {
		state.view = b.dataset.view;
		root.querySelectorAll('.mf__views button').forEach((x) => x.classList.toggle('is-on', x === b));
		svg.toggleAttribute('hidden', state.view !== 'map'); // SVG elements have no .hidden property
		canvas.hidden = state.view === 'map';
		render();
	}));
	let drag = null;
	canvas.addEventListener('pointerdown', (e) => {
		drag = { x: e.clientX, theta: state.theta };
		canvas.setPointerCapture(e.pointerId);
	});
	canvas.addEventListener('pointermove', (e) => {
		if (!drag) return;
		state.theta = drag.theta + (e.clientX - drag.x) * 0.01;
		drawSpaceTime();
	});
	canvas.addEventListener('pointerup', () => {
		drag = null;
	});
	new ResizeObserver(() => drawSpaceTime()).observe(canvas);

	newWorld(state.seed);
	// start the auction the first time the demo comes into view
	let started = false;
	new IntersectionObserver((entries) => {
		if (started || !entries[0].isIntersecting) return;
		started = true;
		runAuction();
	}, { threshold: 0.3 }).observe(root);
})();
