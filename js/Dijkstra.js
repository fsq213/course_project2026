class Dijkstra {
    constructor(map, logId, tableId) {
        this.map = map;
        this.log = document.getElementById(logId);
        this.table = tableId;
        this.points = [];
        this.edges = [];
        this.graph = {};
        this.steps = [];
        this.stepIndex = 0;
        this.currentLines = [];
		this.mode = 'add';
		this.selectedPoint = null;
    }
	setMode(mode) {
		this.mode = mode;
		this.selectedPoint = null;
		this.logMessage(
			`Режим: ${mode}`
		);
	}
	handlePointClick(id) {
		if (this.mode !== 'connect') {
			return;
		}
		const point = this.points.find(
			p => p.id === id
		);
		if (!point) {
			return;
		}
		// первая вершина
		if (!this.selectedPoint) {
			this.selectedPoint = point;
			this.highlightNode(id, 'yellow');
			this.logMessage(
				`Выбрана вершина ${id}`
			);
			return;
		}
		// нельзя соединять саму с собой
		if (this.selectedPoint.id === point.id) {
			return;
		}
		this.createEdge(
			this.selectedPoint,
			point
		);
		this.selectedPoint = null;
	}
	createEdge(a, b) {
		// проверка дубликатов
		const exists = this.edges.find(e => {
			return (
				(e.from === a.id && e.to === b.id) ||
				(e.from === b.id && e.to === a.id)
			);
		});
		if (exists) {
			this.logMessage(
				`Ребро уже существует`
			);
			return;
		}
		const distance = this.calcDistance(
			a.coords,
			b.coords
		);
		const line = new ymaps.Polyline(
			[
				a.coords,
				b.coords
			],
			{
				balloonContent:
					distance.toFixed(0) + ' м'
			},
			{
				strokeColor: '#0000FF',
				strokeWidth: 4
			}
		);
		this.map.geoObjects.add(line);
		this.edges.push({
			from: a.id,
			to: b.id,
			weight: distance,
			line
		});
		this.logMessage(
			`Создано ребро ${a.id} ↔ ${b.id}`
		);
	}
    addPoint(coords) {
        const id = 'P' + this.points.length;
        const placemark = new ymaps.Placemark(coords, {
            balloonContent: id
        }, {
            preset: 'islands#blueCircleDotIcon'
        });
		placemark.events.add('click', () => {
			this.handlePointClick(id);
		});
        this.map.geoObjects.add(placemark);
        this.points.push({
            id,
            coords,
            placemark
        });
        this.logMessage(`Добавлена вершина ${id}`);
        /*if (this.points.length > 1) {
            this.connectNewPoint(
				this.points[this.points.length - 1]
			);
        }*/
    }
	connectNewPoint(newPoint) {
		for (const point of this.points) {
			if (point.id === newPoint.id) {
				continue;
			}
			const distance = this.calcDistance(
				point.coords,
				newPoint.coords
			);
			const line = new ymaps.Polyline(
				[
					point.coords,
					newPoint.coords
				],
				{
					balloonContent:
						distance.toFixed(0) + ' м'
				},
				{
					strokeColor: '#0000FF',
					strokeWidth: 3,
					opacity: 0.5
				}
			);
			this.map.geoObjects.add(line);
			this.edges.push({
				from: point.id,
				to: newPoint.id,
				weight: distance,
				line
			});
			this.logMessage(
				`Ребро ${point.id} ↔ ${newPoint.id}: ${distance.toFixed(0)} м`
			);
		}
	}
    connectLastPoints() {
        const a = this.points[this.points.length - 2];
        const b = this.points[this.points.length - 1];
        const distance = this.calcDistance(a.coords, b.coords);
        const line = new ymaps.Polyline([
            a.coords,
            b.coords
        ], {
            balloonContent: distance.toFixed(0) + ' м'
        }, {
            strokeColor: '#0000FF',
            strokeWidth: 4
        });
        this.map.geoObjects.add(line);
        this.edges.push({
            from: a.id,
            to: b.id,
            weight: distance,
            line
        });
        this.logMessage(
            `Добавлено ребро ${a.id} → ${b.id} (${distance.toFixed(0)} м)`
        );
    }
    calcDistance(a, b) {
        return ymaps.coordSystem.geo.getDistance(a, b);
    }
    buildGraph() {
        this.graph = {};
        this.points.forEach(p => {
            this.graph[p.id] = {};
        });
        this.edges.forEach(e => {

            this.graph[e.from][e.to] = e.weight;
            this.graph[e.to][e.from] = e.weight;
        });
    }
    startAlgorithm() {
        if (this.points.length < 2) {
            alert('Добавьте минимум 2 точки');
            return;
        }
        this.buildGraph();
        const start = this.points[0].id;
        const finish = this.points[this.points.length - 1].id;
        this.steps = this.dijkstraEducational(this.graph, start, finish);
        this.stepIndex = 0;
        this.logMessage(
            `Алгоритм запущен: ${start} → ${finish}`
        );
        this.updateTable({}, {}, {});
    }
    dijkstraEducational(graph, start, finish) {
        const distances = {};
        const visited = {};
        const previous = {};
        const steps = [];
        for (const v in graph) {
            distances[v] = Infinity;
            visited[v] = false;
            previous[v] = null;
        }
        distances[start] = 0;
        steps.push({
            action: 'init',
            distances: { ...distances },
            visited: { ...visited },
            previous: { ...previous }
        });
        while (true) {
            let current = null;
            let min = Infinity;
            for (const v in distances) {
                if (!visited[v] && distances[v] < min) {
                    min = distances[v];
                    current = v;
                }
            }
            if (!current) {
                break;
            }
            steps.push({
                action: 'select',
                current
            });
            visited[current] = true;
            for (const n in graph[current]) {
                if (visited[n]) {
                    continue;
                }
                const candidate = distances[current] + graph[current][n];
                steps.push({
                    action: 'check',
                    from: current,
                    to: n,
                    candidate
                });
                if (candidate < distances[n]) {
                    distances[n] = candidate;
                    previous[n] = current;
                    steps.push({
                        action: 'update',
                        vertex: n,
                        distance: candidate,
                        via: current,
                        distances: { ...distances },
                        visited: { ...visited },
                        previous: { ...previous }
                    });
                }
            }
            steps.push({
                action: 'visited',
                vertex: current,
                distances: { ...distances },
                visited: { ...visited },
                previous: { ...previous }
            });
        }
        steps.push({
            action: 'finish',
            finish,
            previous
        });
        return steps;
    }
    nextStep() {
        if (this.stepIndex >= this.steps.length) {
            return;
        }
        const step = this.steps[this.stepIndex++];
        switch (step.action) {
            case 'init':
                this.logMessage(
                    'Инициализация алгоритма'
                );
                this.updateTable(
                    step.distances,
                    step.visited,
                    step.previous
                );
                break;
            case 'select':
                this.highlightNode(step.current, 'red');
                this.logMessage(
                    `Выбрана вершина ${step.current}`
                );
                break;
            case 'check':
				this.highlightEdge(
					step.from,
					step.to,
					'#ffaa00'
				);
				this.logMessage(
					`Проверка ребра ${step.from} → ${step.to}`
				);
				setTimeout(() => {
					const edge = this.edges.find(e => {
						return (
							(e.from === step.from &&
							 e.to === step.to) ||
							(e.from === step.to &&
							 e.to === step.from)
						);
					});
					if (!edge) {
						return;
					}
					// если ребро не стало зелёным
					const color =
						edge.line.options.get('strokeColor');
					if (color === '#ffaa00') {
						this.resetEdgeColor(
							step.from,
							step.to
						);
					}
				}, 500);
				break;
            case 'update':
                this.highlightEdge(step.via, step.vertex, '#00aa00');
                this.logMessage(
                    `Обновлено расстояние до ${step.vertex}`
                );
                this.updateTable(
                    step.distances,
                    step.visited,
                    step.previous
                );
                break;
            case 'visited':
                this.highlightNode(step.vertex, 'green');
                this.logMessage(
                    `Вершина ${step.vertex} обработана`
                );
                this.updateTable(
                    step.distances,
                    step.visited,
                    step.previous
                );
                break;
            case 'finish':
                this.showFinalPath(step.finish, step.previous);
                this.logMessage(
                    'Алгоритм завершён'
                );
                break;
        }
    }
    showFinalPath(finish, previous) {
        let current = finish;
        while (previous[current]) {
            this.highlightEdge(
                previous[current],
                current,
                '#FF0000',
                8
            );
            current = previous[current];
        }
    }
    highlightNode(id, color) {
        const point = this.points.find(p => p.id === id);
        if (!point) {
            return;
        }
        point.placemark.options.set(
            'preset',
            'islands#redCircleDotIcon'
        );
    }
    highlightEdge(from, to, color, width = 6) {
        const edge = this.edges.find(e => {
            return (
                (e.from === from && e.to === to) ||
                (e.from === to && e.to === from)
            );
        });
        if (!edge) {
            return;
        }
        edge.line.options.set('strokeColor', color);
        edge.line.options.set('strokeWidth', width);
    }
    updateTable(distances, visited, previous) {
        const tbody = document.querySelector(`#${this.table} tbody`);
        tbody.innerHTML = '';
        for (const v in this.graph) {
            const tr = document.createElement('tr');
            let dist = distances[v];
            if (dist === Infinity || dist == null) {
                dist = '∞';
            } else {
                dist = Math.round(dist) + ' м';
            }
            tr.innerHTML = `
                <td>${v}</td>
                <td>${dist}</td>
                <td>${visited[v] ? '+' : ''}</td>
                <td>${previous[v] || ''}</td>
            `;
            tbody.appendChild(tr);
        }
    }
	resetEdgeColor(from, to) {
		const edge = this.edges.find(e => {
			return (
				(e.from === from && e.to === to) ||
				(e.from === to && e.to === from)
			);
		});
		if (!edge) {
			return;
		}
		edge.line.options.set(
			'strokeColor',
			'#0000FF'
		);
		edge.line.options.set(
			'strokeWidth',
			4
		);
	}
    logMessage(text) {
        this.log.innerHTML = `<div>${text}</div>`;
        this.log.scrollTop = this.log.scrollHeight;
    }
    reset() {
        this.stepIndex = 0;
        this.log.innerHTML = '';
    }
    clearMap() {
        this.map.geoObjects.removeAll();
        this.points = [];
        this.edges = [];
        this.graph = {};
        this.steps = [];
        this.stepIndex = 0;
        this.log.innerHTML = '';
        this.updateTable({}, {}, {});
    }
}