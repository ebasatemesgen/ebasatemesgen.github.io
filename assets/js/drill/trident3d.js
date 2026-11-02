// Interactive 3D model of NASA's TRIDENT drill, built to the published specifications in
// Zacny et al. (2025), "TRIDENT Ice Mining Drill for Lunar Volatile Prospecting for PRIME-1 and
// VIPER Missions", The Planetary Science Journal 6:297 (Table 1, Figures 5 and 6).
// It is a dimensionally faithful reconstruction, not Honeybee Robotics' CAD.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SPEC, PARTS } from './trident-specs.js';

export { SPEC, PARTS };

// with the feed stage fully up, the bit tip rests this far above the footpad
const BIT_REST = 0.075;

const ALUMINUM = { color: 0xc9ced6, metalness: 0.75, roughness: 0.32 };
const GOLD = { color: 0xc99a2e, metalness: 0.85, roughness: 0.3 };
const STEEL = { color: 0xb8bec6, metalness: 0.9, roughness: 0.22 };

function std(opts) {
	return new THREE.MeshStandardMaterial({ ...opts });
}

// helical auger flute: a thin twisted blade between the core and the outer radius
function fluteGeometry(length, pitch, rInner, rOuter) {
	const turns = length / pitch;
	const segs = Math.max(24, Math.round(turns * 40));
	const positions = [];
	const indices = [];
	for (let i = 0; i <= segs; i += 1) {
		const t = i / segs;
		const a = t * turns * Math.PI * 2;
		const y = -t * length;
		positions.push(Math.cos(a) * rInner, y, Math.sin(a) * rInner);
		positions.push(Math.cos(a) * rOuter, y - pitch * 0.12, Math.sin(a) * rOuter);
		if (i < segs) {
			const k = i * 2;
			indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	g.setIndex(indices);
	g.computeVertexNormals();
	return g;
}

function box(w, h, d, mat, x, y, z) {
	const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
	m.position.set(x, y, z);
	return m;
}

function cyl(r, h, mat, x, y, z, segs = 24) {
	const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segs), mat);
	m.position.set(x, y, z);
	return m;
}

