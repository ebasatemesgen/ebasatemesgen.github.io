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
  
