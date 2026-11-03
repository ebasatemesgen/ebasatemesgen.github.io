// Robots pushing objects, replayed in 3D from recorded Isaac Lab rollouts of the learned policies: meshes and link
// poses come from the simulator (assets/spot/), so the motion is the policies' own and nothing is animated by hand.
// Each [data-spot] element lists one scene, or several to play in turn (the next one loads while the current plays):
//   spot-quad, anymal-quad, go1-quad      the quadruped pushing paper's robots (Codex's recorded rollouts)
//   learn2push-chair, l2p-tall-box,       Spot with an arm (Learn2Push): a chair, and boxes beyond the training range
//   l2p-slippery-box
// data-theme="dark" draws the Learn2Push film's black starry floor, otherwise a white studio; data-zoom scales the
// framing; an element with .spot3d__title inside gets each scene's title. Drag sideways to turn the view,
// double-click to replay. Three.js and the data load only after the page has loaded and the view is near the
// screen; the fallback (still image or video) stays if WebGL or gzip streams are unavailable, and a view renders
// only while it is on screen.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOk() {
	try {
		const c = document.createElement('canvas');
		return !!(c.getContext('webgl2') || c.getContext('webgl'));
	} catch (e) {
		return false;
	}
}

// the film's floor: dark, with small white crosses on a grid
function crossTexture(THREE) {
	const c = document.createElement('canvas');
	c.width = c.height = 128;
	const g = c.getContext('2d');
	g.fillStyle = '#141416';
	g.fillRect(0, 0, 128, 128);
	g.strokeStyle = 'rgba(255,255,255,0.85)';
	g.lineWidth = 3;
	g.beginPath();
	g.moveTo(54, 64);
	g.lineTo(74, 64);
	g.moveTo(64, 54);
	g.lineTo(64, 74);
	g.stroke();
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
}

