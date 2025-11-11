class PanelManager {
    constructor(gridManager) {
        this.panels = new Map();
        this.nextPanelId = 1;
        this.gridManager = gridManager;
        this.chartType = 'stackedBar'; // По умолчанию stacked bar chart
    }

    createPanel(type, size, metrics, position = null) {
        const panelId = `panel-${this.nextPanelId++}`;
        const [cols, rows] = size.split('x').map(Number);

        const panel = {
            id: panelId,
            type: type,
            size: size,
            metrics: metrics,
            position: position || this.findEmptyPosition(cols, rows),
            data: null
        };

        this.panels.set(panelId, panel);
        this.renderPanel(panel);
        return panel;
    }

    findEmptyPosition(cols, rows) {
        const grid = document.getElementById('dashboardGrid');
        const existingPanels = Array.from(grid.querySelectorAll('.dashboard-panel'));

        // Простой алгоритм размещения - ищем первое свободное место
        let x = 0, y = 0;
        let found = false;

        while (!found) {
            const collision = existingPanels.some(panel => {
                const panelX = parseInt(panel.style.left) || 0;
                const panelY = parseInt(panel.style.top) || 0;
                const panelCols = parseInt(panel.dataset.cols);
                const panelRows = parseInt(panel.dataset.rows);

                return !(x + cols <= panelX || panelX + panelCols <= x ||
                        y + rows <= panelY || panelY + panelRows <= y);
            });

            if (!collision) {
                found = true;
            } else {
                x += 2;
                if (x > 20) {
                    x = 0;
                    y += 2;
                }
            }
        }

        return { x, y };
    }

    renderPanel(panel) {
        const grid = document.getElementById('dashboardGrid');
        const [cols, rows] = panel.size.split('x').map(Number);

        const panelElement = document.createElement('div');
        panelElement.className = `dashboard-panel card`;
        panelElement.id = panel.id;
        panelElement.dataset.cols = cols;
        panelElement.dataset.rows = rows;

        panelElement.style.width = `${cols * 100}px`;
        panelElement.style.height = `${rows * 80}px`;
        panelElement.style.left = `${panel.position.x * 100}px`;
        panelElement.style.top = `${panel.position.y * 80}px`;

        panelElement.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center py-2">
                <h6 class="mb-0 panel-title">${this.getPanelTitle(panel)}</h6>
                <div class="panel-actions">
                    <button class="btn btn-sm btn-outline-secondary" data-action="refresh">🔄</button>
                    <button class="btn btn-sm btn-outline-secondary" data-action="edit">✏️</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="remove">🗑️</button>
                </div>
            </div>
            <div class="card-body p-2 panel-content">
                ${panel.type === 'chart' ?
                    '<canvas class="panel-chart"></canvas>' :
                    '<div class="table-responsive"><table class="table table-sm table-striped"><thead class="table-dark"><tr id="table-header"></tr></thead><tbody id="table-body"></tbody></table></div>'
                }
            </div>
            <div class="resize-handle"></div>
        `;

        grid.appendChild(panelElement);
        this.setupPanelEvents(panelElement, panel);
        this.updatePanelContent(panel);
    }

    getPanelTitle(panel) {
        const typeNames = {
            'chart': '📈 График',
            'table': '📋 Таблица'
        };

        const metricNames = panel.metrics.slice(0, 2).map(metric =>
            this.getMetricDisplayName(metric)
        ).join(', ');

        const suffix = panel.metrics.length > 2 ? '...' : '';
        return `${typeNames[panel.type]} - ${metricNames}${suffix}`;
    }

    getMetricDisplayName(metric) {
        const names = {
            'cpu_usage': 'CPU',
            'memory_usage': 'Memory',
            'disk_usage': 'Disk',
            'network_in': 'Net In',
            'network_out': 'Net Out',
            'response_time': 'Resp Time',
            'requests_per_second': 'RPS',
            'error_rate': 'Errors',
            'server_name': 'Server',
            'service_name': 'Service',
            'status': 'Status'
        };
        return names[metric] || metric;
    }

    setupPanelEvents(panelElement, panel) {
        // Кнопки действий
        panelElement.querySelector('[data-action="refresh"]').addEventListener('click', () => {
            this.updatePanelContent(panel);
        });

        panelElement.querySelector('[data-action="remove"]').addEventListener('click', () => {
            this.removePanel(panel.id);
        });

        // Drag для перемещения
        this.makeDraggable(panelElement, panel);

        // Resize для изменения размера
        this.makeResizable(panelElement, panel);
    }

    makeDraggable(panelElement, panel) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        panelElement.querySelector('.card-header').addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(panelElement.style.left);
            startTop = parseInt(panelElement.style.top);

            panelElement.style.zIndex = '1000';
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Привязка к сетке (шаг 100px по X, 80px по Y)
            const newLeft = Math.round((startLeft + deltaX) / 100) * 100;
            const newTop = Math.round((startTop + deltaY) / 80) * 80;

            panelElement.style.left = `${Math.max(0, newLeft)}px`;
            panelElement.style.top = `${Math.max(0, newTop)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panelElement.style.zIndex = '';
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Обновляем позицию в данных панели
                panel.position.x = parseInt(panelElement.style.left) / 100;
                panel.position.y = parseInt(panelElement.style.top) / 80;
            }
        });
    }

    makeResizable(panelElement, panel) {
        const resizeHandle = panelElement.querySelector('.resize-handle');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(panelElement.style.width);
            startHeight = parseInt(panelElement.style.height);

            document.body.style.cursor = 'nw-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Привязка к сетке
            const newWidth = Math.round((startWidth + deltaX) / 100) * 100;
            const newHeight = Math.round((startHeight + deltaY) / 80) * 80;

            // Минимальный размер
            if (newWidth >= 200 && newHeight >= 160) {
                panelElement.style.width = `${newWidth}px`;
                panelElement.style.height = `${newHeight}px`;

                // Обновляем размер в данных
                const cols = newWidth / 100;
                const rows = newHeight / 80;
                panel.size = `${cols}x${rows}`;
                panelElement.dataset.cols = cols;
                panelElement.dataset.rows = rows;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    updatePanelContent(panel) {
        const panelElement = document.getElementById(panel.id);
        if (!panelElement) return;

        if (panel.type === 'chart') {
            this.renderChartPanel(panel, panelElement);
        } else if (panel.type === 'table') {
            this.renderTablePanel(panel, panelElement);
        }
    }

    renderChartPanel(panel, panelElement) {
        const canvas = panelElement.querySelector('.panel-chart');
        const ctx = canvas.getContext('2d');

        // Очищаем предыдущий график
        if (panel.chartInstance) {
            panel.chartInstance.destroy();
        }

        const chartData = this.prepareChartData(panel);
        panel.chartInstance = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: {
                        display: panel.metrics.length > 1
                    }
                }
            }
        });
    }

    renderTablePanel(panel, panelElement) {
        const thead = panelElement.querySelector('#table-header');
        const tbody = panelElement.querySelector('#table-body');

        // Заголовки
        thead.innerHTML = panel.metrics.map(metric =>
            `<th>${this.getMetricDisplayName(metric)}</th>`
        ).join('');

        // Данные (первые 10 строк)
        const sampleData = this.getSampleDataForMetrics(panel.metrics);
        tbody.innerHTML = sampleData.map(row => `
            <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
        `).join('');
    }

    prepareChartData(panel) {
        const metrics = panel.metrics.map(metricId =>
            this.gridManager.metrics.find(m => m.id === metricId)
        );

        if (metrics.length === 0) {
            return this.getEmptyChartData();
        }

        // Определяем тип графика на основе данных
        const hasNumericData = metrics.some(metric => metric.type === 'number');
        const chartData = hasNumericData ?
            this.prepareNumericChartData(panel, metrics) :
            this.prepareCategoricalChartData(panel, metrics);

        return chartData;
    }

    prepareNumericChartData(panel, metrics) {
        // Для числовых данных: агрегируем по временным интервалам
        const numericMetrics = metrics.filter(m => m.type === 'number');
        const aggregatedData = this.aggregateNumericData(panel.metrics, 'day');

        const datasets = numericMetrics.map((metric, index) => {
            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7D7D7D'];
            return {
                label: metric.name,
                data: aggregatedData.labels.map(label => aggregatedData.data[label]?.[metric.id] || 0),
                backgroundColor: colors[index % colors.length],
                borderColor: colors[index % colors.length],
                borderWidth: 1
            };
        });

        return {
            labels: aggregatedData.labels,
            datasets: datasets
        };
    }

    prepareCategoricalChartData(panel, metrics) {
        // Для категориальных данных: считаем количество вхождений
        const categoricalMetrics = metrics.filter(m => m.type !== 'number');
        const aggregatedData = this.aggregateCategoricalData(panel.metrics, 'day');

        const datasets = categoricalMetrics.map((metric, index) => {
            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7D7D7D'];
            return {
                label: metric.name,
                data: aggregatedData.labels.map(label => aggregatedData.data[label]?.[metric.id] || 0),
                backgroundColor: colors[index % colors.length],
                borderColor: colors[index % colors.length],
                borderWidth: 1
            };
        });

        return {
            labels: aggregatedData.labels,
            datasets: datasets
        };
    }

    aggregateNumericData(metrics, interval = 'day') {
        if (!this.gridManager.sampleData) {
            return this.getSampleAggregatedData(metrics);
        }

        const aggregated = {};
        const labels = new Set();

        this.gridManager.sampleData.forEach(item => {
            const date = new Date(item.timestamp);
            const intervalKey = this.getIntervalKey(date, interval);

            if (!aggregated[intervalKey]) {
                aggregated[intervalKey] = {};
                metrics.forEach(metric => {
                    aggregated[intervalKey][metric] = 0;
                });
            }

            metrics.forEach(metric => {
                const value = item[metric];
                if (typeof value === 'number') {
                    // Для числовых данных используем сумму
                    aggregated[intervalKey][metric] += value;
                }
            });

            labels.add(intervalKey);
        });

        return {
            labels: Array.from(labels).sort(),
            data: aggregated
        };
    }

    aggregateCategoricalData(metrics, interval = 'day') {
        if (!this.gridManager.sampleData) {
            return this.getSampleAggregatedData(metrics);
        }

        const aggregated = {};
        const labels = new Set();

        this.gridManager.sampleData.forEach(item => {
            const date = new Date(item.timestamp);
            const intervalKey = this.getIntervalKey(date, interval);

            if (!aggregated[intervalKey]) {
                aggregated[intervalKey] = {};
                metrics.forEach(metric => {
                    aggregated[intervalKey][metric] = 0;
                });
            }

            metrics.forEach(metric => {
                const value = item[metric];
                // Для категориальных данных считаем количество непустых значений
                if (value !== null && value !== undefined && value !== '') {
                    aggregated[intervalKey][metric] += 1;
                }
            });

            labels.add(intervalKey);
        });

        return {
            labels: Array.from(labels).sort(),
            data: aggregated
        };
    }

    getIntervalKey(date, interval) {
        switch (interval) {
            case 'hour':
                return date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            case 'day':
                return date.toISOString().split('T')[0]; // YYYY-MM-DD
            case 'week':
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                return startOfWeek.toISOString().split('T')[0];
            case 'month':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            default:
                return date.toISOString().split('T')[0];
        }
    }

    getSampleAggregatedData(metrics) {
        // Генерируем тестовые агрегированные данные
        const labels = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];
        const data = {};

        labels.forEach(label => {
            data[label] = {};
            metrics.forEach(metric => {
                const metricInfo = this.gridManager.metrics.find(m => m.id === metric);
                if (metricInfo && metricInfo.type === 'number') {
                    data[label][metric] = Math.random() * 1000;
                } else {
                    data[label][metric] = Math.floor(Math.random() * 100);
                }
            });
        });

        return { labels, data };
    }

    renderChartPanel(panel, panelElement) {
        const canvas = panelElement.querySelector('.panel-chart');
        const ctx = canvas.getContext('2d');

        if (panel.chartInstance) {
            panel.chartInstance.destroy();
        }

        const chartData = this.prepareChartData(panel);

        // Определяем настройки графика на основе данных
        const metrics = panel.metrics.map(metricId =>
            this.gridManager.metrics.find(m => m.id === metricId)
        );
        const hasNumericData = metrics.some(metric => metric && metric.type === 'number');

        panel.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Временные интервалы'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: hasNumericData ? 'Сумма значений' : 'Количество записей'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: metrics.length > 1,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Добавляем переключатель типа графика
        this.addChartTypeToggle(panelElement, panel);
    }

    addChartTypeToggle(panelElement, panel) {
        const header = panelElement.querySelector('.card-header');
        const existingToggle = panelElement.querySelector('.chart-type-toggle');
        if (existingToggle) existingToggle.remove();

        const toggle = document.createElement('div');
        toggle.className = 'chart-type-toggle ms-2';
        toggle.innerHTML = `
            <select class="form-select form-select-sm" style="width: auto;">
                <option value="stackedBar" selected>Stacked Bar</option>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
            </select>
        `;

        const select = toggle.querySelector('select');
        select.addEventListener('change', (e) => {
            this.chartType = e.target.value;
            if (panel.chartInstance) {
                panel.chartInstance.destroy();
            }
            this.renderChartPanel(panel, panelElement);
        });

        header.appendChild(toggle);
    }

    getEmptyChartData() {
        return {
            labels: ['Нет данных'],
            datasets: [{
                label: 'Нет данных',
                data: [0],
                backgroundColor: '#9992',
                borderColor: '#999',
                borderWidth: 1
            }]
        };
    }


    getRealDataForMetrics(metrics, maxRows = 20) {
        if (!this.gridManager.sampleData || this.gridManager.sampleData.length === 0) {
            return this.getSampleDataForMetrics(metrics, maxRows);
        }

        // Берем реальные данные из загруженного dataset
        return this.gridManager.sampleData
            .slice(0, maxRows)
            .map(item => {
                const row = {};
                metrics.forEach(metric => {
                    row[metric] = item[metric];
                });
                return row;
            });
    }

    renderTablePanel(panel, panelElement) {
        const thead = panelElement.querySelector('#table-header');
        const tbody = panelElement.querySelector('#table-body');

        // Заголовки
        thead.innerHTML = panel.metrics.map(metricId => {
            const metric = this.gridManager.metrics.find(m => m.id === metricId);
            return `<th>${metric ? metric.name : metricId}</th>`;
        }).join('');

        // Данные
        const tableData = this.getRealDataForMetrics(panel.metrics, 10);
        tbody.innerHTML = tableData.map(row => `
            <tr>${panel.metrics.map(metric =>
                `<td>${this.formatValue(row[metric], metric)}</td>`
            ).join('')}</tr>
        `).join('');
    }

    formatValue(value, metricId) {
        if (value === null || value === undefined) return '-';

        const metric = this.gridManager.metrics.find(m => m.id === metricId);
        if (!metric) return value;

        if (metric.type === 'number') {
            if (metricId.includes('usage') || metricId.includes('rate')) {
                return Number(value).toFixed(1) + '%';
            }
            if (metricId.includes('time')) {
                return Number(value).toFixed(1) + 'ms';
            }
            if (metricId.includes('revenue') || metricId.includes('impact')) {
                return '$' + Number(value).toLocaleString('ru-RU');
            }
            return Number(value).toLocaleString('ru-RU');
        }

        if (metric.type === 'date') {
            try {
                return new Date(value).toLocaleDateString('ru-RU');
            } catch {
                return value;
            }
        }

        if (metricId === 'status') {
            const statusClass = `status-${value}`;
            return `<span class="${statusClass}">${value}</span>`;
        }

        return value;
    }

    getSampleDataForMetrics(metrics, count = 10) {
        // Генерируем тестовые данные на основе типов метрик
        return Array.from({ length: count }, (_, i) => {
            const row = {};
            metrics.forEach(metricId => {
                const metric = this.gridManager.metrics.find(m => m.id === metricId);
                if (metric) {
                    if (metric.type === 'number') {
                        if (metricId.includes('usage') || metricId.includes('rate')) {
                            row[metricId] = Math.random() * 100;
                        } else if (metricId.includes('time')) {
                            row[metricId] = Math.random() * 500;
                        } else {
                            row[metricId] = Math.random() * 1000;
                        }
                    } else if (metric.type === 'date') {
                        const date = new Date();
                        date.setDate(date.getDate() - Math.random() * 365);
                        row[metricId] = date.toISOString();
                    } else {
                        row[metricId] = `Value ${i + 1}`;
                    }
                } else {
                    row[metricId] = `Unknown ${i + 1}`;
                }
            });
            return row;
        });
    }
    removePanel(panelId) {
        const panel = this.panels.get(panelId);
        if (panel && panel.chartInstance) {
            panel.chartInstance.destroy();
        }

        this.panels.delete(panelId);
        const panelElement = document.getElementById(panelId);
        if (panelElement) {
            panelElement.remove();
        }
    }

    getLayout() {
        const layout = [];
        this.panels.forEach(panel => {
            layout.push({
                id: panel.id,
                type: panel.type,
                size: panel.size,
                metrics: panel.metrics,
                position: panel.position
            });
        });
        return layout;
    }

    loadLayout(layout) {
        this.clearPanels();

        layout.forEach(panelConfig => {
            this.createPanel(
                panelConfig.type,
                panelConfig.size,
                panelConfig.metrics,
                panelConfig.position
            );
        });
    }

    clearPanels() {
        this.panels.forEach(panel => {
            if (panel.chartInstance) {
                panel.chartInstance.destroy();
            }
        });
        this.panels.clear();

        const grid = document.getElementById('dashboardGrid');
        grid.innerHTML = '';
    }
}