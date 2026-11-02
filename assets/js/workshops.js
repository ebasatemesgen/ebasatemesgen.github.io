// Workshop Organization: both workshops are shown, one card under the other. The timeline beside them
// marks today, each workshop gets a live status (in N days, today, held), a date on the timeline brings
// its card into view, and the date of the card on screen is highlighted.
(function () {
	'use strict';
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const DAY = 864e5;

	// calendar dates only, so the count does not depend on the hour or the viewer's time zone
	const day = (iso) => {
		const [y, m, d] = iso.split('-').map(Number);
		return Date.UTC(y, m - 1, d);
	};
	const now = new Date();
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

	const panels = Array.from(document.querySelectorAll('.ws-panel[data-start]'));
	panels.forEach((panel) => {
		const status = panel.querySelector('[data-ws-status]');
		const left = Math.round((day(panel.dataset.start) - today) / DAY);
		const when = new Date(day(panel.dataset.start)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
		if (left < 0) {
			status.textContent = `Held ${when}`;
			panel.classList.add('is-past');
		} else {
			status.textContent = left === 0 ? `Today · ${panel.dataset.hours}` : left === 1 ? 'Tomorrow' : `In ${left} days`;
			panel.classList.add('is-soon');
		}
	});

	const strip = document.querySelector('[data-ws-year]');
	if (!strip) return;
	const from = day(strip.dataset.from);
	const to = day(strip.dataset.to);
	const at = (today - from) / (to - from);
	if (at >= 0 && at <= 1) {
		const mark = strip.querySelector('.ws-year__today');
		mark.style.setProperty('--at', `${(at * 100).toFixed(1)}%`);
		mark.hidden = false;
		strip.style.setProperty('--done', `${(at * 100).toFixed(1)}%`);
	}

	const stops = Array.from(strip.querySelectorAll('.ws-year__stop'));
	const cardOf = (stop) => document.getElementById(stop.dataset.target);

	stops.forEach((stop) => {
		const card = cardOf(stop);
		if (card.classList.contains('is-soon')) stop.classList.add('is-soon');
		stop.addEventListener('click', () => {
			card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
			card.classList.remove('is-flash');
			void card.offsetWidth;
			card.classList.add('is-flash');
		});
	});

	// highlight the date of whichever card fills more of the screen
	const seen = new Map();
	const watch = new IntersectionObserver((entries) => {
		entries.forEach((e) => seen.set(e.target, e.intersectionRatio));
		let best = null;
		stops.forEach((stop) => {
			const r = seen.get(cardOf(stop)) || 0;
			if (r > 0 && (!best || r > (seen.get(cardOf(best)) || 0))) best = stop;
		});
		stops.forEach((stop) => stop.classList.toggle('is-active', stop === best));
	}, { threshold: [0, 0.25, 0.5, 0.75, 1] });
	stops.forEach((stop) => watch.observe(cardOf(stop)));
})();
