document.addEventListener('DOMContentLoaded', () => {
	const toggleButton = document.getElementById('scroll-nav-toggle');
	const navMenu = document.getElementById('scroll-nav-menu');
	const secondSection = document.getElementById('second');
	const firstSection = document.getElementById('first');
  
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
  });
  