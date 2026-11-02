// Code-drawn figures for the Learning to Sync page, in the talk deck's style. Each one animates once,
// the first time it scrolls into view, then stays put; hover and controls let readers explore it.
// Numbers come from the paper's tables and the talk's curves.json.
(function () {
	'use strict';
	const NS = 'http://www.w3.org/2000/svg';
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const COL = {
		maroon: '#7a0019',
		maroonSoft: '#f6e9ec',
		orange: '#f15a22',
		gold: '#c99700',
		navy: '#0c2340',
		skip: '#8b8580',
		ink: '#1c1a19',
		ink2: '#5a544f',
		ink3: '#8a847e',
		rule: '#e6e2de',
		wash: '#f6f4f2',
		base: '#b5aea7',
		baseDk: '#7a736d',
		bad: '#c8402f',
	};

	// --- helpers ---
	function el(tag, attrs, parent, text) {
		const n = document.createElementNS(NS, tag);
		Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
		if (text !== undefined) n.textContent = text;
		if (parent) parent.appendChild(n);
		return n;
	}
	// math text: x_{sub} and x^{sup} become shifted tspans
	function math(node, str) {
		node.innerHTML = str.replace(/([_^])\{([^}]*)\}/g, (m, k, t) => `<tspan dy="${k === '_' ? 4 : -6}" font-size="0.72em">${t}</tspan><tspan dy="${k === '_' ? -4 : 6}">\u200a</tspan>`);
		return node;
	}
	function svg(host, w, h, label) {
		return el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'fx__svg', role: 'img', 'aria-label': label }, host);
	}
	const easeOut = (t) => 1 - Math.pow(1 - t, 3);
	function tween(ms, fn) {
		if (reduce || ms <= 0) {
			fn(1);
			return Promise.resolve();
		}
		return new Promise((done) => {
			const t0 = performance.now();
			const tick = (now) => {
				// the first frame's timestamp can precede t0; clamp so easing never runs backwards
				const f = Math.max(0, Math.min(1, (now - t0) / ms));
				fn(easeOut(f));
				if (f < 1) requestAnimationFrame(tick);
				else done();
			};
			requestAnimationFrame(tick);
		});
	}
	const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
	// run `play` once, the first time the figure is mostly on screen
	function once(host, play) {
		let done = false;
		const io = new IntersectionObserver((entries) => {
			if (done || !entries[0].isIntersecting) return;
			done = true;
			io.disconnect();
			play();
		}, { threshold: 0.35 });
		io.observe(host);
	}
	function seg(host, items, cls) {
		const box = document.createElement('div');
		box.className = `fx__seg ${cls || ''}`;
		box.setAttribute('role', 'group');
		box.innerHTML = items.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join('');
		host.appendChild(box);
		const set = (v) => box.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.v === v));
		return { box, set };
	}

	// one shared tooltip
	const tip = document.createElement('div');
	tip.className = 'fx-tip';
	tip.hidden = true;
	document.body.appendChild(tip);
	function showTip(html, e) {
		tip.innerHTML = html;
		tip.hidden = false;
		const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
		tip.style.left = `${x}px`;
		tip.style.top = `${e.clientY - tip.offsetHeight - 12}px`;
	}
	const hideTip = () => {
		tip.hidden = true;
	};

	const FIGS = {};

	// ===================================================== one round, four choices
	FIGS['round-costs'] = function (host) {
		const ACTS = {
			S: { name: 'Skip', up: 0, dn: 0, color: COL.skip, note: 'Skip: training is still charged, but there is no transfer and no communication cost.' },
			U: { name: 'Upload', up: 1, dn: 0, color: COL.maroon, note: 'Upload: the update goes to the server, so upload time and energy are added.' },
			D: { name: 'Download', up: 0, dn: 1, color: COL.orange, note: 'Download: the client pulls the newest global model; only the download is charged.' },
			B: { name: 'Both', up: 1, dn: 1, color: COL.gold, note: 'Both: upload, wait for aggregation, then download. Both transfer costs apply.' },
		};
		const controls = seg(host, Object.entries(ACTS).map(([k, a]) => [k, a.name]), 'fx__seg--acts');
		const s = svg(host, 760, 290, 'Costs of one round for each synchronization action');
		const note = document.createElement('p');
		note.className = 'fx__note';
		host.appendChild(note);

		function box(x, w, title, sub, cls) {
			const g = el('g', { class: `rc__box ${cls || ''}` }, s);
			el('rect', { x, y: 44, width: w, height: 64, rx: 8 }, g);
			el('text', { x: x + w / 2, y: 72, class: 'rc__title' }, g, title);
			if (sub) {
				const t = el('text', { x: x + w / 2, y: 96, class: 'rc__math' }, g);
				t.innerHTML = sub;
			}
			return g;
		}
		const sub = (a, b) => `T<tspan class="rc__sub" dy="4">${a}</tspan><tspan dy="-4">, E</tspan><tspan class="rc__sub" dy="4">${b}</tspan><tspan dy="-4">\u200a</tspan>`;
		box(20, 170, 'Local training', sub('loc', 'loc'), 'rc__box--train');
		const decide = el('g', { class: 'rc__box rc__box--decide' }, s);
		el('rect', { x: 200, y: 44, width: 34, height: 64, rx: 8 }, decide);
		el('text', { x: 217, y: 76, class: 'rc__decide', transform: 'rotate(-90 217 76)' }, decide, 'decide');
		const upBox = box(246, 150, 'Upload', sub('up', 'up'), 'rc__box--up');
		const dnBox = box(406, 150, 'Download', sub('dn', 'dn'), 'rc__box--dn');
		const srvBox = box(566, 174, 'Server update', '', 'rc__box--srv');
		el('text', { x: 653, y: 96, class: 'rc__srvsub' }, srvBox, 'aggregate, new version');
		const iUp = math(el('text', { x: 321, y: 34, class: 'rc__ind', fill: COL.maroon }, s), 'I_{up} = 1');
		const iDn = math(el('text', { x: 481, y: 34, class: 'rc__ind', fill: COL.orange }, s), 'I_{dn} = 1');
		const badge = el('g', { class: 'rc__badge' }, s);
		const badgeRect = el('rect', { x: 157, y: 8, width: 120, height: 24, rx: 12 }, badge);
		const badgeText = el('text', { x: 217, y: 24 }, badge, '');

		// round axis
		el('line', { x1: 20, x2: 740, y1: 132, y2: 132, class: 'rc__axis' }, s);
		el('text', { x: 20, y: 152, class: 'rc__round' }, s, 'round t');
		el('text', { x: 740, y: 152, class: 'rc__round', 'text-anchor': 'end' }, s, 'round t+1');
		const marker = el('path', { d: 'M-6,0 L6,0 L0,9 Z', class: 'rc__marker', transform: 'translate(20,122)' }, s);

		// cost bars
		const TX = 260;
		const TW = 480;
		el('text', { x: 20, y: 192, class: 'rc__cost' }, s, 'Compute cost');
		math(el('text', { x: 20, y: 214, class: 'rc__formula' }, s), 'λ_{T} T^{loc} + λ_{E} E^{loc}');
		el('rect', { x: TX, y: 178, width: TW, height: 26, rx: 4, class: 'rc__track' }, s);
		const comp = el('rect', { x: TX, y: 178, width: 0, height: 26, rx: 4, class: 'rc__fill rc__fill--comp' }, s);
		const compT = el('text', { x: TX, y: 196, class: 'rc__bartext' }, s, 'charged every round');
		el('text', { x: 20, y: 252, class: 'rc__cost' }, s, 'Communication cost');
		math(el('text', { x: 20, y: 274, class: 'rc__formula' }, s), 'λ_{T} (I_{up} T^{up} + I_{dn} T^{dn}) + λ_{E} (…)');
		el('rect', { x: TX, y: 238, width: TW, height: 26, rx: 4, class: 'rc__track' }, s);
		const comm = el('rect', { x: TX, y: 238, width: 0, height: 26, rx: 4, class: 'rc__fill' }, s);
		const commT = el('text', { x: TX, y: 256, class: 'rc__bartext' }, s, '');

		let cur = { comp: 0, comm: 0 };
		function show(k) {
			const a = ACTS[k];
			controls.set(k);
			upBox.classList.toggle('is-off', !a.up);
			dnBox.classList.toggle('is-off', !a.dn);
			srvBox.classList.toggle('is-off', !a.up);
			iUp.style.opacity = a.up ? 1 : 0;
			iDn.style.opacity = a.dn ? 1 : 0;
			badgeRect.setAttribute('fill', a.color);
			badgeText.textContent = `a_t = ${a.name}`;
			badge.style.opacity = 1;
			note.textContent = a.note;
			const target = { comp: 0.32 * TW, comm: ((0.3 * a.up + 0.2 * a.dn) / 0.5) * 0.62 * TW };
			const from = { ...cur };
			commT.textContent = a.up || a.dn ? (a.up && a.dn ? 'upload + download' : a.up ? 'upload only' : 'download only') : 'no transfer, no cost';
			return tween(550, (e) => {
				cur = { comp: from.comp + (target.comp - from.comp) * e, comm: from.comm + (target.comm - from.comm) * e };
				comp.setAttribute('width', cur.comp);
				comm.setAttribute('width', cur.comm);
				comm.setAttribute('fill', a.color);
				compT.setAttribute('x', TX + cur.comp + 10);
				commT.setAttribute('x', TX + cur.comm + 10);
			});
		}
		function sweep() {
			return tween(1400, (e) => marker.setAttribute('transform', `translate(${20 + 720 * e},122)`));
		}
		let scripted = true;
		controls.box.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			scripted = false;
			show(b.dataset.v);
			sweep();
		});
		badge.style.opacity = 0;
		iUp.style.opacity = 0;
		iDn.style.opacity = 0;
		note.textContent = 'Pick an action to see what one round costs.';
		once(host, async () => {
			for (const k of ['U', 'S', 'B']) {
				if (!scripted) return;
				await Promise.all([show(k), sweep()]);
				await wait(900);
			}
		});
	};

	// ===================================================== skip or send
	FIGS['skip-or-send'] = function (host) {
		const ctl = document.createElement('div');
		ctl.className = 'fx__controls';
		host.appendChild(ctl);
		const ch = seg(ctl, [['good', 'Good link'], ['weak', 'Weak link']]);
		const lab = document.createElement('label');
		lab.className = 'fx__slider';
		lab.innerHTML = 'Unsent progress <b></b><input type="range" min="0.15" max="0.5" step="0.01" value="0.3">';
		ctl.appendChild(lab);
		const range = lab.querySelector('input');
		const pOut = lab.querySelector('b');

		const s = svg(host, 640, 340, 'Cost of waiting versus cost of sending');
		const X0 = 60;
		const X1 = 620;
		const Y0 = 34;
		const Y1 = 284;
		const x = (t) => X0 + ((X1 - X0) * t) / 10;
		const y = (v) => Y1 - (Y1 - Y0) * Math.min(1, v);
		const waitR = el('rect', { y: Y0, height: Y1 - Y0, class: 'ss__wait' }, s);
		const sendR = el('rect', { y: Y0, height: Y1 - Y0, class: 'ss__send' }, s);
		const waitL = el('text', { y: Y0 + 20, class: 'ss__region' }, s, 'WAIT (Skip)');
		const sendL = el('text', { y: Y0 + 20, class: 'ss__region ss__region--send' }, s, 'SEND (Upload)');
		for (let t = 0; t <= 10; t += 2) el('text', { x: x(t), y: Y1 + 20, class: 'fx__tick', 'text-anchor': 'middle' }, s, t);
		el('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, class: 'fx__axis' }, s);
		el('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, class: 'fx__axis' }, s);
		el('text', { x: (X0 + X1) / 2, y: Y1 + 46, class: 'fx__axislabel', 'text-anchor': 'middle' }, s, 'Decisions since the last upload →');
		el('text', { x: 0, y: 0, class: 'fx__axislabel', transform: `translate(24 ${(Y0 + Y1) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, s, 'Cost →');
		const sendLine = el('line', { x1: X0, x2: X1, class: 'ss__sendline' }, s);
		const sendText = el('text', { x: X0 + 8, class: 'ss__label' }, s, '');
		const clip = el('rect', { x: X0, y: 0, height: 340, width: 0 }, el('clipPath', { id: 'ss-clip' }, el('defs', {}, s)));
		const waitLine = el('path', { class: 'ss__waitline', 'clip-path': 'url(#ss-clip)' }, s);
		const waitText = el('text', { class: 'ss__label ss__label--wait', 'text-anchor': 'end' }, s, 'cost of waiting (unsent progress)');
		const cross = el('g', { class: 'ss__cross' }, s);
		el('circle', { r: 7 }, cross);
		const crossT = el('text', { y: 0, class: 'ss__crosstext', 'text-anchor': 'middle' }, s, 'switch point');

		const state = { link: 'weak', p: 0.3 };
		let revealed = 0;
		function draw() {
			const c = 0.06 * (state.p / 0.3);
			const send = state.link === 'weak' ? 0.5 : 0.25;
			const tStar = Math.max(0, Math.min(10, send / c - 1));
			pOut.textContent = state.p.toFixed(2);
			ch.set(state.link);
			waitLine.setAttribute('d', `M${x(0)},${y(c)} L${x(10)},${y(c * 11)}`);
			waitText.setAttribute('x', X1 - 6);
			waitText.setAttribute('y', y(Math.min(0.97, c * 11)) + (c * 11 > 0.9 ? 18 : -10));
			sendLine.setAttribute('y1', y(send));
			sendLine.setAttribute('y2', y(send));
			sendText.setAttribute('y', y(send) - 8);
			sendText.textContent = `cost of sending (${state.link === 'weak' ? 'weak' : 'good'} link)`;
			const xs = x(tStar);
			waitR.setAttribute('x', X0);
			waitR.setAttribute('width', xs - X0);
			sendR.setAttribute('x', xs);
			sendR.setAttribute('width', X1 - xs);
			waitL.setAttribute('x', X0 + (xs - X0) / 2);
			sendL.setAttribute('x', xs + (X1 - xs) / 2);
			sendL.style.display = X1 - xs > 110 ? '' : 'none';
			waitL.style.display = xs - X0 > 90 ? '' : 'none';
			cross.setAttribute('transform', `translate(${xs},${y(send)})`);
			crossT.setAttribute('x', xs);
			crossT.setAttribute('y', Y1 - 10);
			[waitR, sendR, waitL, sendL, cross, crossT, waitText].forEach((n) => {
				n.style.opacity = revealed;
			});
		}
		ch.box.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			state.link = b.dataset.v;
			draw();
		});
		range.addEventListener('input', () => {
			state.p = +range.value;
			draw();
		});
		draw();
		once(host, async () => {
			await tween(1800, (e) => clip.setAttribute('width', (X1 - X0) * e));
			await tween(500, (e) => {
				revealed = e;
				draw();
			});
		});
	};

	// ===================================================== traffic results scatter
	FIGS['traffic-result'] = function (host) {
		const DATA = [
			{ m: 'DQN', mae: 20.44, rmse: 30.78, mape: 14.85, lat: 1.4e5, en: 1.8e5, gb: 28.37, up: 6439 },
			{ m: 'FedAsync', mae: 20.51, rmse: 31.34, mape: 15.33, lat: 1.4e5, en: 1.9e5, gb: 30.56, up: 6936 },
			{ m: 'FedBuff', mae: 22.12, rmse: 32.67, mape: 18.4, lat: 1.2e5, en: 1.7e5, gb: 31.89, up: 7237 },
			{ m: 'Oort', mae: 23.0, rmse: 34.4, mape: 22.88, lat: 1.4e5, en: 1.9e5, gb: 29.47, up: 6689 },
			{ m: 'PPO', mae: 19.64, rmse: 29.92, mape: 16.5, lat: 6.8e4, en: 8.1e4, gb: 10.59, up: 2404 },
		];
		const XA = {
			gb: { l: 'Data uploaded (GB)', max: 35, ticks: [0, 10, 20, 30], f: (v) => v },
			lat: { l: 'Latency (×10⁴ s)', max: 16e4, ticks: [0, 5e4, 10e4, 15e4], f: (v) => v / 1e4 },
			en: { l: 'Energy (×10⁴ J)', max: 21e4, ticks: [0, 5e4, 10e4, 15e4, 20e4], f: (v) => v / 1e4 },
			up: { l: 'Uploads', max: 8000, ticks: [0, 2000, 4000, 6000, 8000], f: (v) => v.toLocaleString('en-US') },
		};
		const YA = {
			rmse: { l: 'RMSE', min: 28, max: 36, ticks: [28, 30, 32, 34, 36] },
			mae: { l: 'MAE', min: 18, max: 24, ticks: [18, 20, 22, 24] },
			mape: { l: 'MAPE (%)', min: 12, max: 24, ticks: [12, 16, 20, 24] },
		};
		const ctl = document.createElement('div');
		ctl.className = 'fx__controls';
		host.appendChild(ctl);
		const xs = seg(ctl, [['gb', 'Data'], ['lat', 'Latency'], ['en', 'Energy'], ['up', 'Uploads']]);
		const ys = seg(ctl, [['rmse', 'RMSE'], ['mae', 'MAE'], ['mape', 'MAPE']]);
		xs.box.insertAdjacentHTML('beforebegin', '<span class="fx__ctllabel">Cost</span>');
		ys.box.insertAdjacentHTML('beforebegin', '<span class="fx__ctllabel">Error</span>');
		const s = svg(host, 640, 370, 'Forecast error against system cost for each method');
		const P = { x0: 74, x1: 610, y0: 20, y1: 296 };
		const axes = el('g', {}, s);
		const pts = DATA.map((d) => {
			const ours = d.m === 'PPO';
			const g = el('g', { class: `tr__pt${ours ? ' tr__pt--ours' : ''}`, tabindex: 0 }, s);
			el('circle', { r: ours ? 10 : 7.5 }, g);
			const t = el('text', { class: 'tr__label' }, g, d.m);
			g.addEventListener('mousemove', (e) => showTip(`<b>${d.m}</b>MAE ${d.mae} · RMSE ${d.rmse} · MAPE ${d.mape}%<br>${d.gb} GB · ${d.up.toLocaleString('en-US')} uploads`, e));
			g.addEventListener('mouseleave', hideTip);
			return { d, g, t, x: P.x0, y: P.y1, tx: 0, ty: 0 };
		});
		const state = { x: 'gb', y: 'rmse' };
		function layout(animate) {
			const X = XA[state.x];
			const Y = YA[state.y];
			xs.set(state.x);
			ys.set(state.y);
			const sx = (v) => P.x0 + ((P.x1 - P.x0) * v) / X.max;
			const sy = (v) => P.y1 - ((P.y1 - P.y0) * (v - Y.min)) / (Y.max - Y.min);
			axes.innerHTML = '';
			Y.ticks.forEach((v) => {
				el('line', { x1: P.x0, x2: P.x1, y1: sy(v), y2: sy(v), class: 'fx__grid' }, axes);
				el('text', { x: P.x0 - 12, y: sy(v) + 4, class: 'fx__tick', 'text-anchor': 'end' }, axes, v);
			});
			X.ticks.forEach((v) => el('text', { x: sx(v), y: P.y1 + 22, class: 'fx__tick', 'text-anchor': 'middle' }, axes, X.f(v)));
			el('line', { x1: P.x0, x2: P.x1, y1: P.y1, y2: P.y1, class: 'fx__axis' }, axes);
			el('text', { x: (P.x0 + P.x1) / 2, y: P.y1 + 54, class: 'fx__axislabel', 'text-anchor': 'middle' }, axes, `${X.l} → higher cost`);
			el('text', { class: 'fx__axislabel', 'text-anchor': 'middle', transform: `translate(22 ${(P.y0 + P.y1) / 2}) rotate(-90)` }, axes, `${Y.l} (lower is better)`);
			pts.forEach((p) => {
				p.tx = sx(p.d[state.x]);
				p.ty = sy(Math.min(Y.max, p.d[state.y]));
			});
			// labels to the right, or the left near the edge; nudge apart when they would collide
			const placed = [];
			pts.slice().sort((a, b) => a.ty - b.ty).forEach((p) => {
				let ly = p.ty + 5;
				placed.forEach((q) => {
					if (Math.abs(q.x - p.tx) < 140 && Math.abs(q.y - ly) < 20) ly = q.y + 20;
				});
				placed.push({ x: p.tx, y: ly });
				const left = p.tx > P.x1 - 120;
				p.t.setAttribute('x', left ? -14 : 14);
				p.t.setAttribute('y', ly - p.ty);
				p.t.setAttribute('text-anchor', left ? 'end' : 'start');
			});
			const from = pts.map((p) => [p.x, p.y]);
			return tween(animate ? 600 : 0, (e) => {
				pts.forEach((p, i) => {
					p.x = from[i][0] + (p.tx - from[i][0]) * e;
					p.y = from[i][1] + (p.ty - from[i][1]) * e;
					p.g.setAttribute('transform', `translate(${p.x},${p.y})`);
				});
			});
		}
		ctl.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			if (b.closest('.fx__seg') === xs.box) state.x = b.dataset.v;
			else state.y = b.dataset.v;
			layout(true);
		});
		layout(false);
		pts.forEach((p) => {
			p.g.style.opacity = 0;
		});
		once(host, async () => {
			const target = pts.map((p) => p.ty);
			pts.forEach((p) => {
				p.y = P.y0 - 20;
			});
			for (let i = 0; i < pts.length; i += 1) {
				const p = pts[i];
				p.g.style.opacity = 1;
				const y0 = p.y;
				tween(650, (e) => {
					p.y = y0 + (target[i] - y0) * e;
					p.g.setAttribute('transform', `translate(${p.tx},${p.y})`);
				});
				await wait(140);
			}
		});
	};

	// ===================================================== image accuracy curves
	FIGS['image-curves'] = function (host, data) {
		const SER = [
			{ k: 'FedAsync', color: COL.ink2, w: 1.6 },
			{ k: 'FedBuff', color: COL.baseDk, w: 1.6, dash: '6 4' },
			{ k: 'Oort', color: COL.baseDk, w: 1.8, dash: '1.5 3' },
			{ k: 'DQN', color: COL.base, w: 1.6 },
			{ k: 'PPO', color: COL.maroon, w: 3 },
		];
		const legend = document.createElement('div');
		legend.className = 'fx__legend';
		legend.innerHTML = SER.slice().reverse().map((x) => `<span style="--c:${x.color}" class="${x.dash ? 'is-dash' : ''}${x.k === 'PPO' ? ' is-ours' : ''}">${x.k}</span>`).join('');
		host.appendChild(legend);
		const s = svg(host, 560, 330, 'Test accuracy over 300 episodes for each method');
		const P = { x0: 52, x1: 540, y0: 16, y1: 280 };
		const sx = (i) => P.x0 + ((P.x1 - P.x0) * i) / 100;
		const sy = (v) => P.y1 - ((P.y1 - P.y0) * v) / 90;
		[0, 20, 40, 60, 80].forEach((v) => {
			el('line', { x1: P.x0, x2: P.x1, y1: sy(v), y2: sy(v), class: 'fx__grid' }, s);
			el('text', { x: P.x0 - 10, y: sy(v) + 4, class: 'fx__tick', 'text-anchor': 'end' }, s, v);
		});
		[0, 50, 100, 150, 200, 250, 300].forEach((e) => el('text', { x: sx(e / 3), y: P.y1 + 20, class: 'fx__tick', 'text-anchor': 'middle' }, s, e));
		el('line', { x1: P.x0, x2: P.x1, y1: P.y1, y2: P.y1, class: 'fx__axis' }, s);
		el('text', { x: (P.x0 + P.x1) / 2, y: P.y1 + 46, class: 'fx__axislabel', 'text-anchor': 'middle' }, s, 'Episode');
		el('text', { class: 'fx__axislabel', 'text-anchor': 'middle', transform: `translate(16 ${(P.y0 + P.y1) / 2}) rotate(-90)` }, s, 'Test accuracy (%)');
		const clip = el('rect', { x: P.x0 - 4, y: 0, height: 330, width: 0 }, el('clipPath', { id: 'ic-clip' }, el('defs', {}, s)));
		const lines = el('g', { 'clip-path': 'url(#ic-clip)' }, s);
		SER.forEach((x) => {
			const d = data[x.k].map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('');
			el('path', { d, fill: 'none', stroke: x.color, 'stroke-width': x.w, 'stroke-dasharray': x.dash || 'none', 'stroke-linejoin': 'round' }, lines);
		});
		const endLabel = el('text', { x: P.x1, y: sy(data.PPO[100]) - 10, class: 'ic__end', 'text-anchor': 'end' }, s, 'PPO');
		endLabel.style.opacity = 0;
		// crosshair: values of every method at the hovered episode
		const cross = el('line', { y1: P.y0, y2: P.y1, class: 'fx__cross' }, s);
		cross.style.opacity = 0;
		const hit = el('rect', { x: P.x0, y: P.y0, width: P.x1 - P.x0, height: P.y1 - P.y0, fill: 'transparent' }, s);
		hit.addEventListener('mousemove', (e) => {
			const r = s.getBoundingClientRect();
			const vx = ((e.clientX - r.left) / r.width) * 560;
			const i = Math.max(0, Math.min(100, Math.round(((vx - P.x0) / (P.x1 - P.x0)) * 100)));
			cross.setAttribute('x1', sx(i));
			cross.setAttribute('x2', sx(i));
			cross.style.opacity = 1;
			const rowsHtml = SER.slice().sort((a, b) => data[b.k][i] - data[a.k][i]).map((x) => `${x.k === 'PPO' ? '<b>' : ''}${x.k} ${data[x.k][i].toFixed(1)}%${x.k === 'PPO' ? '</b>' : ''}`).join('<br>');
			showTip(`<b>Episode ${i * 3}</b>${rowsHtml}`, e);
		});
		hit.addEventListener('mouseleave', () => {
			cross.style.opacity = 0;
			hideTip();
		});
		once(host, async () => {
			await tween(2000, (e) => clip.setAttribute('width', (P.x1 - P.x0 + 8) * e));
			endLabel.style.opacity = 1;
		});
	};

	// ===================================================== horizontal bar rows (image results, ablation)
	function barRows(host, cfg) {
		const ctl = cfg.modes ? seg(host, cfg.modes.map((m) => [m.id, m.label])) : null;
		const H = 26 + cfg.rows.length * cfg.gap + 10;
		const s = svg(host, 560, H, cfg.label);
		const LX = cfg.labelW;
		const BX = LX + 14;
		const BW = cfg.barW;
		const head = el('text', { x: BX, y: 14, class: 'fx__kicker-svg' }, s, '');
		const head2 = el('text', { x: 556, y: 14, class: 'fx__kicker-svg', 'text-anchor': 'end' }, s, cfg.head2 || '');
		el('line', { x1: BX, x2: BX, y1: 22, y2: H - 6, class: 'fx__axis' }, s);
		const rows = cfg.rows.map((r, i) => {
			const y = 26 + i * cfg.gap;
			const g = el('g', { class: `br__row${r.ours ? ' is-ours' : ''}` }, s);
			el('text', { x: LX, y: y + 18, class: 'br__name', 'text-anchor': 'end' }, g, r.name);
			el('rect', { x: BX, y: y + 2, width: BW, height: 24, rx: 3, class: 'br__track' }, g);
			const bar = el('rect', { x: BX, y: y + 2, width: 0, height: 24, rx: 3, class: 'br__bar' }, g);
			const val = el('text', { x: BX + BW + 12, y: y + 19, class: 'br__val' }, g, '');
			const val2 = el('text', { x: 556, y: y + 19, class: 'br__val2', 'text-anchor': 'end' }, g, '');
			if (r.tip) {
				g.addEventListener('mousemove', (e) => showTip(r.tip, e));
				g.addEventListener('mouseleave', hideTip);
			}
			return { r, bar, val, val2, y, w: 0 };
		});
		let mode = cfg.modes ? cfg.modes[0] : cfg;
		function draw(animate) {
			if (ctl) ctl.set(mode.id);
			head.textContent = mode.head;
			const from = rows.map((x) => x.w);
			return tween(animate ? 900 : 0, (e) => {
				rows.forEach((x, i) => {
					const v = x.r[mode.key];
					x.w = from[i] + ((v / mode.max) * BW - from[i]) * e;
					x.bar.setAttribute('width', Math.max(0, x.w));
					x.bar.setAttribute('fill', mode.color ? mode.color(x.r) : x.r.ours ? COL.maroon : COL.base);
					x.val.textContent = e === 1 ? mode.fmt(v) : mode.fmt(v * e);
					x.val.setAttribute('fill', mode.valColor ? mode.valColor(x.r) : x.r.ours ? COL.maroon : COL.ink);
					x.val2.textContent = mode.second ? mode.second(x.r) : '';
				});
			});
		}
		if (ctl) {
			ctl.box.addEventListener('click', (e) => {
				const b = e.target.closest('button');
				if (!b) return;
				mode = cfg.modes.find((m) => m.id === b.dataset.v);
				draw(true);
			});
		}
		draw(false);
		rows.forEach((x) => {
			x.w = 0;
			x.bar.setAttribute('width', 0);
			x.val.textContent = '';
		});
		head2.style.opacity = mode.second ? 1 : 0;
		return { s, rows, play: () => draw(true), x: (v) => BX + (v / mode.max) * BW };
	}

	FIGS['image-bars'] = function (host) {
		const rows = [
			{ name: 'PPO (ours)', acc: 84.48, lat: 406.3, ours: true },
			{ name: 'Oort', acc: 81.1, lat: 399.2 },
			{ name: 'FedAsync', acc: 81.0, lat: 401.0 },
			{ name: 'FedBuff', acc: 80.81, lat: 394.3 },
			{ name: 'Always-sync', acc: 70.66, lat: 731.1 },
			{ name: 'DQN', acc: 62.09, lat: 436.3 },
		];
		const b = barRows(host, {
			label: 'Mean accuracy and latency per episode for each method',
			rows,
			labelW: 130,
			barW: 230,
			gap: 40,
			modes: [
				{ id: 'acc', label: 'Mean accuracy', head: 'MEAN ACCURACY', key: 'acc', max: 100, fmt: (v) => `${v.toFixed(2)}%`, second: (r) => `${r.lat.toFixed(1)} s` },
				{ id: 'lat', label: 'Latency / episode', head: 'LATENCY PER EPISODE (LOWER IS BETTER)', key: 'lat', max: 800, fmt: (v) => `${v.toFixed(1)} s`, color: (r) => (r.ours ? COL.maroon : r.lat > 700 ? COL.bad : COL.base), valColor: (r) => (r.lat > 700 ? COL.bad : r.ours ? COL.maroon : COL.ink) },
			],
		});
		once(host, b.play);
	};

	FIGS.ablation = function (host) {
		const rows = [
			{ name: 'Full', acc: 85.31, ours: true, tip: '<b>Full</b>85.31% · 400.1 s · 588.9 J' },
			{ name: 'w/o bidirectional', acc: 75.31, tip: '<b>w/o bidirectional</b>75.31% · 356.0 s · 528.7 J' },
			{ name: '+ w/o learning state', acc: 73.75, tip: '<b>w/o bidirectional + learning state</b>73.75% · 351.8 s · 521.6 J' },
			{ name: '+ w/o privacy state', acc: 74.06, tip: '<b>w/o bidirectional + privacy state</b>74.06% · 356.8 s · 529.7 J' },
			{ name: '+ w/o sync state', acc: 72.81, tip: '<b>w/o bidirectional + sync state</b>72.81% · 355.3 s · 527.0 J' },
		];
		const b = barRows(host, {
			label: 'Image accuracy when parts of the policy are removed',
			rows,
			labelW: 170,
			barW: 260,
			gap: 46,
			head: 'ACCURACY AFTER 300 EPISODES',
			key: 'acc',
			max: 100,
			fmt: (v) => `${v.toFixed(2)}%`,
		});
		// the drop from removing the Both action
		const x1 = b.x(85.31);
		const x2 = b.x(75.31);
		const y1 = b.rows[0].y + 14;
		const y2 = b.rows[1].y + 14;
		const br = el('g', { class: 'ab__drop' }, b.s);
		const mid = (y1 + y2) / 2;
		el('path', { d: `M${x1},${y1 + 12} L${x1},${mid} L${x2},${mid} L${x2},${y2 - 12}` }, br);
		el('text', { x: x1 + 8, y: mid + 4, 'text-anchor': 'start' }, br, '−10.0 pts');
		br.style.opacity = 0;
		once(host, async () => {
			await b.play();
			await tween(400, (e) => {
				br.style.opacity = e;
			});
		});
	};

	// ===================================================== messages sent (1 square = 100)
	FIGS.messages = function (host) {
		const ROWS = [
			{ m: 'FedBuff', rmse: '32.67', up: 7237, dn: 749 },
			{ m: 'PPO', rmse: '29.92', up: 2404, dn: 2506, ours: true },
		];
		const s = svg(host, 600, 300, 'Uploads and downloads sent by FedBuff and PPO');
		el('circle', { cx: 154, cy: 12, r: 5, fill: COL.maroon }, s);
		el('text', { x: 164, y: 17, class: 'ms__head' }, s, 'Uploads');
		el('circle', { cx: 384, cy: 12, r: 5, fill: COL.orange }, s);
		el('text', { x: 394, y: 17, class: 'ms__head' }, s, 'Downloads');
		const SQ = 14;
		const G = 3;
		const PER = 12;
		const squares = [];
		ROWS.forEach((r, ri) => {
			const y0 = 40 + ri * 150;
			if (ri) el('line', { x1: 0, x2: 600, y1: y0 - 18, y2: y0 - 18, class: 'fx__grid' }, s);
			el('text', { x: 0, y: y0 + 14, class: `ms__name${r.ours ? ' is-ours' : ''}` }, s, r.m);
			el('text', { x: 0, y: y0 + 34, class: 'fx__tick' }, s, `RMSE ${r.rmse}`);
			[['up', 150, COL.maroon], ['dn', 380, COL.orange]].forEach(([k, x0, c]) => {
				const n = Math.round(r[k] / 100);
				for (let i = 0; i < n; i += 1) {
					const q = el('rect', { x: x0 + (i % PER) * (SQ + G), y: y0 + Math.floor(i / PER) * (SQ + G), width: SQ, height: SQ, rx: 2.5, fill: c }, s);
					q.style.opacity = 0;
					squares.push(q);
				}
				const rowsUsed = Math.ceil(n / PER);
				el('text', { x: x0, y: y0 + rowsUsed * (SQ + G) + 16, class: 'ms__val' }, s, r[k].toLocaleString('en-US'));
			});
		});
		el('text', { x: 600, y: 296, class: 'fx__tick', 'text-anchor': 'end' }, s, '1 square = 100 messages');
		once(host, () => {
			const per = Math.max(4, 1200 / squares.length);
			squares.forEach((q, i) => setTimeout(() => {
				q.style.opacity = 1;
			}, reduce ? 0 : i * per));
		});
	};

	// ===================================================== latency as the federation grows
	FIGS.scaling = function (host) {
		const N = [4, 8, 16, 32];
		const SER = [
			{ k: 'Oort', v: [377.8, 384.9, 379.5, 396.7], color: COL.baseDk, dash: '2 3' },
			{ k: 'FedAsync', v: [375.6, 384.6, 378.8, 390.3], color: COL.baseDk },
			{ k: 'FedBuff', v: [376.1, 377.4, 381.3, 379.9], color: COL.baseDk, dash: '7 4' },
			{ k: 'Cost-Gated PPO', v: [362.9, 365.3, 363.2, 365.7], color: COL.maroon, ours: true },
		];
		const s = svg(host, 600, 330, 'Latency per episode from 4 to 32 clients');
		const P = { x0: 66, x1: 440, y0: 16, y1: 268 };
		const sx = (i) => P.x0 + ((P.x1 - P.x0) * i) / 3;
		const sy = (v) => P.y1 - ((P.y1 - P.y0) * (v - 355)) / 45;
		[360, 370, 380, 390, 400].forEach((v) => {
			el('line', { x1: P.x0, x2: P.x1, y1: sy(v), y2: sy(v), class: 'fx__grid' }, s);
			el('text', { x: P.x0 - 10, y: sy(v) + 4, class: 'fx__tick', 'text-anchor': 'end' }, s, v);
		});
		N.forEach((n, i) => el('text', { x: sx(i), y: P.y1 + 22, class: 'fx__tick', 'text-anchor': 'middle' }, s, n));
		el('line', { x1: P.x0, x2: P.x1, y1: P.y1, y2: P.y1, class: 'fx__axis' }, s);
		el('text', { x: (P.x0 + P.x1) / 2, y: P.y1 + 48, class: 'fx__axislabel', 'text-anchor': 'middle' }, s, 'Clients');
		el('text', { class: 'fx__axislabel', 'text-anchor': 'middle', transform: `translate(18 ${(P.y0 + P.y1) / 2}) rotate(-90)` }, s, 'Latency per episode (s)');
		el('text', { x: P.x0, y: 326, class: 'fx__tick' }, s, 'Axis starts at 355 s.');
		const clip = el('rect', { x: 0, y: 0, height: 330, width: 0 }, el('clipPath', { id: 'sc-clip' }, el('defs', {}, s)));
		const g = el('g', { 'clip-path': 'url(#sc-clip)' }, s);
		SER.forEach((x) => {
			el('path', { d: x.v.map((v, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(v)}`).join(''), fill: 'none', stroke: x.color, 'stroke-width': x.ours ? 3 : 1.6, 'stroke-dasharray': x.dash || 'none' }, g);
			x.v.forEach((v, i) => {
				const c = el('circle', { cx: sx(i), cy: sy(v), r: x.ours ? 5.5 : 3.5, fill: x.color, stroke: '#fff', 'stroke-width': 1.5, class: 'sc__pt' }, g);
				c.addEventListener('mousemove', (e) => showTip(`<b>${x.k}</b>${N[i]} clients · ${v} s`, e));
				c.addEventListener('mouseleave', hideTip);
			});
			el('text', { x: sx(3) + 12, y: sy(x.v[3]) + 4, class: `sc__label${x.ours ? ' is-ours' : ''}` }, g, x.k);
		});
		const note = el('text', { x: (sx(0) + sx(3)) / 2, y: sy(359), class: 'sc__note', 'text-anchor': 'middle' }, s, '+0.8% from 4 → 32 clients');
		note.style.opacity = 0;
		once(host, async () => {
			await tween(1600, (e) => clip.setAttribute('width', 600 * e));
			note.style.opacity = 1;
		});
	};

	// ===================================================== build every [data-fx] on the page
	async function start() {
		const hosts = [...document.querySelectorAll('[data-fx]')];
		let curves = null;
		if (hosts.some((h) => h.dataset.fx === 'image-curves')) {
			curves = await fetch('fig/curves.json').then((r) => r.json()).catch(() => null);
		}
		hosts.forEach((h) => {
			const make = FIGS[h.dataset.fx];
			if (!make || (h.dataset.fx === 'image-curves' && !curves)) return;
			h.innerHTML = '';
			h.classList.add('fx', `fx--${h.dataset.fx}`);
			try {
				make(h, curves);
			} catch (err) {
				console.error(err);
			}
		});
	}
	start();
})();