function buildModel() {
	const parts = { head: [], string: [], feed: [], deploy: [], brush: [] };
	const anchors = {};
	const root = new THREE.Group();

	// Deployment linear stage: fixed rails that the rest of the drill rides down on.
	const deployMat = std(ALUMINUM);
	const fixed = new THREE.Group();
	[-0.065, 0.065].forEach((x) => {
		const rail = box(0.022, 1.36, 0.022, deployMat, x, 1.27, -0.085);
		fixed.add(rail);
		parts.deploy.push(rail);
	});
	[0.66, 1.25, 1.9].forEach((y) => {
		const tie = box(0.152, 0.024, 0.02, deployMat, 0, y, -0.1);
		fixed.add(tie);
		parts.deploy.push(tie);
	});
	const bulkhead = box(0.09, 0.08, 0.05, std({ color: 0x3b3f46, metalness: 0.4, roughness: 0.6 }), 0.1, 1.05, -0.09);
	fixed.add(bulkhead);
	parts.deploy.push(bulkhead);
	anchors.deploy = new THREE.Object3D();
	anchors.deploy.position.set(-0.08, 1.82, -0.085);
	fixed.add(anchors.deploy);
	root.add(fixed);

	// Everything below moves with the deployment stage.
	const carriage = new THREE.Group();
	root.add(carriage);

	const feedMat = std(ALUMINUM);
	const beam = box(0.05, 1.65, 0.035, feedMat, 0, 0.925, -0.04);
	carriage.add(beam);
	parts.feed.push(beam);
	[-0.02, 0.02].forEach((x) => {
		const r = cyl(0.005, 1.6, std(STEEL), x, 0.93, -0.018, 12);
		carriage.add(r);
		parts.feed.push(r);
	});
	const topCap = box(0.08, 0.06, 0.06, std(GOLD), 0, 1.72, -0.03);
	carriage.add(topCap);
	parts.feed.push(topCap);
	anchors.feed = new THREE.Object3D();
	anchors.feed.position.set(-0.03, 0.95, -0.04);
	carriage.add(anchors.feed);

	// Brush housing, sample delivery chute and footpad at the base.
	const brushMat = std({ color: 0x9aa1ab, metalness: 0.6, roughness: 0.4 });
	const housing = box(0.12, 0.11, 0.12, brushMat, 0, 0.085, 0.03);
	carriage.add(housing);
	parts.brush.push(housing);
	const chute = box(0.05, 0.02, 0.11, brushMat, 0.07, 0.06, 0.1);
	chute.rotation.set(0.45, 0, -0.35);
	carriage.add(chute);
	parts.brush.push(chute);
	const footpad = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 10, 36), std({ color: 0x5b616b, metalness: 0.5, roughness: 0.5 }));
	footpad.rotation.x = Math.PI / 2;
	footpad.position.set(0, 0.012, 0.03);
	carriage.add(footpad);
	parts.brush.push(footpad);
	anchors.brush = new THREE.Object3D();
	anchors.brush.position.set(0.08, 0.1, 0.06);
	carriage.add(anchors.brush);

	// Flex cable feeding the drill head (orange ribbon in field photos).
	const cablePath = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0.03, 1.68, -0.02),
		new THREE.Vector3(0.11, 1.55, 0.0),
		new THREE.Vector3(0.12, 1.42, 0.03),
		new THREE.Vector3(0.07, 1.36, 0.05),
	]);
	const cable = new THREE.Mesh(new THREE.TubeGeometry(cablePath, 40, 0.006, 8, false), std({ color: 0xd9822b, roughness: 0.7 }));
	carriage.add(cable);
	parts.feed.push(cable);

	// The drill head and string ride the feed stage.
	const feedCarriage = new THREE.Group();
	carriage.add(feedCarriage);

	const headMat = std(GOLD);
	const head = box(0.12, 0.25, 0.12, headMat, 0, 1.33, 0.035);
	feedCarriage.add(head);
	parts.head.push(head);
	const motorMat = std({ color: 0x23262b, metalness: 0.5, roughness: 0.45 });
	[[-0.03, 'rotary'], [0.033, 'percussive']].forEach(([x]) => {
		const motor = cyl(0.022, 0.09, motorMat, x, 1.5, 0.035);
		feedCarriage.add(motor);
		parts.head.push(motor);
	});
	const sled = box(0.07, 0.18, 0.03, std(ALUMINUM), 0, 1.33, -0.012);
	feedCarriage.add(sled);
	parts.head.push(sled);
	anchors.head = new THREE.Object3D();
	anchors.head.position.set(0.07, 1.42, 0.06);
	feedCarriage.add(anchors.head);

	// Auger: core, shallow conveying flutes above, deeper sampling "bite" flutes at the bottom, bit.
	const auger = new THREE.Group();
	auger.position.set(0, 1.205, 0.035);
	feedCarriage.add(auger);
	const steel = std(STEEL);
	const R = SPEC.bitDiameter / 2;
	const core = cyl(0.0068, 1.12, steel, 0, -0.56, 0, 16);
	auger.add(core);
	const upper = new THREE.Mesh(fluteGeometry(0.88, 0.045, 0.006, R * 0.92), new THREE.MeshStandardMaterial({ ...STEEL, side: THREE.DoubleSide }));
	auger.add(upper);
	const lower = new THREE.Mesh(fluteGeometry(0.2, 0.028, 0.0045, R), new THREE.MeshStandardMaterial({ ...STEEL, side: THREE.DoubleSide }));
	lower.position.y = -0.9;
	auger.add(lower);
	const bit = new THREE.Mesh(new THREE.ConeGeometry(R, 0.03, 20), std({ color: 0x3a3d42, metalness: 0.6, roughness: 0.35 }));
	bit.rotation.x = Math.PI;
	bit.position.y = -1.115;
	auger.add(bit);
	[core, upper, lower, bit].forEach((m) => parts.string.push(m));
	anchors.string = new THREE.Object3D();
	anchors.string.position.set(0.02, -0.72, 0);
	auger.add(anchors.string);
	const bitTip = new THREE.Object3D();
	bitTip.position.y = -1.13;
	auger.add(bitTip);

	return { root, carriage, feedCarriage, auger, bitTip, parts, anchors, flutes: [upper, lower] };
}

