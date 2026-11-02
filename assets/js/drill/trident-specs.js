// TRIDENT specifications and part descriptions from Zacny et al. (2025), The Planetary Science
// Journal 6:297, plus the K-REX2 rover facts from NASA's ARADS mission page. Shared by the 3D
// model and the hotspots on the real rover photo, so the photo works without loading three.js.

export const SPEC = {
	height: 1.75,          // m, overall drill height (Fig. 5)
	stringLength: 1.0,     // m, drilling depth capability (Table 1)
	bitDiameter: 0.0254,   // m, carbide-tipped bit (Table 1)
	deployStroke: 0.35,    // m, deployment stage travel to the surface
	feedStroke: 1.0,       // m, feed stage travel
	drillRpm: 100,         // auger speed while drilling
	retractRpm: 15,        // auger speed while retracting
	blowsPerMinute: 729,   // nominal percussion rate, 2 J per blow
	feedRate: 1.25,        // mm/s while drilling fresh material
	biteDepth: 0.10,       // m, sampling "bite"
};

export const PARTS = {
	head: {
		name: 'Drill head',
		side: 'right',
		text: 'Two brushless motors share one housing: one spins the auger at 100 rpm while drilling, the other drives a cam-spring hammer that delivers 2 J per blow at 729 blows per minute.',
		color: 0xd23c3c,
	},
	string: {
		name: 'Drill string',
		side: 'right',
		text: 'A 1 m auger ending in a 25.4 mm carbide-tipped bit. Deeper "bite" flutes near the bottom hold each 10 cm of cuttings; temperature sensors and a heater measure the subsurface.',
		color: 0xd23c3c,
	},
	feed: {
		name: 'Feed stage',
		side: 'left',
		text: 'A linear stage that pushes the drill string up to 1 m below the surface, at 1.25 mm/s while drilling, keeping weight on bit near 100 N.',
		color: 0xe0a33a,
	},
	deploy: {
		name: 'Deployment stage',
		side: 'left',
		text: 'Lowers the whole drill 35 cm until the footpad presses on the surface, preloading it so the drill stays stable while it works.',
		color: 0x3aa860,
	},
	brush: {
		name: 'Brush housing & footpad',
		side: 'right',
		text: 'After every 10 cm bite the auger pulls up and a rotary brush sweeps its cuttings down the chute, building a small cuttings cone on the surface for the instruments to study.',
		color: 0xe0a33a,
	},
};

// Hardware visible on NASA's photo of K-REX2 carrying TRIDENT during ARADS.
export const ROVER_PARTS = {
	krex2: {
		name: 'K-REX2 rover',
		text: "Designed and built at NASA Ames, about the size of the Spirit and Opportunity Mars rovers. Each year from 2016 to 2019 it drove itself over Mars-like ground in Chile's Atacama Desert to test autonomous drilling and the search for life.",
	},
	arm: {
		name: 'Robotic arm',
		text: 'A long blue arm with a metal scoop. It catches the drilled samples and delivers them through funnels on the top platform to the SOLID and MILA life-detection instruments.',
	},
};
