// Loco-manipulation showcase cards: each card's video plays only while it is on screen, and the chips
// under it switch clips (objects for Learn2Push, robots for the quadruped pushing paper).
(function () {
	'use strict';
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	document.querySelectorAll('[data-lm]').forEach((card) => {
		const video = card.querySelector('.lm-screen video');
		const picks = card.querySelectorAll('.lm-picks button');
		let visible = false;
		const load = (src, poster) => {
			if (poster) video.poster = poster;
			if (video.getAttribute('src') !== src) video.src = src;
			if (visible && !reduce) video.play().catch(() => {});
		};
		picks.forEach((b) => b.addEventListener('click', () => {
			picks.forEach((x) => x.classList.toggle('is-on', x === b));
			video.classList.add('is-switching');
			setTimeout(() => {
				load(b.dataset.src, b.dataset.poster);
				video.classList.remove('is-switching');
			}, reduce ? 0 : 250);
		}));
		new IntersectionObserver((entries) => {
			visible = entries[0].isIntersecting;
			if (visible) {
				if (!video.getAttribute('src')) load(video.dataset.src);
				else if (!reduce) video.play().catch(() => {});
			} else {
				video.pause();
			}
		}, { threshold: 0.35 }).observe(video);
		// for reduced motion, show controls so people can still start a clip themselves
		if (reduce) video.controls = true;
	});
})();
