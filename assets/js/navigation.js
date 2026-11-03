document.addEventListener('DOMContentLoaded', () => {
	// Section navigation: the button shows once the bio has scrolled by; it opens the menu (Esc, a click outside,
	// or choosing a link closes it), and the section being read is marked in the menu.
	const toggleButton = document.getElementById('scroll-nav-toggle');
	const navMenu = document.getElementById('scroll-nav-menu');
	const secondSection = document.getElementById('second');

	if (toggleButton && navMenu && secondSection) {
		const setOpen = (open) => {
			navMenu.classList.toggle('is-open', open);
			toggleButton.classList.toggle('is-open', open);
			toggleButton.setAttribute('aria-expanded', String(open));
			toggleButton.setAttribute('aria-label', open ? 'Close the section menu' : 'Open the section menu');
		};
		const onScroll = () => {
			const shown = window.scrollY > secondSection.offsetTop;
			toggleButton.classList.toggle('is-shown', shown);
			if (!shown) {
				setOpen(false);
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		toggleButton.addEventListener('click', () => setOpen(!navMenu.classList.contains('is-open')));
		navMenu.addEventListener('click', (event) => {
			if (event.target.closest('a')) {
				setOpen(false);
			}
		});
		document.addEventListener('click', (event) => {
			if (navMenu.classList.contains('is-open') && !navMenu.contains(event.target) && !toggleButton.contains(event.target)) {
				setOpen(false);
			}
		});
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && navMenu.classList.contains('is-open')) {
				setOpen(false);
				toggleButton.focus();
			}
		});

		// the section in the middle of the screen is the one being read
		const links = Array.from(navMenu.querySelectorAll('ul a[href^="#"]'));
		const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
		const spy = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) {
					return;
				}
				links.forEach((link) => link.classList.toggle('is-current', link.getAttribute('href') === `#${entry.target.id}`));
			});
		}, { rootMargin: '-45% 0px -50% 0px' });
		sections.forEach((section) => spy.observe(section));
	}

	document.querySelectorAll('.pub-chain').forEach((chain) => {
		const tabs = Array.from(chain.querySelectorAll('.pub-chain__tab'));
		const panels = chain.querySelectorAll('.pub-chain__panel');

		const selectTab = (tab) => {
			tabs.forEach((other) => {
				const isActive = other === tab;
				other.classList.toggle('is-active', isActive);
				other.setAttribute('aria-selected', String(isActive));
				other.tabIndex = isActive ? 0 : -1;
			});

			panels.forEach((panel) => {
				const isActive = panel.id === tab.getAttribute('aria-controls');
				panel.classList.toggle('is-active', isActive);
				if (!isActive) {
					panel.querySelectorAll('video').forEach((video) => video.pause());
				}
			});
		};

		// the first time the group comes into view, a soft pulse runs down the timeline's dots once,
		// so it is clear the card holds more papers than the one showing
		tabs.forEach((tab, index) => tab.style.setProperty('--i', index));
		if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			const hint = new IntersectionObserver((entries) => {
				if (!entries[0].isIntersecting) return;
				hint.disconnect();
				setTimeout(() => chain.classList.add('is-hinting'), 700);
			}, { threshold: 0.45 });
			hint.observe(chain);
		}

		tabs.forEach((tab, index) => {
			tab.addEventListener('click', () => selectTab(tab));

			tab.addEventListener('keydown', (event) => {
				const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
				if (!step) {
					return;
				}
				event.preventDefault();
				const next = tabs[(index + step + tabs.length) % tabs.length];
				next.focus();
				selectTab(next);
			});
		});
	});

	document.querySelectorAll('.pub-more-toggle').forEach((moreToggle) => {
		const morePanel = document.getElementById(moreToggle.getAttribute('aria-controls'));
		const moreLabel = moreToggle.querySelector('.pub-more-toggle__label');
		if (!morePanel) {
			return;
		}

		moreToggle.addEventListener('click', () => {
			const isExpanded = morePanel.hidden;
			morePanel.hidden = !isExpanded;
			moreToggle.setAttribute('aria-expanded', String(isExpanded));

			if (moreLabel) {
				moreLabel.textContent = isExpanded ? 'Show less' : 'Learn more';
			}
		});
	});

	const experienceTimeline = document.querySelector('#experience .timeline');
	const experienceToggle = document.getElementById('experience-toggle');
	const experienceLabel = experienceToggle ? experienceToggle.querySelector('.experience-toggle__label') : null;

	if (experienceTimeline && experienceToggle) {
		const hiddenRows = experienceTimeline.querySelectorAll('.experience-extra');
		if (!hiddenRows.length) {
			experienceToggle.style.display = 'none';
			return;
		}

		experienceToggle.addEventListener('click', () => {
			const isExpanded = experienceTimeline.classList.toggle('timeline-expanded');
			experienceToggle.setAttribute('aria-expanded', String(isExpanded));

			if (experienceLabel) {
				experienceLabel.textContent = isExpanded ? 'Show less' : 'See more';
			}
		});
	}

  });
  
