import { drawNoise } from './townGenerator/mapNoise.js';
import { drawVoronoi } from './townGenerator/mapVoronoi.js';

function draw() {
	const mode = localStorage.getItem('mode') || 'noise';
	const pattern = localStorage.getItem('pattern') || 'noise';

	if (pattern === 'noise') {
		console.log('should be drawing noise');
		drawNoise();
	} else drawVoronoi();

	fillGrid();
}

function fillGrid() {
	const xLabels = document.querySelector('.grid .xLabels');
	const yLabels = document.querySelector('.grid .yLabels');
	const width = 600;
	const height = 600;
	const step = 100;

	// Clear previous content
	xLabels.innerHTML = '';
	yLabels.innerHTML = '';

	// Create numbers for top (x axis)
	for (let x = 0; x <= width; x += step) {
		const labelX = document.createElement('div');
		labelX.className = 'labelX';
		labelX.textContent = x;
		labelX.style.left = `${x}px`;
		labelX.style.transform = 'translateX(-50%)';
		xLabels.appendChild(labelX);
	}

	// Create numbers for left (y axis)
	for (let y = 0; y <= height; y += step) {
		const labelY = document.createElement('div');
		labelY.className = 'labelY';
		labelY.textContent = y;
		labelY.style.top = `${y}px`;
		labelY.style.transform = 'translateY(-50%)';
		yLabels.appendChild(labelY);
	}
}

draw();
