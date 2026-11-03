(() => {
	const universityLogo = 'images/Bio/University_of_Minnesota_Logo.svg.png';
	const nasaLogo = 'images/logos/nasa.svg';
	const fauLogo = 'images/logos/fau.svg';
	const kbrLogo = 'images/logos/kbr.svg';
	const blueOriginLogo = 'images/logos/blue-origin.svg';
	const university = { name: 'University of Minnesota', logo: universityLogo, href: 'https://twin-cities.umn.edu/' };
	const michigan = { name: 'University of Michigan · Postdoctoral Research Scholar', logo: 'images/logos/university-of-michigan-m.svg', href: 'https://scholar.google.com/citations?view_op=view_org&hl=en&org=4770128543809686866', logoClass: 'author-hover-card__affiliation-logo--michigan' };
	const nasa = { name: 'NASA', logo: nasaLogo, href: 'https://www.nasa.gov/' };
	const profiles = {
		'sarah-boelter': {
			name: 'Sarah Boelter',
			href: 'https://seboelter.github.io/',
			photo: 'images/authors/sarah-boelter.webp',
			initials: 'SB',
			affiliations: [
				university,
				nasa
			]
		},
		'ebasa-temesgen': {
			name: 'Ebasa Temesgen',
			href: 'https://ebasatemesgen.github.io/',
			photo: 'images/authors/ebasa-temesgen.webp',
			initials: 'ET',
			affiliations: [university]
		},
		'greta-brown': {
			name: 'Greta Brown',
			href: 'https://gretab5802.github.io/',
			photo: 'images/authors/greta-brown.webp',
			initials: 'GB',
			affiliations: [university]
		},
		'mario-jerez': {
			name: 'Mario Jerez',
			href: 'https://mariojerez.github.io/',
			photo: 'images/authors/mario-jerez.webp',
			initials: 'MJ',
			affiliations: [university]
		},
		'elsa-forberger': {
			name: 'Elsa Forberger',
			href: 'https://eforberger.github.io/',
			photo: 'images/authors/elsa-forberger.webp',
			initials: 'EF',
			affiliations: [university]
		},
		'lucas-weber': {
			name: 'Lucas Weber',
			href: 'https://scholar.google.com/citations?user=BVzzVA0AAAAJ&hl=en',
			photo: 'images/authors/lucas-weber.webp?v=fau-profile',
			initials: 'LW',
			affiliations: [{ name: 'FAU Erlangen-Nürnberg', logo: fauLogo, href: 'https://www.cs6.tf.fau.de/faudir/lucas-weber/' }]
		},
		'thomas-stucky': {
			name: 'Thomas Stucky',
			href: 'https://astrostucky.com/pages/about-me.html',
			photo: 'images/authors/thomas-stucky.webp',
			initials: 'TS',
			affiliations: [{ name: 'KBR', logo: kbrLogo, href: 'https://www.kbr.com/' }]
		},
		'brian-glass': {
			name: 'Brian Glass',
			href: 'https://science.nasa.gov/astrobiology/strategy/dares/nasa-dares-task-force-2-page-2/#hds-sidebar-nav-14',
			photo: 'images/authors/brian-glass.webp',
			initials: 'BG',
			affiliations: [{ name: 'NASA Ames Research Center', logo: nasaLogo, href: 'https://www.nasa.gov/ames/' }]
		},
		'rene-mai': {
			name: 'Rene Mai',
			href: 'https://relisemai.github.io/',
			photo: 'images/authors/rene-mai.webp',
			initials: 'RM',
			affiliations: [michigan]
		},
		'dean-bergman': {
			name: 'Dean Bergman',
			href: 'https://www.linkedin.com/in/deanbergman1/',
			photo: 'images/authors/dean-bergman.webp',
			initials: 'DB',
			affiliations: [{ name: 'Blue Origin', logo: blueOriginLogo, href: 'https://www.blueorigin.com/', hideName: true }]
		},
		'carter-fortuin': {
			name: 'Carter Fortuin',
			href: 'https://scholar.google.com/scholar?q=Carter+Fortuin+Blue+Origin',
			initials: 'CF',
			affiliations: [{ name: 'Blue Origin', logo: blueOriginLogo, href: 'https://www.blueorigin.com/', hideName: true }]
		},
		'marybeth-wilhelm': {
			name: 'Marybeth Wilhelm',
			href: 'https://www.nasa.gov/people/mary-beth-wilhelm/',
			photo: 'images/authors/marybeth-wilhelm.webp',
			initials: 'MW',
			affiliations: [{ name: 'NASA Ames Research Center', logo: nasaLogo, href: 'https://www.nasa.gov/ames/' }]
		},
		'minghao-zou': {
			name: 'Minghao Zou',
			href: 'https://scholar.google.com/scholar?q=Minghao+Zou+University+of+Minnesota',
			initials: 'MZ',
			affiliations: [university]
		},
		'xun-tu': {
			name: 'Xun Tu',
			href: 'https://scholar.google.com/citations?user=FgQyXToAAAAJ&hl=en&oi=ao',
			photo: 'images/authors/xun-tu.webp',
			initials: 'XT',
			affiliations: [university]
		},
		'karthik-desingh': {
			name: 'Karthik Desingh',
			href: 'https://karthikdesingh.com/',
			photo: 'images/authors/karthik-desingh.webp',
			initials: 'KD',
			affiliations: [university]
		},
		'dhyan-thakkar': {
			name: 'Dhyan Thakkar',
			href: 'https://thdhyan.github.io/',
			photo: 'images/authors/dhyan-thakkar.webp',
			initials: 'DT',
			affiliations: [university]
		},
		'maria-gini': {
			name: 'Maria Gini',
			href: 'https://cse.umn.edu/cs/maria-gini',
			photo: 'images/authors/maria-gini.webp',
			initials: 'MG',
			affiliations: [university]
		},
		// institutions named in the bio: their logo in place of a portrait
		umn: {
			name: 'University of Minnesota',
			href: 'https://twin-cities.umn.edu/',
			photo: universityLogo,
			logo: true,
			initials: 'UMN',
			affiliations: [{ name: 'Department of Computer Science & Engineering', href: 'https://cse.umn.edu/cs' }]
		},
		aait: {
			name: 'Addis Ababa Institute of Technology',
			href: 'https://aait.aau.edu.et/',
			photo: 'images/Bio/Addis_Ababa_University_logo.png',
			logo: true,
			initials: 'AAiT',
			affiliations: [{ name: 'School of Electrical & Computer Engineering', href: 'https://aait.aau.edu.et/' }]
		}
	};
	// Publication authors, and the people and places named in the bio (those open sooner).
	const triggers = document.querySelectorAll('.pub-card__authors [data-author], .about-text [data-author]');
	if (!triggers.length) {
		return;
	}

	Object.values(profiles).forEach(({ photo }) => {
		if (photo) {
			const preloadedPhoto = new Image();
			preloadedPhoto.src = photo;
		}
	});

	const card = document.createElement('div');
	card.className = 'author-hover-card';
	card.id = 'publication-author-profile';
	card.setAttribute('role', 'dialog');
	card.hidden = true;
	document.body.appendChild(card);

	let activeTrigger = null;
	let openTimer = null;
	let closeTimer = null;

	const clearTimer = (timer) => {
		if (timer !== null) {
			window.clearTimeout(timer);
		}
	};

	const closeCard = () => {
		clearTimer(openTimer);
		clearTimer(closeTimer);
		openTimer = null;
		closeTimer = null;
		if (activeTrigger) {
			activeTrigger.setAttribute('aria-expanded', 'false');
		}
		activeTrigger = null;
		card.hidden = true;
		card.replaceChildren();
	};

	const scheduleClose = () => {
		clearTimer(closeTimer);
		closeTimer = window.setTimeout(() => {
			if (activeTrigger?.matches(':hover, :focus') || card.matches(':hover, :focus-within')) {
				return;
			}
			closeCard();
		}, 180);
	};

	const addAffiliation = (container, affiliation) => {
		const item = document.createElement('a');
		item.className = 'author-hover-card__affiliation';
		item.href = affiliation.href;
		item.target = '_blank';
		item.rel = 'noopener noreferrer';
		item.setAttribute('aria-label', affiliation.name);

		if (affiliation.logo) {
			const logo = document.createElement('img');
			logo.src = affiliation.logo;
			logo.alt = '';
			logo.loading = 'eager';
			if (affiliation.logoClass) {
				logo.className = affiliation.logoClass;
			}
			item.appendChild(logo);
		} else if (affiliation.mark) {
			const mark = document.createElement('span');
			mark.className = 'author-hover-card__mark';
			mark.textContent = affiliation.mark;
			mark.setAttribute('aria-hidden', 'true');
			item.appendChild(mark);
		}

		if (!affiliation.hideName) {
			const name = document.createElement('span');
			name.textContent = affiliation.name;
			item.appendChild(name);
		}
		container.appendChild(item);
	};

	const showCard = (trigger, profile) => {
		if (activeTrigger !== trigger) {
			return;
		}

		card.setAttribute('aria-label', `${profile.name} profile`);

		const portrait = document.createElement('a');
		portrait.className = 'author-hover-card__portrait';
		portrait.href = profile.href;
		portrait.target = '_blank';
		portrait.rel = 'noopener noreferrer';
		portrait.setAttribute('aria-label', `View ${profile.name}'s profile`);
		portrait.textContent = profile.initials;
		if (profile.logo) {
			portrait.classList.add('author-hover-card__portrait--logo');
		}

		if (profile.photo) {
			const image = document.createElement('img');
			image.src = profile.photo;
			image.alt = '';
			image.loading = 'eager';
			image.addEventListener('error', () => {
				image.remove();
				portrait.classList.add('author-hover-card__portrait--placeholder');
			}, { once: true });
			portrait.appendChild(image);
		} else {
			portrait.classList.add('author-hover-card__portrait--placeholder');
		}

		const details = document.createElement('span');
		details.className = 'author-hover-card__details';
		const nameLink = document.createElement('a');
		nameLink.className = 'author-hover-card__profile-link';
		nameLink.href = profile.href;
		nameLink.target = '_blank';
		nameLink.rel = 'noopener noreferrer';
		const name = document.createElement('strong');
		name.className = 'author-hover-card__name';
		name.textContent = profile.name;
		nameLink.appendChild(name);
		details.appendChild(nameLink);

		const affiliations = document.createElement('span');
		affiliations.className = 'author-hover-card__affiliations';
		profile.affiliations.forEach((affiliation) => addAffiliation(affiliations, affiliation));
		details.appendChild(affiliations);

		card.replaceChildren(portrait, details);
		card.hidden = false;
		trigger.setAttribute('aria-controls', card.id);
		trigger.setAttribute('aria-haspopup', 'dialog');
		trigger.setAttribute('aria-expanded', 'true');

		const triggerBounds = trigger.getBoundingClientRect();
		const cardBounds = card.getBoundingClientRect();
		const left = Math.max(12, Math.min(
			triggerBounds.left + (triggerBounds.width - cardBounds.width) / 2,
			window.innerWidth - cardBounds.width - 12
		));
		const top = triggerBounds.bottom + cardBounds.height + 12 <= window.innerHeight
			? triggerBounds.bottom + 8
			: Math.max(12, triggerBounds.top - cardBounds.height - 8);

		card.style.left = `${left}px`;
		card.style.top = `${top}px`;
	};

	const scheduleOpen = (trigger) => {
		const profile = profiles[trigger.dataset.author];
		if (!profile) {
			return;
		}
		if (activeTrigger === trigger && !card.hidden) {
			return;
		}

		closeCard();
		activeTrigger = trigger;
		openTimer = window.setTimeout(() => {
			openTimer = null;
			showCard(trigger, profile);
		}, trigger.closest('.about-text') ? 450 : 2000);
	};

	triggers.forEach((trigger) => {
		if (trigger.tagName !== 'A') {
			trigger.tabIndex = 0;
		}
		trigger.setAttribute('aria-controls', card.id);
		trigger.setAttribute('aria-haspopup', 'dialog');
		trigger.setAttribute('aria-expanded', 'false');
		trigger.addEventListener('pointerenter', () => scheduleOpen(trigger));
		trigger.addEventListener('pointerleave', scheduleClose);
		trigger.addEventListener('focus', () => scheduleOpen(trigger));
		trigger.addEventListener('blur', scheduleClose);
		trigger.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowDown' && activeTrigger === trigger && !card.hidden) {
				card.querySelector('a')?.focus();
				event.preventDefault();
			}
		});
	});

	card.addEventListener('pointerenter', () => clearTimer(closeTimer));
	card.addEventListener('pointerleave', scheduleClose);
	card.addEventListener('focusin', () => clearTimer(closeTimer));
	card.addEventListener('focusout', scheduleClose);
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !card.hidden) {
			closeCard();
		}
	});
	window.addEventListener('scroll', () => {
		if (!card.hidden) {
			closeCard();
		}
	}, { passive: true });
	window.addEventListener('resize', closeCard);
})();
