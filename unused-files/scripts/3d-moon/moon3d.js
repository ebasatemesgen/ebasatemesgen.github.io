import * as THREE from './three.module.min.js';

document.addEventListener('DOMContentLoaded', () => {
	const moonMount = document.getElementById('moon-3d');
	const moonFallback = document.getElementById('moon-fallback');

	if (!moonMount) {
		return;
	}

	let renderer = null;
	let camera = null;
	let resizeObserver = null;
	let animationFrameId = null;
	let isAnimating = false;

	const showFallback = () => {
		isAnimating = false;
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
		if (renderer) {
			renderer.dispose();
		}
		moonMount.innerHTML = '';
		moonMount.classList.add('is-hidden');
		if (moonFallback) {
			moonFallback.classList.add('is-visible');
		}
	};

	try {
		renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
			powerPreference: 'high-performance',
		});
	} catch (err) {
		showFallback();
		return;
	}

	const scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
	camera.position.set(0, 0, 3.25);

	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setClearColor(0x000000, 0);
	moonMount.appendChild(renderer.domElement);

	const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	const keyLight = new THREE.DirectionalLight(0xffffff, 1.12);
	keyLight.position.set(3, 1.5, 2.6);
	const rimLight = new THREE.DirectionalLight(0x6f82ff, 0.3);
	rimLight.position.set(-2.4, -1.4, -2.2);
	scene.add(ambientLight, keyLight, rimLight);

	const moonMaterial = new THREE.MeshStandardMaterial({
		color: 0xf0f1f3,
		roughness: 0.97,
		metalness: 0,
	});
	const moonGeometry = new THREE.SphereGeometry(1.95, 128, 128);
	const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
	moonMesh.rotation.z = THREE.MathUtils.degToRad(6.5);
	scene.add(moonMesh);

	const textureLoader = new THREE.TextureLoader();
	textureLoader.load(
		'images/experience/moon-texture.jpg',
		(texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
			moonMaterial.map = texture;
			moonMaterial.bumpMap = texture;
			moonMaterial.bumpScale = 0.03;
			moonMaterial.needsUpdate = true;
		},
		undefined,
		() => {
			showFallback();
		}
	);

	const resize = () => {
		const width = Math.max(2, Math.floor(moonMount.clientWidth));
		const height = Math.max(2, Math.floor(moonMount.clientHeight));
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height, false);
	};

	resize();

	if (window.ResizeObserver) {
		resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(moonMount);
	} else {
		window.addEventListener('resize', resize);
	}

	const clock = new THREE.Clock();
	// Full rotation is intentionally slow (~44 minutes) to keep motion subtle.
	const angularSpeed = 0.0024;

	const renderLoop = () => {
		if (!isAnimating) {
			return;
		}
		animationFrameId = requestAnimationFrame(renderLoop);
		const delta = Math.min(clock.getDelta(), 0.05);
		moonMesh.rotation.y += delta * angularSpeed;
		renderer.render(scene, camera);
	};

	const start = () => {
		if (isAnimating) {
			return;
		}
		isAnimating = true;
		clock.getDelta();
		renderLoop();
	};

	const stop = () => {
		isAnimating = false;
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	};

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			stop();
		} else {
			start();
		}
	});

	start();
});
