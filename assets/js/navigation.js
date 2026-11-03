document.addEventListener('DOMContentLoaded', () => {
	const toggleButton = document.getElementById('scroll-nav-toggle');
	const navMenu = document.getElementById('scroll-nav-menu');
	const secondSection = document.getElementById('second');

	if (toggleButton && navMenu && secondSection) {
		// Initial state: hamburger icon
		toggleButton.textContent = '☰';

		// Show/hide button based on scroll
		window.addEventListener('scroll', () => {
		  const secondSectionTop = secondSection.getBoundingClientRect().top + window.scrollY;
		  
		  if (window.scrollY > secondSectionTop) {
			toggleButton.style.display = 'block';
		  } else {
			toggleButton.style.display = 'none';
			navMenu.style.display = 'none';
			// Reset to hamburger if user scrolls back up
			toggleButton.textContent = '☰';
			toggleButton.classList.remove('menu-opened');
		  }
		});

		// Toggle nav menu & toggle icon position
		toggleButton.addEventListener('click', () => {
		  const isMenuOpen = (navMenu.style.display === 'block');

		  if (isMenuOpen) {
			// Close
			navMenu.style.display = 'none';
			toggleButton.textContent = '☰';
			toggleButton.classList.remove('menu-opened');
		  } else {
			// Open
			navMenu.style.display = 'block';
			toggleButton.textContent = '☰';
			toggleButton.classList.add('menu-opened');
		  }
		});
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
  
