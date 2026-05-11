class Ford_bellman {
    constructor(map, logId, tableId) {
        this.map = map;
        this.log = document.getElementById(logId);
        this.table = tableId;
        this.points = [];
        this.edges = [];
        this.graph = {};
        this.steps = [];
        this.stepIndex = 0;
        this.mode = 'add';
        this.selectedPoint = null;
    }

    setMode(mode) {
        this.mode = mode;
        this.selectedPoint = null;
        this.logMessage(`Режим: ${mode === 'add' ? 'добавление точек' : 'соединение вершин'}`);
    }

    handlePointClick(id) {
        if (this.mode !== 'connect') return;
        const point = this.points.find(p => p.id === id);
        if (!point) return;

        if (!this.selectedPoint) {
            this.selectedPoint = point;
            this.highlightNode(id, 'yellow');
            this.logMessage(`Выбрана вершина ${id}`);
            return;
        }

        if (this.selectedPoint.id === point.id) return;

        this.createEdge(this.selectedPoint, point);
        this.selectedPoint = null;
    }

    createEdge(a, b) {
        const exists = this.edges.find(e =>
            (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)
        );
        if (exists) {
            this.logMessage('Ребро уже существует');
            return;
        }

        const distance = this.calcDistance(a.coords, b.coords);
        const line = new ymaps.Polyline([a.coords, b.coords], {
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
        this.logMessage(`Создано ребро ${a.id} ↔ ${b.id} (${distance.toFixed(0)} м)`);
    }

    addPoint(coords) {
        if (this.mode !== 'add') return;
        const id = 'P' + this.points.length;
        const placemark = new ymaps.Placemark(coords, {
            balloonContent: id
        }, {
            preset: 'islands#blueCircleDotIcon'
        });
        placemark.events.add('click', () => this.handlePointClick(id));
        this.map.geoObjects.add(placemark);
        this.points.push({ id, coords, placemark });
        this.logMessage(`Добавлена вершина ${id}`);
    }

    calcDistance(a, b) {
        return ymaps.coordSystem.geo.getDistance(a, b);
    }

    buildGraph() {
        this.graph = {};
        this.points.forEach(p => { this.graph[p.id] = {}; });
        this.edges.forEach(e => {
            this.graph[e.from][e.to] = e.weight;
            this.graph[e.to][e.from] = e.weight;   // неориентированный граф
        });
    }

    startAlgorithm() {
        if (this.points.length < 2) {
            alert('Добавьте минимум 2 точки');
            return;
        }
        this.buildGraph();
        const start = this.points[0].id;
        this.steps = this.bellmanFordEducational(this.graph, start);
        this.stepIndex = 0;
        this.logMessage(`Алгоритм запущен из вершины ${start}`);
        this.updateTable({}, {});
    }

    bellmanFordEducational(graph, start) {
        const distances = {};
        const previous = {};
        const vertices = Object.keys(graph);
        const steps = [];

        vertices.forEach(v => {
            distances[v] = Infinity;
            previous[v] = null;
        });
        distances[start] = 0;

        steps.push({
            action: 'init',
            distances: { ...distances },
            previous: { ...previous }
        });

        for (let i = 1; i < vertices.length; i++) {
            steps.push({ action: 'iteration_start', iteration: i });

            for (const from in graph) {
                for (const to in graph[from]) {
                    const weight = graph[from][to];
                    const candidate = distances[from] + weight;

                    steps.push({
                        action: 'check',
                        from,
                        to,
                        weight,
                        candidate,
                        iteration: i,
                        distances: { ...distances },
                        previous: { ...previous }
                    });

                    if (candidate < distances[to]) {
                        distances[to] = candidate;
                        previous[to] = from;

                        steps.push({
                            action: 'update',
                            from,
                            to,
                            newDist: candidate,
                            distances: { ...distances },
                            previous: { ...previous }
                        });
                    }
                }
            }

            steps.push({
                action: 'iteration_end',
                iteration: i,
                distances: { ...distances },
                previous: { ...previous }
            });
        }

        steps.push({
            action: 'finish',
            distances: { ...distances },
            previous: { ...previous }
        });

        return steps;
    }

    nextStep() {
        if (this.stepIndex >= this.steps.length) return;
        const step = this.steps[this.stepIndex++];

        switch (step.action) {
            case 'init':
                this.logMessage('Инициализация расстояний');
                this.updateTable(step.distances, step.previous);
                break;
            case 'iteration_start':
                this.logMessage(`Начало итерации ${step.iteration}`);
                break;
            case 'check':
                this.highlightEdge(step.from, step.to, '#ffaa00');
                this.logMessage(
                    `Итерация ${step.iteration}: проверка ребра ${step.from} → ${step.to} (вес ${step.weight}), кандидат = ${step.candidate === Infinity ? '∞' : Math.round(step.candidate) + ' м'}`
                );
                setTimeout(() => {
                    const edge = this.edges.find(e =>
                        (e.from === step.from && e.to === step.to) ||
                        (e.from === step.to && e.to === step.from)
                    );
                    if (edge && edge.line.options.get('strokeColor') === '#ffaa00') {
                        this.resetEdgeColor(step.from, step.to);
                    }
                }, 500);
                break;
            case 'update':
                this.highlightEdge(step.from, step.to, '#00aa00');
                this.logMessage(
                    `Итерация ${step.iteration}: обновлено расстояние до ${step.to} = ${Math.round(step.newDist)} м`
                );
                this.updateTable(step.distances, step.previous);
                break;
            case 'iteration_end':
                this.logMessage(`Конец итерации ${step.iteration}`);
                this.updateTable(step.distances, step.previous);
                break;
            case 'finish':
                this.showFinalPath(step.previous);
                this.logMessage('Алгоритм завершён');
                break;
        }
    }

    showFinalPath(previous) {
        const lastId = this.points[this.points.length - 1]?.id;
        if (!lastId) return;
        let current = lastId;
        while (previous[current]) {
            this.highlightEdge(previous[current], current, '#FF0000', 8);
            current = previous[current];
        }
    }

    highlightNode(id, color) {
        const point = this.points.find(p => p.id === id);
        if (!point) return;
        const presetMap = {
            yellow: 'islands#yellowCircleDotIcon',
            green: 'islands#greenCircleDotIcon',
            red: 'islands#redCircleDotIcon'
        };
        point.placemark.options.set('preset', presetMap[color] || 'islands#blueCircleDotIcon');
    }

    highlightEdge(from, to, color, width = 6) {
        const edge = this.edges.find(e =>
            (e.from === from && e.to === to) || (e.from === to && e.to === from)
        );
        if (!edge) return;
        edge.line.options.set('strokeColor', color);
        edge.line.options.set('strokeWidth', width);
    }

    resetEdgeColor(from, to) {
        const edge = this.edges.find(e =>
            (e.from === from && e.to === to) || (e.from === to && e.to === from)
        );
        if (edge) {
            edge.line.options.set('strokeColor', '#0000FF');
            edge.line.options.set('strokeWidth', 4);
        }
    }

    updateTable(distances, previous) {
        const tbody = document.querySelector(`#${this.table} tbody`);
        tbody.innerHTML = '';
        for (const v in this.graph) {
            const tr = document.createElement('tr');
            let dist = distances[v];
            dist = (dist === Infinity || dist == null) ? '∞' : Math.round(dist) + ' м';
            tr.innerHTML = `<td>${v}</td><td>${dist}</td><td>${previous[v] || ''}</td>`;
            tbody.appendChild(tr);
        }
    }

    logMessage(text) {
        this.log.innerHTML = `<div>${text}</div>`;
        this.log.scrollTop = this.log.scrollHeight;
    }

    reset() {
        this.stepIndex = 0;
        this.log.innerHTML = '';
        // Сброс цветов рёбер и вершин
        this.edges.forEach(e => {
            e.line.options.set('strokeColor', '#0000FF');
            e.line.options.set('strokeWidth', 4);
        });
        this.points.forEach(p => p.placemark.options.set('preset', 'islands#blueCircleDotIcon'));
        this.updateTable({}, {});
    }

    clearMap() {
        this.map.geoObjects.removeAll();
        this.points = [];
        this.edges = [];
        this.graph = {};
        this.steps = [];
        this.stepIndex = 0;
        this.log.innerHTML = '';
        this.updateTable({}, {});
    }
}