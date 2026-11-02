// Publication timeline circles: each holds a slowly moving fluid; Human-Centered AI papers add a line
// icon for their subject. Clicking a circle sends out a pulse and opens the
// paper's core idea in plain words, spreading across the card from the circle.
(function () {
	'use strict';
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// 24x24 line icons, matched to each paper by a phrase in its title
	const ICONS = [
		['Learning to Sync', '<path d="M7 17V5"/><path d="M3.5 8.5 7 5l3.5 3.5"/><path d="M17 7v12"/><path d="M13.5 15.5 17 19l3.5-3.5"/>'],
		['Quadrupedal Pushing', '<rect x="14" y="6" width="7" height="12" rx="1"/><path d="M3 12h8"/><path d="M8 9l3 3-3 3"/>'],
		['Robotic Defender', '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7 8l3 3m4 0 3-3M7 16l3-3m4 0 3 3"/><rect x="10" y="10" width="4" height="4" rx="1"/>'],
		['Box-Pushing', '<rect x="3" y="12" width="7" height="7" rx="1"/><rect x="12" y="7" width="9" height="12" rx="1"/><path d="M3 5h5m-2-2 2 2-2 2"/>'],
		['Multi-agent Path Finding', '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="9" r="2"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6.6 6.4 17.3 8M5.4 7l1.2 10M8.9 19.4h7.2"/>'],
		['Autonomy and Dignity', '<path d="M3 15h3l4 2h4a1.5 1.5 0 0 0 0-3h-3"/><path d="M6 15v5H3"/><path d="M14.5 10.5 12 8a2 2 0 0 1 3-2.6 2 2 0 0 1 3 2.6z"/>'],
		['Ethical Robot Design', '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'],
		['African Healthcare', '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>'],
		['Emotion Recognition', '<path class="pub-icon__trace" d="M2 12h4l2-5 3 10 3-8 2 3h6"/>'],
	];

	const events = document.querySelectorAll('.timeline-renamed__event[data-idea]');

	events.forEach((ev, n) => {
		const icon = ev.querySelector('.timeline-renamed__event__icon');
		const card = ev.querySelector('.timeline-renamed__event__content');
		if (!icon || !card) return;
		const human = !!ev.closest('.hc-group');

		// the fluid ball, each circle out of phase with the others
		icon.insertAdjacentHTML('afterbegin', '<span class="pub-fluid" aria-hidden="true"><i></i><i></i><i></i></span>');
		icon.style.setProperty('--phase', `${-(n * 2.7) % 18}s`);
		// Human-Centered AI papers also get a line icon for their subject
		if (human) {
			const title = (ev.querySelector('.timeline-renamed__event__title') || {}).textContent || '';
			const match = ICONS.find(([key]) => title.includes(key));
			if (match) icon.insertAdjacentHTML('beforeend', `<svg class="pub-icon" viewBox="0 0 24 24" aria-hidden="true">${match[1]}</svg>`);
		}
		if (human) icon.classList.add('is-human');

		const idea = document.createElement('div');
		idea.className = 'pub-idea';
		idea.id = `pub-idea-${n}`;
		idea.hidden = true;
		idea.innerHTML = `<p class="pub-idea__kicker">In plain words</p><p class="pub-idea__text"></p><button type="button" class="pub-idea__close" aria-label="Close">×</button>`;
		idea.querySelector('.pub-idea__text').textContent = ev.dataset.idea;
		card.appendChild(idea);

		icon.setAttribute('role', 'button');
		icon.setAttribute('tabindex', '0');
		icon.setAttribute('aria-label', 'Show this paper in plain words');
		icon.setAttribute('aria-controls', idea.id);
		icon.setAttribute('aria-expanded', 'false');

		function pulse() {
			if (reduce) return;
			const beats = human ? [0, 260] : [0];
			beats.forEach((delay) => setTimeout(() => {
				const ring = document.createElement('span');
				ring.className = 'pub-ring';
				icon.appendChild(ring);
				ring.addEventListener('animationend', () => ring.remove());
			}, delay));
			icon.classList.remove('is-beat');
			void icon.offsetWidth;
			icon.classList.add('is-beat');
		}

		function toggle(open) {
			const show = open === undefined ? idea.hidden : open;
			if (show) {
				// the idea spreads out from the side of the card nearest the circle
				const ir = icon.getBoundingClientRect();
				const cr = card.getBoundingClientRect();
				const ox = Math.max(0, Math.min(cr.width, ir.left + ir.width / 2 - cr.left));
				const oy = Math.max(0, Math.min(cr.height, ir.top + ir.height / 2 - cr.top));
				idea.style.setProperty('--ox', `${ox}px`);
				idea.style.setProperty('--oy', `${oy}px`);
				idea.hidden = false;
				void idea.offsetWidth;
				idea.classList.add('is-open');
				pulse();
			} else {
				idea.classList.remove('is-open');
				setTimeout(() => {
					if (!idea.classList.contains('is-open')) idea.hidden = true;
				}, reduce ? 0 : 450);
			}
			icon.setAttribute('aria-expanded', String(show));
			ev.classList.toggle('is-revealed', show);
		}

		icon.addEventListener('click', () => toggle());
		icon.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggle();
			}
		});
		idea.querySelector('.pub-idea__close').addEventListener('click', () => toggle(false));
		idea.addEventListener('click', (e) => {
			if (!e.target.closest('a')) toggle(false);
		});
	});

	// Human-Centered AI: a faint thread from the heading through each paper's circle. It runs behind the
	// cards, so it only shows in the gaps, draws itself in once, then a soft light travels along it.
	const group = document.querySelector('.hc-group');
	if (group) {
		const NS = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('class', 'hc-thread');
		svg.setAttribute('aria-hidden', 'true');
		svg.innerHTML = '<defs><linearGradient id="hc-thread-grad" x1="0" y1="0" x2="0" y2="1">'
			+ '<stop offset="0" stop-color="#ed666f" stop-opacity="0"/><stop offset="0.08" stop-color="#ed666f"/>'
			+ '<stop offset="0.5" stop-color="#c9a7ff"/><stop offset="1" stop-color="#87bbfe"/></linearGradient></defs>'
			+ '<path class="hc-thread__line" pathLength="1"/><circle class="hc-thread__spark" r="3.5"/>';
		// appended last: the cards alternate sides by their position among the group's children
		group.append(svg);
		const line = svg.querySelector('.hc-thread__line');
		const spark = svg.querySelector('.hc-thread__spark');
		const head = group.querySelector('.hc-group__head');
		const icons = [...group.querySelectorAll('.timeline-renamed__event__icon')];
		let len = 0;

		function draw() {
			const g = group.getBoundingClientRect();
			svg.setAttribute('viewBox', `0 0 ${g.width} ${g.height}`);
			const hb = head.getBoundingClientRect();
			const pts = [[hb.left + hb.width / 2 - g.left, hb.bottom - g.top + 6]].concat(icons.map((ic) => {
				const r = ic.getBoundingClientRect();
				return [r.left + r.width / 2 - g.left, r.top + r.height / 2 - g.top];
			}));
			let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
			for (let i = 1; i < pts.length; i += 1) {
				const [x1, y1] = pts[i - 1];
				const [x2, y2] = pts[i];
				const my = (y1 + y2) / 2;
				d += ` C${x1.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
			}
			line.setAttribute('d', d);
			len = line.getTotalLength();
		}
		new ResizeObserver(draw).observe(group);
		draw();

		let drawn = false;
		new IntersectionObserver((entries) => {
			if (drawn || !entries[0].isIntersecting) return;
			drawn = true;
			group.classList.add('is-threaded');
			if (reduce) return;
			// after the line has drawn in, a light drifts down it every few seconds
			let t0 = null;
			const travel = (now) => {
				if (t0 === null) t0 = now;
				const f = ((now - t0) % 9000) / 6000;
				if (f <= 1 && len) {
					const p = line.getPointAtLength(f * len);
					spark.setAttribute('cx', p.x);
					spark.setAttribute('cy', p.y);
					spark.style.opacity = Math.sin(f * Math.PI).toFixed(2);
				} else {
					spark.style.opacity = 0;
				}
				requestAnimationFrame(travel);
			};
			setTimeout(() => requestAnimationFrame(travel), 2600);
		}, { threshold: 0.15 }).observe(group);
	}
})();
