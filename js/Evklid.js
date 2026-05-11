class Evklid {
	steps = [];
	stepIndex = 0;
	svg;
	table;
	log;
	numA;
	numB;
	
	constructor(svg, log, table, numA, numB){
		this.svg = document.getElementById(svg);
		this.log = document.getElementById(log);
		this.table = table;
		this.numA = document.getElementById(numA);
		this.numB = document.getElementById(numB);
	}

	euclidEducational(a, b) {
		const steps = [];
		let stepNumber = 1;

		while (b !== 0) {
			const q = Math.floor(a / b);
			const r = a % b;
			steps.push({ step: stepNumber++, A: a, B: b, q, r });
			a = b; b = r;
		}

		steps.push({ step: stepNumber, A: a, B: b, q: "-", r: 0, done: true });
		return steps;
	}

	drawGraph(step) {
		this.svg.innerHTML = `
		<defs>
		<marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
		<path d="M0,0 L0,6 L9,3 z" fill="#ff6b6b" />
		</marker>
		</defs>
		`;

		const startX = 100;
		const startY = 150;
		const gap = 200;

		if (this.stepIndex === 0) return;

		const prevStep = this.stepIndex > 1 ? this.steps[this.stepIndex-2] : null;
		const currStep = this.steps[this.stepIndex-1];

		if (prevStep) {
			const circleA = document.createElementNS("http://www.w3.org/2000/svg","circle");
			circleA.setAttribute("cx", startX);
			circleA.setAttribute("cy", startY);
			circleA.setAttribute("r", 30);
			circleA.classList.add("node");
			this.svg.appendChild(circleA);

			const textA = document.createElementNS("http://www.w3.org/2000/svg","text");
			textA.setAttribute("x", startX);
			textA.setAttribute("y", startY+5);
			textA.setAttribute("text-anchor","middle");
			textA.textContent = prevStep.A;
			this.svg.appendChild(textA);

			const circleB = document.createElementNS("http://www.w3.org/2000/svg","circle");
			circleB.setAttribute("cx", startX+gap);
			circleB.setAttribute("cy", startY);
			circleB.setAttribute("r", 30);
			circleB.classList.add("node","current");
			this.svg.appendChild(circleB);

			const textB = document.createElementNS("http://www.w3.org/2000/svg","text");
			textB.setAttribute("x", startX+gap);
			textB.setAttribute("y", startY+5);
			textB.setAttribute("text-anchor","middle");
			textB.textContent = prevStep.B;
			this.svg.appendChild(textB);

			const line = document.createElementNS("http://www.w3.org/2000/svg","line");
			line.setAttribute("x1", startX+30);
			line.setAttribute("y1", startY);
			line.setAttribute("x2", startX+gap-30);
			line.setAttribute("y2", startY);
			line.classList.add("edge");
			this.svg.appendChild(line);

			const textR = document.createElementNS("http://www.w3.org/2000/svg","text");
			textR.setAttribute("x", startX+gap/2);
			textR.setAttribute("y", startY-20);
			textR.setAttribute("text-anchor","middle");
			textR.textContent = `r = ${prevStep.r}`;
			this.svg.appendChild(textR);
		}
	}

	drawTable() {
		const tbody = document.querySelector("#"+this.table+" tbody");
		tbody.innerHTML = "";
		for (let i = 0; i < this.steps.length; i++) {
			const s = this.steps[i];
			const tr = document.createElement("tr");
			if (i === this.stepIndex - 1) tr.classList.add("current");
			tr.innerHTML = `<td>${s.step}</td><td>${s.A}</td><td>${s.B}</td><td>${s.q}</td><td>${s.r}</td>`;
			tbody.appendChild(tr);
		}
	}

	nextStep() {
		if (this.stepIndex >= this.steps.length) return;
		const step = this.steps[this.stepIndex++];
		this.drawTable();
		this.drawGraph(step);

		if (step.done) {
			this.log.textContent = `НОД найден: ${step.A}`;
		} else {
			this.log.textContent = `A = ${step.A}, B = ${step.B}, q = ${step.q}, r = ${step.r}`;
		}
	}

	start() {
		const a = parseInt(this.numA.value, 10);
		const b = parseInt(this.numB.value, 10);
		this.steps = this.euclidEducational(a, b);
		this.stepIndex = 0;
		this.nextStep();
	}

	reset() {
		this.stepIndex = 0;
		this.steps = [];
		this.log.textContent = "";
		document.querySelector("#"+this.table+" tbody").innerHTML = "";
		this.svg.innerHTML = "";
	}
}