// one recorded scene: its robot, object and goal under one root, and a function that poses them at time t
async function loadShow(THREE, name, dark) {
	const [meta, bin] = await Promise.all([
		fetch(`assets/spot/${name}.json`).then((r) => r.json()),
		fetch(`assets/spot/${name}.bin.gz`).then((r) => new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()),
	]);
	const root = new THREE.Group();

	// geometry: int16 positions in each link's (or the object's) own frame; colours either per vertex (sRGB bytes) or
	// per index group; normals exported from the full-detail mesh when present
	const mats = new Map();
	const material = (color) => {
		if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 }));
		return mats.get(color);
	};
	const painted = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05 });
	const geoms = meta.geoms.map((g) => {
		const q = new Int16Array(bin, g.pos, g.vcount * 3);
		const pos = new Float32Array(q.length);
		for (let i = 0; i < q.length; i += 1) pos[i] = q[i] * g.scale;
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		const Index = g.wide ? Uint32Array : Uint16Array;
		geo.setIndex(new THREE.BufferAttribute(new Index(bin, g.idx, g.icount), 1));
		if (g.nrm !== undefined) geo.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(bin, g.nrm, g.vcount * 3), 3, true));
		else geo.computeVertexNormals();
		if (g.col !== undefined) {
			const c8 = new Uint8Array(bin, g.col, g.vcount * 3);
			const c = new Float32Array(c8.length);
			const tmp = new THREE.Color();
			for (let i = 0; i < c8.length; i += 3) {
				tmp.setRGB(c8[i] / 255, c8[i + 1] / 255, c8[i + 2] / 255, THREE.SRGBColorSpace);
				c[i] = tmp.r;
				c[i + 1] = tmp.g;
				c[i + 2] = tmp.b;
			}
			geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
			return { geo, mats: painted };
		}
		g.groups.forEach((gr, k) => geo.addGroup(gr.start, gr.count, k));
		return { geo, mats: g.groups.map((gr) => material(gr.color)) };
	});
	const M = meta.motion;
	const nodes = Array.from({ length: M.bodies }, () => {
		const node = new THREE.Object3D();
		root.add(node);
		return node;
	});
	meta.meshes.forEach((mm) => {
		const mesh = new THREE.Mesh(geoms[mm.geom].geo, geoms[mm.geom].mats);
		mesh.castShadow = true;
		nodes[mm.link].add(mesh);
	});

	// the pushed object (the last body), and its goal pose as a translucent green copy
	const goalMat = new THREE.MeshStandardMaterial({
		color: 0x5fc48a,
		emissive: dark ? 0x1d5a37 : 0x000000,
		transparent: true,
		opacity: dark ? 0.5 : 0.32,
		// a mesh goal (the chair) overlaps itself; writing depth keeps its see-through surface from shimmering
		depthWrite: meta.object.shape === 'mesh',
	});
	const goal = new THREE.Object3D();
	if (meta.object.shape === 'cylinder' || meta.object.shape === 'cuboid') {
		let shape;
		if (meta.object.shape === 'cuboid') {
			shape = new THREE.BoxGeometry(...meta.object.size);
		} else {
			shape = new THREE.CylinderGeometry(meta.object.radius, meta.object.radius, meta.object.height, 64);
			shape.rotateX(Math.PI / 2);
		}
		// the films' glazed objects, a little lighter than their base colour to read under these lights
		const color = new THREE.Color(meta.object.color || '#4f9fc2').offsetHSL(0, 0, 0.12);
		const obj = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.05 }));
		obj.castShadow = true;
		nodes[M.bodies - 1].add(obj);
		goal.add(new THREE.Mesh(shape, goalMat));
	} else {
		nodes[M.bodies - 1].children.forEach((m) => goal.add(new THREE.Mesh(m.geometry, goalMat)));
	}
	goal.position.fromArray(meta.goal.pos);
	const [gw, gx, gy, gz] = meta.goal.quat;
	goal.quaternion.set(gx, gy, gz, gw);
	root.add(goal);

	// recorded poses, 25 fps: int16 positions (scaled) and int16 wxyz quaternions
	const P = new Int16Array(bin, M.pos, M.frames * M.bodies * 3);
	const Q = new Int16Array(bin, M.quat, M.frames * M.bodies * 4);
	const qa = new THREE.Quaternion();
	const qb = new THREE.Quaternion();
	function pose(t) {
		const f = Math.min(t * M.fps, M.frames - 1);
		const i = Math.floor(f);
		const j = Math.min(i + 1, M.frames - 1);
		const a = f - i;
		for (let b = 0; b < M.bodies; b += 1) {
			const pi = (i * M.bodies + b) * 3;
			const pj = (j * M.bodies + b) * 3;
			nodes[b].position.set(
				(P[pi] + (P[pj] - P[pi]) * a) * M.pscale,
				(P[pi + 1] + (P[pj + 1] - P[pi + 1]) * a) * M.pscale,
				(P[pi + 2] + (P[pj + 2] - P[pi + 2]) * a) * M.pscale,
			);
			const qi = (i * M.bodies + b) * 4;
			const qj = (j * M.bodies + b) * 4;
			qa.set(Q[qi + 1], Q[qi + 2], Q[qi + 3], Q[qi]).normalize();
			qb.set(Q[qj + 1], Q[qj + 2], Q[qj + 3], Q[qj]).normalize();
			nodes[b].quaternion.slerpQuaternions(qa, qb, a);
		}
	}

	// the camera looks across the push so the object travels toward the left of the view, framed by the push's span
	const start = new THREE.Vector3().fromArray(meta.start);
	const goalAt = new THREE.Vector3().fromArray(meta.goal.pos);
	const dir = goalAt.clone().sub(start).setZ(0).normalize();
	const span = goalAt.clone().setZ(0).length();
	return {
		root,
		pose,
		title: meta.title || '',
		dur: (M.frames - 1) / M.fps,
		baseAz: Math.atan2(-dir.x, dir.y) - Math.PI / 2,
		reach: Math.max(2.4, 1.3 * span + 0.9),
	};
}