function buildGround(style) {
	const g = new THREE.Group();
	const ice = style === 'ice';
	const surfaceColor = ice ? 0xe6eef6 : 0xc8ae8c;
	const soilColor = ice ? 0x9fbdd6 : 0x9c7b58;
	const size = 0.62;
	const depth = 1.12;
	const surface = new THREE.Mesh(
		new THREE.PlaneGeometry(size, size),
		new THREE.MeshStandardMaterial({ color: surfaceColor, roughness: 0.95, transparent: true, opacity: ice ? 0.55 : 0.5, depthWrite: false, side: THREE.DoubleSide }),
	);
	surface.rotation.x = -Math.PI / 2;
	g.add(surface);
	// translucent subsurface so the auger stays visible below ground
	const soil = new THREE.Mesh(
		new THREE.BoxGeometry(size, depth, size),
		new THREE.MeshStandardMaterial({ color: soilColor, roughness: 1, transparent: true, opacity: 0.12, depthWrite: false }),
	);
	soil.position.y = -depth / 2;
	g.add(soil);
	const edges = new THREE.LineSegments(
		new THREE.EdgesGeometry(new THREE.BoxGeometry(size, depth, size)),
		new THREE.LineBasicMaterial({ color: soilColor, transparent: true, opacity: 0.55 }),
	);
	edges.position.y = -depth / 2;
	g.add(edges);
	// depth ticks every 10 cm (one sampling bite) on the front edge
	const ticks = [];
	for (let d = 0.1; d < depth; d += 0.1) {
		ticks.push(size / 2, -d, size / 2, size / 2 - 0.03, -d, size / 2);
	}
	const tickGeo = new THREE.BufferGeometry();
	tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
	g.add(new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: soilColor, transparent: true, opacity: 0.7 })));
	return g;
}

// a soft contact shadow that grounds the drill without drawing a ground plane
function buildShadow() {
	const c = document.createElement('canvas');
	c.width = 128;
	c.height = 128;
	const ctx = c.getContext('2d');
	const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
	grad.addColorStop(0, 'rgba(40,46,70,0.22)');
	grad.addColorStop(1, 'rgba(40,46,70,0)');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, 128, 128);
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(0.9, 0.9),
		new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
	);
	m.rotation.x = -Math.PI / 2;
	m.position.set(0, 0.002, 0.02);
	return m;
}

// Small helper visuals for faults seen in the field telemetry.
function buildFaultFx() {
	const fx = new THREE.Group();
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.045, 0.01, 12, 40),
		new THREE.MeshBasicMaterial({ color: 0xed666f, transparent: true, opacity: 0 }),
	);
	ring.rotation.x = Math.PI / 2;
	fx.add(ring);

	const rock = new THREE.Mesh(
		new THREE.IcosahedronGeometry(0.075, 0),
		new THREE.MeshStandardMaterial({ color: 0x6f6a66, roughness: 0.9, flatShading: true }),
	);
	rock.visible = false;
	fx.add(rock);

	const count = 140;
	const grains = new THREE.InstancedMesh(
		new THREE.SphereGeometry(0.0045, 6, 6),
		new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 1 }),
		count,
	);
	grains.visible = false;
	const seeds = [];
	for (let i = 0; i < count; i += 1) {
		seeds.push({ a: Math.random() * Math.PI * 2, r: 0.014 + Math.random() * 0.018, y: Math.random() * 0.22, s: 0.6 + Math.random() * 0.8 });
	}
	fx.add(grains);
	return { fx, ring, rock, grains, seeds };
}

function buildCuttingsCone(style) {
	const cone = new THREE.Mesh(
		new THREE.ConeGeometry(0.09, 0.05, 32),
		new THREE.MeshStandardMaterial({ color: style === 'ice' ? 0x8c7a66 : 0x8e6e4e, roughness: 1 }),
	);
	cone.position.set(0.16, 0.025, 0.2);
	cone.scale.setScalar(0.001);
	return cone;
}

