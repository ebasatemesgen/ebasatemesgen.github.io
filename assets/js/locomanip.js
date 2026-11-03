// Loco-manipulation showcase cards: one clip at a time on the card's screen, chosen with the selector under it or
// the ‹ › arrows on it (they wrap around). A choice marked data-three="<scene>" shows that scene's 3D replay
// (spot-scene.js) instead of its video; the video stays as the fallback where 3D is unavailable. Videos play only
// while the card is on screen.
(function () {
	'use strict';
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	document.querySelectorAll('[data-lm]').forEach((card) => {
		const screen = card.querySelector('.lm-screen');
		const video = screen.querySelector('video');
		const layers = screen.querySelectorAll('.lm-3d');
		const picks = Array.from(card.querySelectorAll('.lm-picks button'));
		let visible = false;
		// spot-scene.js marks <html> when it can draw 3D
		const can3d = () => document.documentElement.classList.contains('has-spot3d');
		const in3d = () => card.classList.contains('is-3d') && can3d();
		const load = (src, poster) => {
			if (poster) video.poster = poster;
			if (in3d()) {
				video.pause();
				return;
			}
			if (video.getAttribute('src') !== src) video.src = src;
			if (visible && !reduce) video.play().catch(() => {});
		};
		const show3d = (b) => {
			card.classList.toggle('is-3d', !!b.dataset.three);
			layers.forEach((l) => l.classList.toggle('is-active', l.dataset.spot === b.dataset.three));
		};
		const select = (b) => {
			picks.forEach((x) => {
				x.classList.toggle('is-on', x === b);
				x.setAttribute('aria-pressed', String(x === b));
			});
			screen.classList.add('is-switching');
			setTimeout(() => {
				show3d(b);
				load(b.dataset.src, b.dataset.poster);
				screen.classList.remove('is-switching');
			}, reduce ? 0 : 250);
		};
		picks.forEach((b) => {
			b.setAttribute('aria-pressed', String(b.classList.contains('is-on')));
			b.addEventListener('click', () => select(b));
		});
		show3d(picks.find((b) => b.classList.contains('is-on')) || picks[0]);

		// ‹ › on the screen step through the same choices
		if (picks.length > 1) {
			const step = (d) => {
				const i = picks.findIndex((b) => b.classList.contains('is-on'));
				select(picks[(i + d + picks.length) % picks.length]);
			};
			[['prev', -1, 'Previous clip', '‹'], ['next', 1, 'Next clip', '›']].forEach(([cls, d, label, glyph]) => {
				const a = document.createElement('button');
				a.type = 'button';
				a.className = `lm-arrow lm-arrow--${cls}`;
				a.setAttribute('aria-label', label);
				a.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
				a.addEventListener('click', () => step(d));
				screen.append(a);
			});
		}

		new IntersectionObserver((entries) => {
			visible = entries[0].isIntersecting;
			if (visible) {
				if (!video.getAttribute('src')) load(video.dataset.src);
				else if (!in3d() && !reduce) video.play().catch(() => {});
			} else {
				video.pause();
			}
		}, { threshold: 0.35 }).observe(video);
		// for reduced motion, show controls so people can still start a clip themselves
		if (reduce) video.controls = true;
	});
})();