async function build(host) {
	const THREE = await import('three');
	const names = host.dataset.spot.split(/\s+/).filter(Boolean);
	const dark = host.dataset.theme === 'dark';
	const zoom = Number(host.dataset.zoom || 1);
	const titleEl = host.querySelector('.spot3d__title');

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !dark });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
	renderer.setClearColor(dark ? 0x050506 : 0x000000, dark ? 1 : 0);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	const canvas = renderer.domElement;
	canvas.className = 'spot3d__canvas';
	canvas.setAttribute('aria-hidden', 'true');

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
	camera.up.set(0, 0, 1);

	let ground;
	if (dark) {
		// a pool of light on the dark floor, fading to black, as in the film
		scene.fog = new THREE.Fog(0x050506, 7, 15);
		scene.add(new THREE.HemisphereLight(0xffffff, 0x111114, 0.22));
		const spot = new THREE.SpotLight(0xffffff, 90, 0, Math.PI / 5, 0.7, 1.6);
		spot.position.set(-1.5, -2, 7);
		spot.castShadow = true;
		spot.shadow.mapSize.set(1024, 1024);
		scene.add(spot, spot.target);
		const rim = new THREE.DirectionalLight(0xdfe8ff, 0.6);
		rim.position.set(3, 4, 3);
		scene.add(rim);
		const tex = crossTexture(THREE);
		tex.repeat.set(60, 60);
		ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0 }));
	} else {
		scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ee, 1.7));
		const sun = new THREE.DirectionalLight(0xffffff, 2.2);
		sun.position.set(-3, -4, 7);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
		sun.shadow.radius = 4;
		scene.add(sun);
		ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
	}
	ground.receiveShadow = true;
	scene.add(ground);

	// the playlist: the first scene shows as soon as it loads; each next one loads while the current one plays
	const shows = new Map();
	const fetchShow = (k) => {
		const name = names[k % names.length];
		if (!shows.has(name)) shows.set(name, loadShow(THREE, name, dark));
		return shows.get(name);
	};
	let idx = 0;
	let show = await fetchShow(0);
	scene.add(show.root);
	if (names.length > 1) fetchShow(1).catch(() => {});
	const setTitle = () => {
		if (titleEl) titleEl.textContent = show.title;
	};
	setTitle();

	const center = new THREE.Vector3(0, 0, dark ? 0.45 : 0.35);
	let az = 0;
	let dist = 9;
	function fit() {
		const w = host.clientWidth;
		const h = host.clientHeight;
		if (!w || !h) return;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		const v = THREE.MathUtils.degToRad(camera.fov / 2);
		const hz = Math.atan(Math.tan(v) * camera.aspect);
		dist = (show.reach * zoom) / Math.sin(Math.min(v, hz));
		camera.updateProjectionMatrix();
	}
	function place() {
		const a = show.baseAz + az;
		const el = 0.5;
		camera.position.set(
			center.x + Math.sin(a) * Math.cos(el) * dist,
			center.y - Math.cos(a) * Math.cos(el) * dist,
			center.z + Math.sin(el) * dist,
		);
		camera.lookAt(center);
	}

	host.prepend(canvas);
	fit();
	new ResizeObserver(() => {
		fit();
		draw();
	}).observe(host);

	// playback: the recorded segment, a moment held at the goal, a fade, then the next scene (or the same again)
	let t = reduce ? show.dur : 0;
	let hold = 0;
	let last = 0;
	let running = false;
	function draw() {
		show.pose(t);
		place();
		renderer.render(scene, camera);
	}
	async function advance() {
		let next = show;
		if (names.length > 1) {
			try {
				next = await fetchShow(idx + 1);
				idx = (idx + 1) % names.length;
			} catch (e) {
				next = show;
			}
		}
		if (next !== show) {
			scene.remove(show.root);
			show = next;
			scene.add(show.root);
			az = 0;
			fit();
			setTitle();
			if (names.length > 1) fetchShow(idx + 1).catch(() => {});
		}
		t = 0;
		hold = 0;
		draw();
		canvas.classList.remove('is-fading');
		host.classList.remove('is-changing');
	}
	function frame(now) {
		if (!running) return;
		const dt = Math.min((now - (last || now)) / 1000, 0.05);
		last = now;
		if (t < show.dur) {
			t = Math.min(show.dur, t + dt);
		} else {
			hold += dt;
			if (hold > 1.6 && !canvas.classList.contains('is-fading')) {
				canvas.classList.add('is-fading');
				host.classList.add('is-changing');
				setTimeout(advance, 420);
			}
		}
		draw();
		requestAnimationFrame(frame);
	}
	function play(on) {
		if (reduce || on === running) return;
		running = on;
		last = 0;
		if (on) requestAnimationFrame(frame);
	}
	let seen = false;
	new IntersectionObserver((e) => {
		seen = e[0].isIntersecting;
		play(seen && !document.hidden);
	}, { threshold: 0.1 }).observe(host);
	document.addEventListener('visibilitychange', () => play(seen && !document.hidden));

	// drag sideways to turn the view; vertical swipes still scroll the page
	let dragX = null;
	canvas.addEventListener('pointerdown', (e) => {
		dragX = e.clientX;
		canvas.setPointerCapture(e.pointerId);
		host.classList.add('is-dragging', 'was-dragged');
	});
	canvas.addEventListener('pointermove', (e) => {
		if (dragX === null) return;
		az = THREE.MathUtils.clamp(az + (e.clientX - dragX) * -0.008, -1.4, 1.4);
		dragX = e.clientX;
		if (!running) draw();
	});
	const endDrag = () => {
		dragX = null;
		host.classList.remove('is-dragging');
	};
	canvas.addEventListener('pointerup', endDrag);
	canvas.addEventListener('pointercancel', endDrag);
	canvas.addEventListener('dblclick', () => {
		t = 0;
		hold = 0;
	});

	draw();
	host.classList.add('is-live');
	host.dispatchEvent(new CustomEvent('spot:live', { bubbles: true }));
}

if (webglOk() && 'DecompressionStream' in window) {
	// other scripts read this to skip a fallback video the 3D view replaces
	document.documentElement.classList.add('has-spot3d');
	const go = () => document.querySelectorAll('[data-spot]').forEach((host) => {
		const near = new IntersectionObserver((e) => {
			if (!e[0].isIntersecting) return;
			near.disconnect();
			build(host).catch(() => host.classList.remove('is-live'));
		}, { rootMargin: '300px' });
		near.observe(host);
	});
	if (document.readyState === 'complete') go();
	else window.addEventListener('load', go, { once: true });
}
