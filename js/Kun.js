class Kun {
    constructor(map, logId, tableId) {
        this.map = map;
        this.log = document.getElementById(logId);
        this.tableId = tableId;
        this.leftPoints = [];     // {id, coords, placemark}
        this.rightPoints = [];    // {id, coords, placemark}
        this.edges = [];          // {from (leftId), to (rightId), line}
        this.graph = {};          // для левых: graph[leftId] = [rightId1, ...]
        this.steps = [];
        this.stepIndex = 0;
        this.mode = 'add_left';   // 'add_left', 'add_right', 'connect'
        this.selectedPoint = null;
    }

    setMode(mode) {
        this.mode = mode;
        this.selectedPoint = null;
        const modeNames = {
            add_left: 'добавление левых вершин',
            add_right: 'добавление правых вершин',
            connect: 'соединение (левая → правая)'
        };
        this.logMessage(`Режим: ${modeNames[mode] || mode}`);
        // Сброс подсветки выбранной вершины
        this.clearNodeHighlights();
    }

    handlePointClick(id, type) {
        if (this.mode === 'add_left' || this.mode === 'add_right') {
            return; // обработка добавления идёт через события карты
        }
        if (this.mode !== 'connect') return;

        const point = this.findPointById(id);
        if (!point) return;

        // Первая выбранная вершина должна быть левой
        if (!this.selectedPoint) {
            if (point.type !== 'left') {
                this.logMessage('Сначала выберите левую вершину');
                return;
            }
            this.selectedPoint = point;
            this.highlightNode(id, 'yellow');
            this.logMessage(`Выбрана левая вершина ${id}`);
            return;
        }

        // Вторая вершина должна быть правой
        if (point.type !== 'right') {
            this.logMessage('Второй необходимо выбрать правую вершину');
            return;
        }
        if (this.selectedPoint.id === point.id) return;

        this.createEdge(this.selectedPoint.id, point.id);
        this.selectedPoint = null;
        this.clearNodeHighlights();
    }

    createEdge(leftId, rightId) {
        // Проверка существующего ребра
        const exists = this.edges.find(e => e.from === leftId && e.to === rightId);
        if (exists) {
            this.logMessage('Такое ребро уже существует');
            return;
        }

        const leftPoint = this.leftPoints.find(p => p.id === leftId);
        const rightPoint = this.rightPoints.find(p => p.id === rightId);
        if (!leftPoint || !rightPoint) return;

        const distance = ymaps.coordSystem.geo.getDistance(leftPoint.coords, rightPoint.coords);
        const line = new ymaps.Polyline([leftPoint.coords, rightPoint.coords], {
            balloonContent: distance.toFixed(0) + ' м'
        }, {
            strokeColor: '#0000FF',
            strokeWidth: 3
        });
        this.map.geoObjects.add(line);
        this.edges.push({ from: leftId, to: rightId, line });
        // Добавляем в граф
        if (!this.graph[leftId]) this.graph[leftId] = [];
        this.graph[leftId].push(rightId);
        this.logMessage(`Ребро ${leftId} → ${rightId} (${distance.toFixed(0)} м)`);
    }

    addPoint(coords) {
        if (this.mode !== 'add_left' && this.mode !== 'add_right') return;
        const type = this.mode === 'add_left' ? 'left' : 'right';
        const arr = type === 'left' ? this.leftPoints : this.rightPoints;
        const id = (type === 'left' ? 'L' : 'R') + arr.length;

        const preset = type === 'left' ? 'islands#blueCircleDotIcon' : 'islands#greenCircleDotIcon';
        const placemark = new ymaps.Placemark(coords, {
            balloonContent: id
        }, {
            preset: preset
        });
        placemark.events.add('click', () => this.handlePointClick(id, type));
        this.map.geoObjects.add(placemark);
        arr.push({ id, coords, placemark, type });
        this.logMessage(`Добавлена ${type === 'left' ? 'левая' : 'правая'} вершина ${id}`);
    }

    findPointById(id) {
        return [...this.leftPoints, ...this.rightPoints].find(p => p.id === id);
    }

    buildGraph() {
        this.graph = {};
        this.leftPoints.forEach(p => { this.graph[p.id] = []; });
        this.edges.forEach(e => {
            if (!this.graph[e.from]) this.graph[e.from] = [];
            this.graph[e.from].push(e.to);
        });
    }

    startAlgorithm() {
        if (this.leftPoints.length === 0 || this.rightPoints.length === 0) {
            alert('Добавьте хотя бы одну левую и одну правую вершину');
            return;
        }
        this.buildGraph();
        this.steps = this.kuhnEducational(this.graph);
        this.stepIndex = 0;
        this.logMessage('Алгоритм Куна запущен');
        this.updateTable({}, {});
    }

    kuhnEducational(graph) {
        const match = {};   // match[rightId] = leftId
        const steps = [];

        // Рекурсивный DFS с сохранением шагов
        const dfs = (v, visited) => {
            visited[v] = true;
            steps.push({
                action: 'visit_right',
                vertex: v,
                visited: { ...visited },
                match: { ...match }
            });

            for (const u of graph[v]) {
                steps.push({
                    action: 'check_edge',
                    from: v,
                    to: u,
                    match: { ...match }
                });

                if (!match[u] || (!visited[match[u]] && dfs(match[u], visited))) {
                    match[u] = v;
                    steps.push({
                        action: 'match',
                        from: v,
                        to: u,
                        match: { ...match }
                    });
                    return true;
                }
            }
            return false;
        };

        for (const v of Object.keys(graph)) {
            const visited = {};
            steps.push({
                action: 'start_left',
                vertex: v,
                match: { ...match }
            });
            dfs(v, visited);
        }

        steps.push({
            action: 'done',
            match: { ...match }
        });
        return steps;
    }

    nextStep() {
        if (this.stepIndex >= this.steps.length) return;

        const step = this.steps[this.stepIndex++];

        switch (step.action) {
            case 'start_left':
                this.logMessage(`Начинаем поиск для левой вершины ${step.vertex}`);
                this.highlightNode(step.vertex, 'yellow');
                this.updateTable(step.match);
                break;

            case 'visit_right':
                this.logMessage(`Посещаем правую вершину ${step.vertex}`);
                this.highlightNode(step.vertex, 'orange');
                this.updateTable(step.match, step.visited);
                break;

            case 'check_edge':
                this.highlightEdge(step.from, step.to, '#ffaa00');
                this.logMessage(`Проверяем ребро ${step.from} → ${step.to}`);
                setTimeout(() => {
                    const edge = this.edges.find(e => e.from === step.from && e.to === step.to);
                    if (edge && edge.line.options.get('strokeColor') === '#ffaa00') {
                        this.resetEdgeColor(step.from, step.to);
                    }
                }, 500);
                break;

            case 'match':
                this.highlightEdge(step.from, step.to, '#00aa00');
                this.logMessage(`Сопоставляем ${step.from} с ${step.to}`);
                this.updateTable(step.match);
                break;

            case 'done':
                this.logMessage('Алгоритм завершён');
                this.showFinalMatching(step.match);
                this.updateTable(step.match);
                break;
        }
    }

    showFinalMatching(match) {
        // Подсвечиваем все рёбра паросочетания красным
        for (const rightId in match) {
            const leftId = match[rightId];
            this.highlightEdge(leftId, rightId, '#FF0000', 5);
        }
    }

    highlightNode(id, color) {
        const point = this.findPointById(id);
        if (!point) return;
        const presetMap = {
            yellow: 'islands#yellowCircleDotIcon',
            orange: 'islands#orangeCircleDotIcon',
            red: 'islands#redCircleDotIcon',
            green: 'islands#greenCircleDotIcon',
            blue: 'islands#blueCircleDotIcon'
        };
        point.placemark.options.set('preset', presetMap[color] || 'islands#blueCircleDotIcon');
    }

    clearNodeHighlights() {
        this.leftPoints.forEach(p => p.placemark.options.set('preset', 'islands#blueCircleDotIcon'));
        this.rightPoints.forEach(p => p.placemark.options.set('preset', 'islands#greenCircleDotIcon'));
    }

    highlightEdge(from, to, color, width = 5) {
        const edge = this.edges.find(e => e.from === from && e.to === to);
        if (!edge) return;
        edge.line.options.set('strokeColor', color);
        edge.line.options.set('strokeWidth', width);
    }

    resetEdgeColor(from, to) {
        const edge = this.edges.find(e => e.from === from && e.to === to);
        if (edge) {
            edge.line.options.set('strokeColor', '#0000FF');
            edge.line.options.set('strokeWidth', 3);
        }
    }

    updateTable(match = {}, visited = {}) {
        const tbody = document.querySelector(`#${this.tableId} tbody`);
        tbody.innerHTML = '';
        // Строки по левым вершинам
        for (const leftId in this.graph) {
            const tr = document.createElement('tr');
            const partner = Object.keys(match).find(rid => match[rid] === leftId) || '';
            tr.innerHTML = `
                <td>${leftId}</td>
                <td>${partner}</td>
                <td>${visited[partner] ? '+' : ''}</td>
            `;
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
        this.edges.forEach(e => {
            e.line.options.set('strokeColor', '#0000FF');
            e.line.options.set('strokeWidth', 3);
        });
        this.leftPoints.forEach(p => p.placemark.options.set('preset', 'islands#blueCircleDotIcon'));
        this.rightPoints.forEach(p => p.placemark.options.set('preset', 'islands#greenCircleDotIcon'));
        this.updateTable({}, {});
    }

    clearMap() {
        this.map.geoObjects.removeAll();
        this.leftPoints = [];
        this.rightPoints = [];
        this.edges = [];
        this.graph = {};
        this.steps = [];
        this.stepIndex = 0;
        this.log.innerHTML = '';
        this.updateTable({}, {});
    }
}