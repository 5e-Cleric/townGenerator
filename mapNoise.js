import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/dist/esm/simplex-noise.js';

const canvas = document.getElementById('town');
const ctx = canvas.getContext('2d');
const noise2D = createNoise2D();

const CANVAS_SIZE = 600;
const ROAD_STEP = 40;
const NOISE_SCALE = 0.01;
const ROAD_THRESHOLD = 0;

function drawNoise() {
	const mode = localStorage.getItem('mode') || 'pattern';

	ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

	if (mode === 'pattern') {
		for (let x = 0; x < CANVAS_SIZE; x++) {
			for (let y = 0; y < CANVAS_SIZE; y++) {
				let noiseVal = noise2D(x * NOISE_SCALE, y * NOISE_SCALE);
				let color = ((noiseVal + 1) / 2) * 255;
				ctx.fillStyle = `rgb(${color},${color},${color})`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	} else if (mode === 'roads') {
		ctx.fillStyle = 'black';
		let roadPoints = [];
		for (let x = 0; x < CANVAS_SIZE; x += ROAD_STEP) {
			for (let y = 0; y < CANVAS_SIZE; y += ROAD_STEP) {
				let noiseVal = noise2D(x * NOISE_SCALE, y * NOISE_SCALE);
				if (noiseVal > ROAD_THRESHOLD) {
					ctx.fillRect(x, y, ROAD_STEP / 2, ROAD_STEP / 2);
					roadPoints.push({ x, y });
				}
			}
		}

		for (let i = 0; i <= CANVAS_SIZE; i += ROAD_STEP) {
			roadPoints.push({ x: 0, y: i });
			roadPoints.push({ x: CANVAS_SIZE-ROAD_STEP/2, y: i });
			roadPoints.push({ x: i, y: 0 });
			roadPoints.push({ x: i, y: CANVAS_SIZE-ROAD_STEP/2 });
		}

		console.log(`${roadPoints.length} points`);
		const edges = joinPoints(roadPoints);

		const squares = joinEdges(edges);

		const corners = joinCorners(edges);
		//draw edges

		const POINT_SIZE = ROAD_STEP / 4;

		ctx.beginPath();
		ctx.strokeStyle = 'black';
		ctx.lineWidth = POINT_SIZE * 2;
		edges.forEach(({ from, to }) => {
			ctx.moveTo(from.x + POINT_SIZE, from.y + POINT_SIZE);
			ctx.lineTo(to.x + POINT_SIZE, to.y + POINT_SIZE);
		});
		ctx.stroke();

		ctx.beginPath();
		ctx.beginPath();
		ctx.fillStyle = '#000000';
		squares.forEach(({ from, to }) => {
			const height = to.y - from.y;
			const width = to.x - from.x;
			ctx.fillRect(from.x, from.y, width, height);
		});
		ctx.stroke();

		ctx.beginPath();
		ctx.fillStyle = '#000000';
		corners.forEach(({ center, points }) => {
			ctx.moveTo(center.x, center.y);
			ctx.lineTo(points[0].x, points[0].y);
			ctx.lineTo(points[1].x, points[1].y);

			ctx.closePath();
		});
		ctx.fill();
	}
}

function joinPoints(points) {
	let pointsUpdated = [];
	let edges = [];

	for (let j = 0; j < points.length; j++) {
		let point = { i: j, x: points[j].x, y: points[j].y, pathTo: [] };

		let leftCoord = { x: point.x - ROAD_STEP, y: point.y };
		let rightCoord = { x: point.x + ROAD_STEP, y: point.y };
		let topCoord = { x: point.x, y: point.y + ROAD_STEP };
		let botCoord = { x: point.x, y: point.y - ROAD_STEP };
		//console.log("punto", j+1, ": ", points[j]);
		//console.log('busco: ', leftCoord);

		for (let k = j + 1; k < points.length; k++) {
			if (points[k].x === leftCoord.x && points[k].y === leftCoord.y) {
				point.pathTo.push(k);
			}
			if (points[k].x === rightCoord.x && points[k].y === rightCoord.y) {
				point.pathTo.push(k);
			}
			if (points[k].x === topCoord.x && points[k].y === topCoord.y) {
				point.pathTo.push(k);
			}
			if (points[k].x === botCoord.x && points[k].y === botCoord.y) {
				point.pathTo.push(k);
			}
		}

		pointsUpdated.push(point);
	}

	for (let l = 0; l < pointsUpdated.length; l++) {
		const currentPoint = pointsUpdated[l];
		if (currentPoint.pathTo.length !== 0) {
			for (let n = 0; n < currentPoint.pathTo.length; n++) {
				edges.push({ from: pointsUpdated[l], to: pointsUpdated[pointsUpdated[l].pathTo[n]] });
			}
		}
	}

	//console.table(pointsUpdated);;
	return edges;
}

function joinEdges(edges) {
	let squares = [];
	let seen = new Set();

	for (let i = 0; i < edges.length; i++) {
		const edge1 = edges[i];

		for (let j = i + 1; j < edges.length; j++) {
			const edge2 = edges[j];

			if (isSquare(edge1, edge2)) {
				const xs = [edge1.from.x, edge1.to.x, edge2.from.x, edge2.to.x];
				const ys = [edge1.from.y, edge1.to.y, edge2.from.y, edge2.to.y];

				const from = { x: Math.min(...xs), y: Math.min(...ys) };
				const to = { x: Math.max(...xs), y: Math.max(...ys) };
				const key = `${from.x},${from.y},${to.x},${to.y}`;

				if (seen.has(key)) continue;
				seen.add(key);

				squares.push({ from, to });
			}
		}
	}

	return squares;
}

function joinCorners(edges) {
	let corners = [];
	let seen = new Set();

	for (let i = 0; i < edges.length; i++) {
		const edge1 = edges[i];

		for (let j = i + 1; j < edges.length; j++) {
			const edge2 = edges[j];

			if (isCorner(edge1, edge2)) {
				const points = [edge1.from, edge1.to, edge2.from, edge2.to];
				const unique = {};

				points.forEach((p) => {
					const key = `${p.x},${p.y}`;
					unique[key] = p;
				});

				const shared = Object.values(unique).filter(
					(p) => points.filter((q) => q.x === p.x && q.y === p.y).length > 1
				)[0];

				const others = Object.values(unique).filter((p) => p !== shared);
				const key = `${shared.x},${shared.y},${others.map((p) => `${p.x},${p.y}`).join(',')}`;

				if (seen.has(key)) continue;
				seen.add(key);

				corners.push({ center: shared, points: others });
			}
		}
	}

	return corners;
}

function isCorner(edge1, edge2) {
	const sharedX =
		edge1.from.x === edge2.from.x ||
		edge1.from.x === edge2.to.x ||
		edge1.to.x === edge2.from.x ||
		edge1.to.x === edge2.to.x;
	const sharedY =
		edge1.from.y === edge2.from.y ||
		edge1.from.y === edge2.to.y ||
		edge1.to.y === edge2.from.y ||
		edge1.to.y === edge2.to.y;

	const isPerpendicular =
		(edge1.from.x === edge1.to.x && edge2.from.y === edge2.to.y) ||
		(edge1.from.y === edge1.to.y && edge2.from.x === edge2.to.x);

	return sharedX && sharedY && isPerpendicular;
}

function isSquare(edge1, edge2) {
	const isHorizontal = edge1.from.y === edge1.to.y && edge2.from.y === edge2.to.y;
	const isVertical = edge1.from.x === edge1.to.x && edge2.from.x === edge2.to.x;

	if (!(isHorizontal || isVertical)) return false;

	// Check distance between edges
	if (isHorizontal) {
		const dy = Math.abs(edge1.from.y - edge2.from.y);
		if (dy !== ROAD_STEP) return false;
	} else {
		const dx = Math.abs(edge1.from.x - edge2.from.x);
		if (dx !== ROAD_STEP) return false;
	}

	// Calculate bounding box
	const xs = [edge1.from.x, edge1.to.x, edge2.from.x, edge2.to.x];
	const ys = [edge1.from.y, edge1.to.y, edge2.from.y, edge2.to.y];

	const xMin = Math.min(...xs);
	const xMax = Math.max(...xs);
	const yMin = Math.min(...ys);
	const yMax = Math.max(...ys);

	// Check if bounding box is square of ROAD_STEP size
	return xMax - xMin === ROAD_STEP && yMax - yMin === ROAD_STEP;
}

export { drawNoise };
