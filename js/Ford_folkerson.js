class Ford_folkerson {
    constructor(map, logId, tableId) {
        this.map = map;
        this.log = document.getElementById(logId);
        this.tableId = tableId;
        this.points = [];          // {id, coords, placemark}
        this.edges = [];           // {from, to, capacity, flow, line}
        this.graph = {};           // ориентированный граф: graph[from][to] = capacity
        this.steps = [];
        this.stepIndex = 0;
        this.mode = 'add';
        this.selectedPoint = null;
    }

    setMode(mode) {
        this.mode = mode;
        this.selectedPoint = null;
        this.logMessage(`Режим: ${mode === 'add' ? 'добавление точек' : 'соединение вершин (ориентированное)'}`);
    }

    handlePointClick(id) {
        if (this.mode !== 'connect') return;
        const point = this.points.find(p => p.id === id);
        if (!point) return;

        // Первая вершина
        if (!this.selectedPoint) {
            this.selectedPoint = point;
            this.highlightNode(id, 'yellow');
            this.logMessage(`Выбрана исходная вершина ${id}`);
            return;
        }

        // Нельзя соединять саму с собой
        if (this.selectedPoint.id === point.id) {
            this.logMessage('Нельзя соединить вершину саму с собой');
            return;
        }

        // Запрашиваем пропускную способность
        const capacity = parseFloat(prompt('Введите пропускную способность ребра:', '10'));
        if (isNaN(capacity) || capacity <= 0) {
            alert('Некорректное значение пропускной способности');
            return;
        }

        this.createEdge(this.selectedPoint, point, capacity);
        this.selectedPoint = null;
        this.clearNodeHighlights();
    }

    createEdge(fromPoint, toPoint, capacity) {
        // Проверка на дублирование ориентированного ребра
        const exists = this.edges.find(e => e.from === fromPoint.id && e.to === toPoint.id);
        if (exists) {
            this.logMessage(`Ориентированное ребро ${fromPoint.id} → ${toPoint.id} уже существует`);
            return;
        }

        // Создаём линию со стрелкой (маркер начала не нужен, только конец)
        const line = new ymaps.Polyline(
            [fromPoint.coords, toPoint.coords],
            {}, // balloonContent пока пустой, обновим позже
            {
                strokeColor: '#0000FF',
                strokeWidth: 4,
                // Стрелка на конце (потребуется добавить маркер в стилях, либо используем готовый)
                // Для простоты можно не рисовать стрелку, направление понятно из контекста.
            }
        );
        this.map.geoObjects.add(line);

        const edge = {
            from: fromPoint.id,
            to: toPoint.id,
            capacity: capacity,
            flow: 0,
            line: line
        };
        this.edges.push(edge);
        this.logMessage(`Добавлено ребро ${fromPoint.id} → ${toPoint.id} (проп. спос. = ${capacity})`);
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

    buildGraph() {
        this.graph = {};
        // Инициализируем пустые объекты для всех вершин
        this.points.forEach(p => { this.graph[p.id] = {}; });
        // Заполняем capacity из рёбер
        this.edges.forEach(e => {
            if (!this.graph[e.from]) this.graph[e.from] = {};
            this.graph[e.from][e.to] = e.capacity;
        });
    }

    startAlgorithm() {
        if (this.points.length < 2) {
            alert('Добавьте минимум две точки (исток и сток)');
            return;
        }
        this.buildGraph();
        const source = this.points[0].id;
        const sink = this.points[this.points.length - 1].id;

        // Сбрасываем все потоки
        this.edges.forEach(e => e.flow = 0);
        this.steps = this.fordFulkersonEducational(this.graph, source, sink);
        this.stepIndex = 0;
        this.logMessage(`Алгоритм запущен: исток = ${source}, сток = ${sink}`);
        this.updateTable();
    }

    fordFulkersonEducational(graph, source, sink) {
        const flow = {};   // ключ "from->to"
        const steps = [];

        // Инициализация потоков нулями
        for (const u in graph) {
            for (const v in graph[u]) {
                flow[`${u}->${v}`] = 0;
            }
        }

        // Рекурсивный DFS, сохраняющий шаги
        const dfs = (v, t, visited, minCap) => {
            if (v === t) return minCap;
            visited[v] = true;

            for (const u in graph[v]) {
                const residual = graph[v][u] - (flow[`${v}->${u}`] || 0);

                steps.push({
                    action: 'check',
                    from: v,
                    to: u,
                    residual,
                    flow: { ...flow }
                });

                if (!visited[u] && residual > 0) {
                    const pushed = dfs(u, t, visited, Math.min(minCap, residual));
                    if (pushed > 0) {
                        flow[`${v}->${u}`] += pushed;
                        flow[`${u}->${v}`] = (flow[`${u}->${v}`] || 0) - pushed; // обратное ребро

                        steps.push({
                            action: 'augment',
                            from: v,
                            to: u,
                            amount: pushed,
                            flow: { ...flow }
                        });
                        return pushed;
                    }
                }
            }
            return 0;
        };

        while (true) {
            const visited = {};
            const pushed = dfs(source, sink, visited, Infinity);
            steps.push({
                action: 'iteration_done',
                pushed,
                flow: { ...flow }
            });
            if (pushed === 0) break;
        }

        steps.push({
            action: 'done',
            flow: { ...flow }
        });
        return steps;
    }

    nextStep() {
        if (this.stepIndex >= this.steps.length) return;

        const step = this.steps[this.stepIndex++];

        switch (step.action) {
            case 'check':
                this.highlightEdge(step.from, step.to, '#ffaa00');
                this.logMessage(
                    `Проверяем ребро ${step.from} → ${step.to}, остаточная способность = ${step.residual}`
                );
                this.updateTable(step.flow);
                // Через 500 мс возвращаем обычный цвет, если ребро не было улучшено
                setTimeout(() => {
                    const edge = this.edges.find(e => e.from === step.from && e.to === step.to);
                    if (edge && edge.line.options.get('strokeColor') === '#ffaa00') {
                        this.resetEdgeColor(step.from, step.to);
                    }
                }, 500);
                break;

            case 'augment':
                this.highlightEdge(step.from, step.to, '#00aa00');
                this.logMessage(
                    `Увеличиваем поток по ребру ${step.from} → ${step.to} на ${step.amount}`
                );
                this.updateTable(step.flow);
                break;

            case 'iteration_done':
                if (step.pushed > 0) {
                    this.logMessage(`Найден увеличивающий путь, поток = ${step.pushed}`);
                } else {
                    this.logMessage('Увеличивающих путей больше нет');
                }
                this.updateTable(step.flow);
                break;

            case 'done':
                this.logMessage('Алгоритм завершён');
                this.showFinalFlow();
                this.updateTable(step.flow);
                break;
        }
    }

    showFinalFlow() {
        // Подсвечиваем все рёбра с ненулевым потоком
        this.edges.forEach(e => {
            if (e.flow > 0) {
                e.line.options.set('strokeColor', '#FF0000');
                e.line.options.set('strokeWidth', 6);
            }
        });
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

    clearNodeHighlights() {
        this.points.forEach(p => p.placemark.options.set('preset', 'islands#blueCircleDotIcon'));
    }

    highlightEdge(from, to, color, width = 6) {
        const edge = this.edges.find(e => e.from === from && e.to === to);
        if (!edge) return;
        edge.line.options.set('strokeColor', color);
        edge.line.options.set('strokeWidth', width);
    }

    resetEdgeColor(from, to) {
        const edge = this.edges.find(e => e.from === from && e.to === to);
        if (edge) {
            edge.line.options.set('strokeColor', '#0000FF');
            edge.line.options.set('strokeWidth', 4);
        }
    }

    updateTable(flow = {}) {
        const tbody = document.querySelector(`#${this.tableId} tbody`);
        tbody.innerHTML = '';
        this.edges.forEach(e => {
            const key = `${e.from}->${e.to}`;
            const currentFlow = flow[key] !== undefined ? flow[key] : e.flow;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.from} → ${e.to}</td>
                <td>${currentFlow}</td>
                <td>${e.capacity}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    logMessage(text) {
        this.log.innerHTML = `<div>${text}</div>`;
        this.log.scrollTop = this.log.scrollHeight;
    }

    reset() {
        this.stepIndex = 0;
        this.log.innerHTML = '';
        // Сбрасываем цвета и потоки
        this.edges.forEach(e => {
            e.flow = 0;
            e.line.options.set('strokeColor', '#0000FF');
            e.line.options.set('strokeWidth', 4);
        });
        this.points.forEach(p => p.placemark.options.set('preset', 'islands#blueCircleDotIcon'));
        this.updateTable();
    }

    clearMap() {
        this.map.geoObjects.removeAll();
        this.points = [];
        this.edges = [];
        this.graph = {};
        this.steps = [];
        this.stepIndex = 0;
        this.log.innerHTML = '';
        this.updateTable();
    }
}