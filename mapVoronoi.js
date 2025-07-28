import { createNoise2D } from 'https://esm.sh/simplex-noise@4.0.1.js';
import { Delaunay } from 'https://cdn.jsdelivr.net/npm/d3-delaunay@6/+esm';

const canvas = document.getElementById('town');
const ctx = canvas.getContext('2d');
const noise2D = createNoise2D();

const SPRITE_WIDTH = 38;
const SPRITE_HEIGHT = 64;
const SPRITES_PER_ROW = 8;
const NUM_SPRITES = 8;
const spriteScale = parseFloat(localStorage.getItem('houseSize'));

const CANVAS_SIZE = parseInt(localStorage.getItem('canvasSize'));
const ROAD_STEP = parseInt(localStorage.getItem('roadDensity')); //the larger, the less points
const NOISE_SCALE = 0.1; //the smaller, the less points
const ROAD_THRESHOLD = 0; //the larger, the less points
const ROAD_WIDTH = parseInt(localStorage.getItem('roadWidth'));

let points = [];
for (let x = 0; x < CANVAS_SIZE; x += ROAD_STEP) {
	for (let y = 0; y < CANVAS_SIZE; y += ROAD_STEP) {
		let noiseVal = noise2D(x * NOISE_SCALE, y * NOISE_SCALE);
		if (noiseVal > ROAD_THRESHOLD) {
			//ctx.fillRect(x, y, ROAD_STEP / 10, ROAD_STEP / 10);
			points.push([x, y]);
		}
	}
}

const voronoiPoints = points.filter(
	([x, y]) => x > ROAD_STEP && x < CANVAS_SIZE - ROAD_STEP && y > ROAD_STEP && y < CANVAS_SIZE - ROAD_STEP
);

const delaunay = Delaunay.from(voronoiPoints);
const voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);

const houseSheet = new Image();
houseSheet.src = './images/roofs/spritesheet.png';

function drawVoronoi() {
	ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

	const edges = getEdges(voronoiPoints);

	edges.forEach(({ from, to }) => {
		ctx.beginPath();
		ctx.moveTo(from[0], from[1]);
		ctx.lineTo(to[0], to[1]);
		ctx.strokeStyle = '#bb9900';
		ctx.lineWidth = ROAD_WIDTH;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();
	});

	const housePoints = getHousePoints(edges);

	if (!houseSheet.complete) {
		houseSheet.onload = () => drawVoronoi();
		return;
	}

	housePoints.forEach(({ x, y, angle, spriteIndex }) => {
		const sx = (spriteIndex % SPRITES_PER_ROW) * SPRITE_WIDTH;
		const sy = 0; // single row sprites

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(angle);

		ctx.drawImage(
			houseSheet,
			sx,
			sy,
			SPRITE_WIDTH,
			SPRITE_HEIGHT,
			(-SPRITE_WIDTH / 2) * spriteScale,
			(-SPRITE_HEIGHT / 2) * spriteScale,
			SPRITE_WIDTH * spriteScale,
			SPRITE_HEIGHT * spriteScale
		);

		ctx.restore();
	});

	//voronoiPoints.forEach(([x, y]) => {	ctx.fillRect(x, y, ROAD_STEP / 10, ROAD_STEP / 10);});
}

function getEdges() {
	const unFilteredEdges = [];

	for (let i = 0; i < points.length; i++) {
		const poly = voronoi.cellPolygon(i);
		if (!poly) continue;

		for (let j = 0; j < poly.length - 1; j++) {
			const from = poly[j];
			const to = poly[j + 1];
			if (!!from[0] && !!to[0]) unFilteredEdges.push({ from, to });
			//a bunch of points were becoming undefined who knows why
		}
	}
	/*
	unFilteredEdges.forEach(({ from, to }) => {
		ctx.beginPath();
		ctx.moveTo(from[0], from[1]);
		ctx.lineTo(to[0], to[1]);
		ctx.strokeStyle = '#00000010';
		ctx.lineWidth = ROAD_STEP / 4;
		ctx.stroke();
	});
	*/
	const edges = filterEdges(unFilteredEdges);

	return edges;
}

function distSquared([x1, y1], [x2, y2]) {
	const dx = x2 - x1,
		dy = y2 - y1;
	return dx * dx + dy * dy;
}