export function createTrident(host, options = {}) {
	const { ground = 'regolith', transparent = false, autoRotate = true, labels = true, view = 'full', shadow = false, infoHost = host } = options;

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: transparent });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.domElement.className = 'trident3d__canvas';
	host.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	if (!transparent) {
		scene.background = new THREE.Color(0xf6f7fb);
	}
	const pmrem = new THREE.PMREMGenerator(renderer);
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.6));
	const sun = new THREE.DirectionalLight(0xffffff, 1.6);
	sun.position.set(2, 4, 3);
	scene.add(sun);

	const model = buildModel();
	scene.add(model.root);
	const groundGroup = ground ? buildGround(ground) : null;
	if (groundGroup) {
		scene.add(groundGroup);
	}
	if (shadow) {
		scene.add(buildShadow());
	}
	const faults = buildFaultFx();
	scene.add(faults.fx);
	const cone = buildCuttingsCone(ground);
	if (ground) {
		scene.add(cone);
	}

	// 'full' frames the whole 1.75 m drill plus its 35 cm deployment travel; 'drill' frames the borehole
	const FRAMES = {
		full: { target: new THREE.Vector3(0, 0.92, 0), height: 2.85 },
		drill: { target: new THREE.Vector3(0, -0.12, 0), height: 1.75 },
		focus: { target: new THREE.Vector3(0, 1.0, -0.02), height: 2.35 },
	};
	const frameSpec = FRAMES[view] || FRAMES.full;
	const viewDir = (frameSpec.dir || new THREE.Vector3(0.58, 0.3, 0.76)).clone().normalize();
	const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
	const target = frameSpec.target;
	camera.position.copy(target).addScaledVector(viewDir, frameSpec.height / (2 * Math.tan(THREE.MathUtils.degToRad(15))));
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.target.copy(target);
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.minPolarAngle = 0.35;
	controls.maxPolarAngle = 1.75;
	controls.autoRotate = autoRotate;
	controls.autoRotateSpeed = 0.9;
	controls.addEventListener('start', () => {
		controls.autoRotate = false;
	});

	// --- state: targets the model eases toward, in meters / rpm ---
	const state = {
		deploy: 0, deployTarget: 0,
		feed: 0, feedTarget: 0,
		rpm: 0, rpmTarget: 0,
		percussion: false,
		fault: null,
		cuttings: 0,
		speed: 1,
	};
	let spin = 0;
	let running = false;
	let raf = 0;
	let last = 0;
	const clock = { t: 0 };

	// --- labels / part info ---
	const labelEls = {};
	let infoEl = null;
	let activePart = null;
	const highlightMats = new Map();
	function setHighlight(key) {
		Object.entries(model.parts).forEach(([k, meshes]) => {
			meshes.forEach((m) => {
				if (!highlightMats.has(m)) {
					highlightMats.set(m, m.material);
				}
				const base = highlightMats.get(m);
				if (k === key) {
					const mat = base.clone();
					mat.emissive = new THREE.Color(PARTS[k].color);
					mat.emissiveIntensity = 0.55;
					m.material = mat;
				} else {
					m.material = base;
				}
			});
		});
	}
	function showPart(key) {
		activePart = activePart === key ? null : key;
		setHighlight(activePart);
		Object.entries(labelEls).forEach(([k, el]) => el.classList.toggle('is-active', k === activePart));
		if (!infoEl) {
			return;
		}
		if (activePart) {
			infoEl.innerHTML = `<button type="button" class="trident3d__close" aria-label="Close">×</button><strong>${PARTS[activePart].name}</strong>${PARTS[activePart].text}`;
			infoEl.querySelector('.trident3d__close').addEventListener('click', () => showPart(activePart));
			infoEl.hidden = false;
		} else {
			infoEl.hidden = true;
		}
	}
	if (labels) {
		const layer = document.createElement('div');
		layer.className = 'trident3d__labels';
		Object.keys(PARTS).forEach((key) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = `trident3d__label trident3d__label--${PARTS[key].side}`;
			b.textContent = PARTS[key].name;
			b.addEventListener('click', (e) => {
				e.stopPropagation();
				showPart(key);
			});
			layer.appendChild(b);
			labelEls[key] = b;
		});
		host.appendChild(layer);
		infoEl = document.createElement('div');
		infoEl.className = 'trident3d__info';
		infoEl.hidden = true;
		infoHost.appendChild(infoEl);
	}

	// click a part in the scene to learn about it
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	let downAt = null;
	renderer.domElement.addEventListener('pointerdown', (e) => {
		downAt = [e.clientX, e.clientY];
	});
	renderer.domElement.addEventListener('pointerup', (e) => {
		if (!labels || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) {
			return;
		}
		const r = renderer.domElement.getBoundingClientRect();
		pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		raycaster.setFromCamera(pointer, camera);
		const all = Object.entries(model.parts).flatMap(([k, ms]) => ms.map((m) => [k, m]));
		const hits = raycaster.intersectObjects(all.map(([, m]) => m), false);
		if (hits.length) {
			const hit = all.find(([, m]) => m === hits[0].object);
			showPart(hit[0]);
		}
	});

	function resize() {
		const w = host.clientWidth || 1;
		const h = host.clientHeight || 1;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}
	const ro = new ResizeObserver(resize);
	ro.observe(host);
	resize();

	const tmp = new THREE.Vector3();
	function placeLabels() {
		if (!labels) {
			return;
		}
		const w = host.clientWidth;
		const h = host.clientHeight;
		Object.entries(labelEls).forEach(([key, el]) => {
			model.anchors[key].getWorldPosition(tmp);
			tmp.project(camera);
			const hidden = tmp.z > 1;
			el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
			el.style.opacity = hidden ? '0' : '';
		});
	}

	function approach(cur, tgt, rate, dt) {
		const d = tgt - cur;
		const step = rate * dt;
		return Math.abs(d) <= step ? tgt : cur + Math.sign(d) * step;
	}

	function frame(now) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(0.05, (now - (last || now)) / 1000);
		last = now;
		clock.t += dt;

		state.deploy = approach(state.deploy, state.deployTarget, 0.6 * state.speed, dt);
		state.feed = approach(state.feed, state.feedTarget, 0.35 * state.speed, dt);
		state.rpm = approach(state.rpm, state.rpmTarget, 160, dt);

		// the deployment stage lowers the carriage by up to 35 cm; the feed stage then lowers the string
		model.carriage.position.y = SPEC.deployStroke * (1 - state.deploy);
		const hammer = state.percussion ? Math.sin(clock.t * (SPEC.blowsPerMinute / 60) * Math.PI * 2) * 0.0015 : 0;
		const shake = state.fault === 'choking' || state.fault === 'binding' ? (Math.random() - 0.5) * 0.004 : 0;
		model.feedCarriage.position.y = -state.feed + hammer + shake;
		spin += (state.rpm / 60) * Math.PI * 2 * dt;
		model.auger.rotation.y = spin;

		// fault visuals sit at the bit
		model.bitTip.getWorldPosition(tmp);
		const pulse = 0.5 + 0.5 * Math.sin(clock.t * 6);
		faults.ring.position.set(tmp.x, tmp.y + 0.02, tmp.z);
		const ringOn = state.fault === 'choking' || state.fault === 'binding';
		faults.ring.material.color.set(state.fault === 'binding' ? 0xf0a33a : 0xed666f);
		faults.ring.material.opacity = ringOn ? 0.45 + 0.5 * pulse : Math.max(0, faults.ring.material.opacity - dt * 2);
		faults.ring.scale.setScalar(1 + (ringOn ? pulse * 0.6 : 0));
		faults.rock.visible = state.fault === 'boulder' || state.fault === 'rock';
		faults.rock.position.set(tmp.x + 0.01, tmp.y - 0.07, tmp.z);
		faults.grains.visible = state.fault === 'choking';
		if (faults.grains.visible) {
			const m = new THREE.Matrix4();
			faults.seeds.forEach((s, i) => {
				const a = s.a + clock.t * 0.4 * s.s;
				m.makeTranslation(tmp.x + Math.cos(a) * s.r, tmp.y + 0.01 + s.y, tmp.z + Math.sin(a) * s.r);
				faults.grains.setMatrixAt(i, m);
			});
			faults.grains.instanceMatrix.needsUpdate = true;
		}
		model.flutes.forEach((f) => {
			f.material.emissive = new THREE.Color(state.fault === 'binding' ? 0xf0a33a : 0x000000);
			f.material.emissiveIntensity = state.fault === 'binding' ? 0.35 + 0.35 * pulse : 0;
		});

		cone.scale.setScalar(Math.max(0.001, state.cuttings));

		controls.update();
		renderer.render(scene, camera);
		placeLabels();
	}

	const api = {
		SPEC,
		start() {
			if (running) {
				return;
			}
			running = true;
			last = 0;
			raf = requestAnimationFrame(frame);
		},
		stop() {
			running = false;
			cancelAnimationFrame(raf);
		},
		setDeploy(v, immediate = false) {
			state.deployTarget = v;
			if (immediate) {
				state.deploy = v;
			}
		},
		setFeed(m, immediate = false) {
			state.feedTarget = Math.max(0, Math.min(SPEC.feedStroke + 0.15, m));
			if (immediate) {
				state.feed = state.feedTarget;
			}
		},
		// bit depth below the surface, in meters (assumes the footpad is down)
		setDepth(m, immediate = false) {
			api.setFeed(m + BIT_REST, immediate);
		},
		setRpm(rpm) {
			state.rpmTarget = rpm;
		},
		setPercussion(on) {
			state.percussion = on;
		},
		setFault(name) {
			state.fault = name;
		},
		setCuttings(v) {
			state.cuttings = v;
		},
		setSpeed(v) {
			state.speed = v;
		},
		get depth() {
			// bit depth below the surface; zero until the footpad is down
			return state.deploy < 0.999 ? 0 : Math.max(0, state.feed - BIT_REST);
		},
		get rpm() {
			return state.rpm;
		},
		get percussion() {
			return state.percussion;
		},
		// resolves once the stages reach their targets
		settle() {
			return new Promise((resolve) => {
				const check = () => {
					if (Math.abs(state.deploy - state.deployTarget) < 1e-4 && Math.abs(state.feed - state.feedTarget) < 1e-4) {
						resolve();
					} else {
						setTimeout(check, 60);
					}
				};
				check();
			});
		},
		dispose() {
			api.stop();
			ro.disconnect();
			renderer.dispose();
			host.innerHTML = '';
		},
	};
	return api;
}
