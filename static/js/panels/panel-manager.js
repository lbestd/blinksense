class PanelManager {
    constructor(gridManager) {
        this.panels = new Map();
        this.nextPanelId = 1;
        this.gridManager = gridManager;
    }

    createPanel(type, size, config = null, position = null) {
        console.log(`🎨 [PanelManager.createPanel] Создание панели type=${type}, size=${size}`);

        const panelId = `panel-${this.nextPanelId++}`;
        const [cols, rows] = size.split('x').map(Number);

        const panel = {
            id: panelId,
            type: type,
            size: size,
            config: config || this.getDefaultConfig(type),
            position: position || this.findEmptyPosition(cols, rows),
            chartInstance: null
        };

        console.log(`🎨 [PanelManager.createPanel] Панель создана: ${panelId}, позиция:`, panel.position);

        this.panels.set(panelId, panel);
        console.log(`🎨 [PanelManager.createPanel] Панель добавлена в Map, всего: ${this.panels.size}`);

        console.log(`🎨 [PanelManager.createPanel] Рендерим панель...`);
        this.renderPanel(panel);
        console.log(`✅ [PanelManager.createPanel] Панель ${panelId} отрендерена`);

        return panel;
    }

    getDefaultConfig(type) {
        return {
            dimensions: [
                // Структура: { field: 'field_name', name: 'Display Name', type: 'categorical|date', sortBy: 'name|value', sortOrder: 'asc|desc' }
            ],
            measures: [
                // Структура: { field: 'field_name', name: 'Display Name', aggregation: 'sum|avg|count|min|max', expression: 'Sum(field_name)' }
            ],
            sorting: {
                // Сортировка для измерений и мер
                dimensions: [], // [{ field: 'dimension_field', order: 'asc|desc', sortBy: 'name|value' }]
                measures: []    // [{ field: 'measure_field', order: 'asc|desc' }]
            },
            display: {
                chartType: type === 'chart' ? 'bar' : 'table',
                title: '',
                showLegend: true,
                showValues: false,
                colorScheme: 'default'
            }
        };
    }

    findEmptyPosition(cols, rows) {
        const grid = document.getElementById('dashboardGrid');
        const existingPanels = Array.from(grid.querySelectorAll('.dashboard-panel'));

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
                    <button class="btn btn-sm btn-outline-secondary" data-action="config">⚙️</button>
                    <button class="btn btn-sm btn-outline-secondary" data-action="refresh">🔄</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="remove">🗑️</button>
                </div>
            </div>
            <div class="card-body p-2 panel-content">
                ${panel.type === 'chart' ?
                    '<canvas class="panel-chart"></canvas>' :
                    '<div class="virtual-table-container"></div>'
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

        const measures = panel.config.measures.map(m => m.name).join(', ');
        const dimensions = panel.config.dimensions.map(d => d.name).join(', ');

        let title = `${typeNames[panel.type]}`;
        if (measures) title += ` - ${measures}`;
        if (dimensions) title += ` by ${dimensions}`;

        return title.length > 50 ? title.substring(0, 47) + '...' : title;
    }

    setupPanelEvents(panelElement, panel) {
        // Кнопки действий
        panelElement.querySelector('[data-action="refresh"]').addEventListener('click', () => {
            this.updatePanelContent(panel);
        });

        panelElement.querySelector('[data-action="config"]').addEventListener('click', () => {
            this.showConfigModal(panel);
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

            const newWidth = Math.round((startWidth + deltaX) / 100) * 100;
            const newHeight = Math.round((startHeight + deltaY) / 80) * 80;

            if (newWidth >= 200 && newHeight >= 160) {
                panelElement.style.width = `${newWidth}px`;
                panelElement.style.height = `${newHeight}px`;

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

    showConfigModal(panel) {
        // Создаем модальное окно конфигурации
        const configModal = new PanelConfigModal(panel, this);
        configModal.show();
    }

    updatePanelContent(panel) {
        if (panel.type === 'chart') {
            ChartRenderer.render(panel, this.gridManager);
        } else if (panel.type === 'table') {
            TableRenderer.render(panel, this.gridManager);
        }

        // Обновляем заголовок
        const panelElement = document.getElementById(panel.id);
        if (panelElement) {
            const titleElement = panelElement.querySelector('.panel-title');
            titleElement.textContent = this.getPanelTitle(panel);
        }
    }

    refreshAllPanels() {
        this.panels.forEach(panel => {
            this.updatePanelContent(panel);
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
                config: panel.config,
                position: panel.position
            });
        });
        return layout;
    }

    loadLayout(layout) {
        console.log('🎨 [PanelManager] === НАЧАЛО ЗАГРУЗКИ LAYOUT ===');
        console.log('🎨 [PanelManager] Получен layout:', layout);
        console.log('🎨 [PanelManager] Тип layout:', typeof layout);
        console.log('🎨 [PanelManager] Это массив?', Array.isArray(layout));
        console.log('🎨 [PanelManager] Количество панелей:', layout ? layout.length : 0);

        console.log('🎨 [PanelManager] Шаг 1: Очищаем существующие панели');
        this.clearPanels();
        console.log('🎨 [PanelManager] Панели очищены. Текущее количество:', this.panels.size);

        if (!layout || !Array.isArray(layout) || layout.length === 0) {
            console.warn('⚠️ [PanelManager] Нет панелей для загрузки');
            return;
        }

        console.log('🎨 [PanelManager] Шаг 2: Создаем панели');
        layout.forEach((panelConfig, index) => {
            console.log(`🎨 [PanelManager] Создаем панель ${index + 1}/${layout.length}`);
            console.log(`🎨 [PanelManager] Конфиг панели ${index + 1}:`, panelConfig);

            try {
                const panel = this.createPanel(
                    panelConfig.type,
                    panelConfig.size,
                    panelConfig.config,
                    panelConfig.position
                );
                console.log(`✅ [PanelManager] Панель ${index + 1} создана:`, panel.id);
            } catch (error) {
                console.error(`❌ [PanelManager] Ошибка создания панели ${index + 1}:`, error);
                console.error(`❌ [PanelManager] Конфиг проблемной панели:`, panelConfig);
            }
        });

        console.log('🎨 [PanelManager] Шаг 3: Проверка результата');
        console.log('🎨 [PanelManager] Всего панелей создано:', this.panels.size);
        console.log('🎨 [PanelManager] Панели в Map:', Array.from(this.panels.keys()));

        const gridElement = document.getElementById('dashboardGrid');
        const renderedPanels = gridElement.querySelectorAll('.dashboard-panel');
        console.log('🎨 [PanelManager] Панелей в DOM:', renderedPanels.length);

        console.log('🎨 [PanelManager] === КОНЕЦ ЗАГРУЗКИ LAYOUT ===');
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