function edgesTooClose(e1, e2, minDist = 50) {
	const dists = [
		distSquared(e1.from, e2.from),
		distSquared(e1.from, e2.to),
		distSquared(e1.to, e2.from),
		distSquared(e1.to, e2.to),
	];
	const minDistSq = minDist * minDist;
	return dists.some((d) => d < minDistSq);
}

function isBorderEdge(edge) {
	const { from, to } = edge;
	return [from, to].some(([x, y]) => x === 0 || x === CANVAS_SIZE || y === 0 || y === CANVAS_SIZE);
}

function isParallel(edgeA, edgeB) {
	const dx1 = edgeA.to[0] - edgeA.from[0];
	const dy1 = edgeA.to[1] - edgeA.from[1];
	const dx2 = edgeB.to[0] - edgeB.from[0];
	const dy2 = edgeB.to[1] - edgeB.from[1];
	return Math.abs(dx1 * dy2 - dy1 * dx2) < 0.01;
}

function isFullBorderEdge(edge) {
	const { from, to } = edge;
	// Both points share x and it's on border
	if (from[0] === to[0] && (from[0] === 0 || from[0] === CANVAS_SIZE)) return true;
	// Both points share y and it's on border
	if (from[1] === to[1] && (from[1] === 0 || from[1] === CANVAS_SIZE)) return true;
	return false;
}

function filterEdges(edges) {
	const keptEdges = [];

	for (const edge of edges) {
		if (!isBorderEdge(edge)) {
			keptEdges.push(edge);
			continue;
		}
		if (isFullBorderEdge(edge)) continue; // always skip full border edges

		let shouldSkip = false;

		for (const e of keptEdges) {
			if (isBorderEdge(e) && (isParallel(e, edge) || edgesTooClose(e, edge))) {
				shouldSkip = true;
				break;
			}
		}
		if (!shouldSkip) keptEdges.push(edge);
	}

	return keptEdges;
}

function getHousePoints(
	edges,
	density = parseFloat(localStorage.getItem('houseDensity')) || 1,
	minDist = ROAD_STEP * spriteScale + 1,
	offset =  ROAD_STEP * spriteScale + 2
) {

	console.log(minDist);
	console.log(offset);
	const housePoints = [];

	const houseEdges = [];

	edges.forEach((edge) => {
		if (!isBorderEdge(edge)) houseEdges.push(edge);
	});

	function isTooCloseToEdge({ x, y }) {
		const minDistSq = (minDist - 5) ** 2;
		return edges.some(({ from, to }) => {
			const dx = to[0] - from[0];
			const dy = to[1] - from[1];
			const lenSq = dx * dx + dy * dy;
			const t = Math.max(0, Math.min(1, ((x - from[0]) * dx + (y - from[1]) * dy) / lenSq));
			const projX = from[0] + t * dx;
			const projY = from[1] + t * dy;
			return distSquared([x, y], [projX, projY]) < minDistSq;
		});
	}

	for (const { from, to } of houseEdges) {
		const dx = to[0] - from[0];
		const dy = to[1] - from[1];
		const length = Math.sqrt(dx * dx + dy * dy);
		const count = Math.floor(length * density);
		const angle = Math.atan2(dy, dx);

		const offsetX = Math.sin(angle) * offset;
		const offsetY = -Math.cos(angle) * offset;

		for (let i = 0; i <= count; i++) {
			const t = i / count;
			const baseX = from[0] + dx * t;
			const baseY = from[1] + dy * t;
			const jitter = 3; // max random offset in pixels
			const randX = baseX + (Math.random() * 2 - 1) * jitter;
			const randY = baseY + (Math.random() * 2 - 1) * jitter;

			const candidates = [
				{ x: randX + offsetX, y: randY + offsetY, angle },
				{ x: randX - offsetX, y: randY - offsetY, angle },
			];

			for (const p of candidates) {
				if(isTooCloseToEdge) console.log('too close');

				if (
					!isTooCloseToEdge(p) &&
					!housePoints.some((h) => distSquared([p.x, p.y], [h.x, h.y]) < minDist **2.2)
				) {
					p.spriteIndex = Math.floor(Math.random() * NUM_SPRITES);
					housePoints.push(p);
				}
			}
		}
	}

	return housePoints;
}

export { drawVoronoi };
