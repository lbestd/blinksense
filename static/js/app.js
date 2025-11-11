class App {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.cache = new ClientCache();
        this.gridManager = new GridManager();
        this.panelManager = new PanelManager(this.gridManager);
        this.globalFilters = null;
        this.isEditMode = false;
        this.compactFormat = true;

        // Добавляем идентификаторы дашбордов
        this.currentDashboardId = 'default';
        this.currentLayoutName = 'default';

        this.init();
    }

    async init() {
        console.log('🚀 [App] Инициализация приложения...');

        console.log('📊 [App] Шаг 1: Загрузка данных');
        await this.loadData();

        console.log('📋 [App] Шаг 2: Загрузка layout');
        await this.loadLayout();

        console.log('🎛️ [App] Шаг 3: Настройка слушателей событий');
        this.setupEventListeners();

        console.log('📈 [App] Шаг 4: Обновление информационной панели');
        this.updateInfoPanel();

        console.log('✅ [App] Инициализация завершена');
    }

    async loadData() {
        try {
            const startTime = performance.now();
            const cached = this.cache.get('all_data');

            if (cached) {
                this.data = cached.data;
                this.downloadedSize = cached.downloadedSize || 0;
                console.log('📦 Данные загружены из кэша');
            } else {
                // Используем ультра-компактный формат (даты как timestamps)
                const response = await fetch('/api/data/ultra?limit=40000');

                // Получаем размер загруженных данных из заголовков
                const contentLength = response.headers.get('content-length');
                const contentEncoding = response.headers.get('content-encoding');

                const compactDataText = await response.text();
                const compactData = JSON.parse(compactDataText);

                // Сохраняем реальный размер загруженных данных
                this.downloadedSize = compactDataText.length;

                // Конвертируем компактный формат в обычный
                this.data = this._expandCompactFormat(compactData);
                this.cache.set('all_data', {
                    data: this.data,
                    downloadedSize: this.downloadedSize
                });

                console.log(`📥 Данные загружены: ${(this.downloadedSize / 1024 / 1024).toFixed(2)} MB`);
                console.log(`🗜️ Compression: ${contentEncoding || 'none'}`);
                if (contentLength) {
                    console.log(`📦 Content-Length: ${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB`);
                }
            }

            const loadTime = performance.now() - startTime;
            const loadTimeEl = document.getElementById('loadTime');
            if (loadTimeEl) {
                loadTimeEl.textContent = `${Math.round(loadTime)} ms`;
            }

            this.gridManager.analyzeData(this.data);
            this.gridManager.panelManager = this.panelManager;

            // Инициализируем глобальные фильтры
            this.globalFilters = new GlobalFilters(this.gridManager);

            this.updateCacheStatus();
            this.updateInfoPanel();

        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.showError('Не удалось загрузить данные с сервера');
        }
    }

    /**
     * Конвертирует компактный формат в обычный массив объектов
     */
    _expandCompactFormat(compactData) {
        if (!compactData || !compactData.h || !compactData.d) {
            console.warn('⚠️ Некорректный компактный формат данных');
            return [];
        }

        const { h: headers, d: dataRows } = compactData;
        const expandedData = [];

        // Определяем индексы колонок с датами для конвертации timestamp обратно
        const dateColumns = [
            'timestamp', 'install_date', 'last_update_date',
            'next_maintenance_date', 'last_backup_date',
            'certificate_expiry_date', 'last_maintenance'
        ];
        const dateIndices = dateColumns
            .map(col => headers.indexOf(col))
            .filter(idx => idx !== -1);

        for (const row of dataRows) {
            const item = {};
            for (let i = 0; i < headers.length; i++) {
                if (i < row.length) {
                    let value = row[i];
                    // Конвертируем timestamp обратно в дату для колонок с датами
                    if (dateIndices.includes(i) && typeof value === 'number') {
                        value = new Date(value * 1000).toISOString();
                    }
                    item[headers[i]] = value;
                }
            }
            expandedData.push(item);
        }

        console.log(`🔄 Конвертировано ${expandedData.length} записей из ультра-компактного формата`);
        return expandedData;
    }

    /**
     * Загружает данные с фильтрацией (использует компактный формат)
     */
    async loadFilteredData(filters = {}) {
        try {
            const startTime = performance.now();

            // Строим URL с параметрами фильтрации
            const urlParams = new URLSearchParams();
            urlParams.append('limit', '5000');

            // Добавляем фильтры
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    urlParams.append(key, value);
                }
            });

            const response = await fetch(`/api/data/filtered?${urlParams}`);
            const compactData = await response.json();

            // Конвертируем компактный формат в обычный
            const filteredData = this._expandCompactFormat(compactData);

            const loadTime = performance.now() - startTime;
            console.log(`📊 Загружено ${filteredData.length} отфильтрованных записей за ${Math.round(loadTime)}ms`);

            return filteredData;

        } catch (error) {
            console.error('❌ Ошибка загрузки отфильтрованных данных:', error);
            throw error;
        }
    }

    async loadLayout() {

    try {
        console.log('📥 [Layout] Step 1: Формируем URL');
        const url = `/api/layout?dashboard_id=${this.currentDashboardId}&name=${this.currentLayoutName}`;
        console.log(`📥 [Layout] URL: ${url}`);

        console.log('📥 [Layout] Step 2: Делаем запрос к серверу');
        const response = await fetch(url);
        console.log(`📥 [Layout] Step 3: Получен ответ: ${response.status} ${response.statusText}`);
        console.log(`📥 [Layout] Response object:`, response);

        if (!response.ok) {
            console.error(`❌ [Layout] HTTP ошибка: ${response.status}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('📥 [Layout] Step 4: Парсим JSON');
        const ldata = await response.text();
        console.log('📥 [Layout] Raw data type:', typeof ldata);
        console.log('📥 [Layout] Raw data:', ldata);

        let layout;
        try {
            layout = JSON.parse(ldata);
            console.log('📥 [Layout] After first parse type:', typeof layout);
            console.log('📥 [Layout] After first parse:', layout);

            // Если layout все еще строка - значит данные уже были в JSON формате
            if (typeof layout === 'string') {
                console.log('🔄 [Layout] Data is still string, parsing again...');
                layout = JSON.parse(layout);
            }

            console.log('📥 [Layout] Final type:', typeof layout);
            console.log('📥 [Layout] Final layout:', layout);
            console.log('📥 [Layout] layout.name:', layout.name);

        } catch (error) {
            console.error('❌ [Layout] JSON parse error:', error);
        }

        if (layout.error) {
            console.error(`❌ [Layout] Ошибка от сервера:`, layout.error);
            throw new Error(layout.error);
        }



        if (layout.panels && Array.isArray(layout.panels) && layout.panels.length > 0) {
            console.log(`📥 [Layout] Step 7: Загружаем ${layout.panels.length} панелей`);
            console.log(`📥 [Layout] Первая панель:`, JSON.stringify(layout.panels[0], null, 2));

            console.log('📥 [Layout] Step 8: Вызываем panelManager.loadLayout()');
            this.panelManager.loadLayout(layout.panels);

            console.log('📥 [Layout] Step 9: Обновляем информационную панель');
            this.updateInfoPanel();

            console.log('✅ [Layout] === LAYOUT ЗАГРУЖЕН УСПЕШНО ===');
        } else {
            console.warn('⚠️ [Layout] Нет панелей в layout, показываем пустое состояние');
            console.warn('⚠️ [Layout] layout.panels value:', layout.panels);
            this.showEmptyState();
        }
    } catch (error) {
        console.error('❌ [Layout] === ОШИБКА ЗАГРУЗКИ LAYOUT ===');
        console.error('❌ [Layout] Error object:', error);
        console.error('❌ [Layout] Error message:', error.message);
        console.error('❌ [Layout] Error stack:', error.stack);
        this.showEmptyState();
    }

}

async saveLayout() {
    try {
        console.log('💾 [Layout] Начинаем сохранение...');

        const panels = this.panelManager.getLayout();
        console.log(`💾 [Layout] Панелей для сохранения: ${panels.length}`);

        const layout = {
            panels: panels,
            timestamp: new Date().toISOString(),
            version: '1.0'
            // dashboard_id и name передаются через query параметры
        };

        const url = `/api/layout?dashboard_id=${this.currentDashboardId}&name=${this.currentLayoutName}`;
        console.log(`💾 [Layout] URL: ${url}`);
        console.log(`💾 [Layout] Данные:`, layout);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layout)
        });

        console.log(`💾 [Layout] Ответ сервера: ${response.status} ${response.statusText}`);

        const result = await response.json();
        console.log(`💾 [Layout] Результат:`, result);

        if (response.ok && result.status === 'success') {
            this.showSuccess(`Layout успешно сохранен в дашборд "${this.currentDashboardId}"!`);
            console.log('✅ [Layout] Layout сохранен в БД успешно');
        } else {
            throw new Error(result.message || result.error || 'Ошибка сервера');
        }
    } catch (error) {
        console.error('❌ [Layout] Ошибка сохранения layout:', error);
        this.showError(`Не удалось сохранить layout: ${error.message}`);
    }
}

    setupEventListeners() {
        // Кнопка добавления панели
        document.getElementById('addPanel').addEventListener('click', () => {
            this.showAddPanelModal();
        });

        // Первая панель
        const addFirstPanelBtn = document.getElementById('addFirstPanel');
        if (addFirstPanelBtn) {
            addFirstPanelBtn.addEventListener('click', () => {
                this.showAddPanelModal();
            });
        }

        // Обработка выбора типа панели
        this.setupPanelTypeSelection();

        // Создание панели
        document.getElementById('createPanel').addEventListener('click', () => {
            this.createNewPanel();
        });

        // Сохранение layout
        document.getElementById('saveLayout').addEventListener('click', () => {
            this.saveLayout();
        });

        // Режим редактирования
        const editModeToggle = document.getElementById('editModeToggle');
        if (editModeToggle) {
            editModeToggle.addEventListener('change', (e) => {
                this.toggleEditMode(e.target.checked);
            });
        }

        // Управление лэйаутами
        const newLayoutBtn = document.getElementById('newLayoutBtn');
        if (newLayoutBtn) {
            newLayoutBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('layoutManagerModal'));
                modal.show();
            });
        }

        const createLayoutBtn = document.getElementById('createLayoutBtn');
        if (createLayoutBtn) {
            createLayoutBtn.addEventListener('click', () => {
                this.createNewLayout();
            });
        }
    }

    showAddPanelModal() {
        const modal = new bootstrap.Modal(document.getElementById('addPanelModal'));
        this.resetAddPanelForm();
        modal.show();
    }

    setupPanelTypeSelection() {
        // Обработка кликов по карточкам типов панелей
        document.querySelectorAll('.panel-type-card').forEach(card => {
            card.addEventListener('click', () => {
                // Убираем выделение с других карточек
                document.querySelectorAll('.panel-type-card').forEach(c => c.classList.remove('selected'));

                // Выделяем выбранную карточку
                card.classList.add('selected');

                // Сохраняем выбранный тип
                const type = card.dataset.type;
                document.getElementById('selectedPanelType').value = type;

                // Активируем кнопку создания
                document.getElementById('createPanel').disabled = false;
            });
        });
    }

    createNewPanel() {
        const selectedType = document.getElementById('selectedPanelType').value;
        const size = document.getElementById('panelSize').value;
        const title = document.getElementById('panelTitle').value;

        if (!selectedType) {
            this.showError('Пожалуйста, выберите тип панели');
            return;
        }

        // Создаем панель с базовой конфигурацией
        const config = this.createInitialConfig(selectedType);
        if (title) {
            config.display.title = title;
        }

        this.panelManager.createPanel(selectedType, size, config);

        // Закрываем модальное окно
        bootstrap.Modal.getInstance(document.getElementById('addPanelModal')).hide();

        // Сбрасываем форму
        this.resetAddPanelForm();
        this.hideEmptyState();
        this.updateInfoPanel();

        this.showSuccess('Панель создана! Нажмите ⚙️ для настройки данных');

        // Автоматически открываем настройки для первой настройки
        setTimeout(() => {
            const panels = this.panelManager.panels;
            if (panels.size > 0) {
                const lastPanel = Array.from(panels.values())[panels.size - 1];
                this.panelManager.showConfigModal(lastPanel);
            }
        }, 500);
    }

    createInitialConfig(type) {
        return this.panelManager.getDefaultConfig(type);
    }

    resetAddPanelForm() {
        // Сбрасываем выбор типа панели
        document.querySelectorAll('.panel-type-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Очищаем скрытое поле
        document.getElementById('selectedPanelType').value = '';

        // Очищаем название
        document.getElementById('panelTitle').value = '';

        // Сбрасываем размер на значение по умолчанию
        document.getElementById('panelSize').value = '6x3';

        // Отключаем кнопку создания
        document.getElementById('createPanel').disabled = true;
    }

    getCurrentDateRange() {
        // Метод закомментирован после рефакторинга UI
        // Фильтры по датам удалены
        return {
            start: '',
            end: ''
        };
    }

    // Методы фильтрации - закомментированы после рефакторинга UI
    // filterData(data) {
    //     return data;
    // }

    toggleEditMode(enabled) {
        this.isEditMode = enabled;
        document.body.classList.toggle('edit-mode', enabled);

        if (enabled) {
            this.showInfo('Режим редактирования включен');
        } else {
            this.showInfo('Режим редактирования выключен');
        }
    }

    createNewLayout() {
        const nameInput = document.getElementById('newLayoutName');
        const layoutName = nameInput.value.trim();

        if (!layoutName) {
            this.showError('Введите название лэйаута');
            return;
        }

        // Сохраняем текущий layout с новым именем
        this.currentLayoutName = layoutName;
        this.saveLayout();

        // Закрываем модалку
        const modal = bootstrap.Modal.getInstance(document.getElementById('layoutManagerModal'));
        if (modal) modal.hide();

        // Очищаем поле ввода
        nameInput.value = '';

        this.showSuccess(`Лэйаут "${layoutName}" создан`);
    }

    updateAllPanels() {
        // Используем отфильтрованные данные или все данные
        const dataToUse = this.filteredData.length > 0 ? this.filteredData : this.data;

        this.panelManager.panels.forEach(panel => {
            this.panelManager.updatePanelContent(panel, dataToUse);
        });
    }

    updateInfoPanel() {
        // Обновляем информацию в верхней панели
        const totalRecordsEl = document.getElementById('totalRecords');
        if (totalRecordsEl) {
            const dataToCount = this.filteredData.length > 0 ? this.filteredData : this.data;
            totalRecordsEl.textContent = dataToCount.length.toLocaleString();
        }

        const activePanelsEl = document.getElementById('activePanels');
        if (activePanelsEl) {
            activePanelsEl.textContent = this.panelManager.panels.size;
        }

        // Расчет размера данных - показываем реальный размер загрузки
        const dataSizeEl = document.getElementById('dataSize');
        if (dataSizeEl) {
            if (this.downloadedSize) {
                const downloadedMB = this.downloadedSize / 1024 / 1024;
                dataSizeEl.textContent = downloadedMB.toFixed(2) + ' MB';
            } else {
                const dataToMeasure = this.filteredData.length > 0 ? this.filteredData : this.data;
                const dataSize = JSON.stringify(dataToMeasure).length / 1024 / 1024;
                dataSizeEl.textContent = dataSize.toFixed(2) + ' MB';
            }
        }

        // Обновление статуса кэша
        this.updateCacheStatus();

        // Показываем/скрываем пустое состояние
        if (this.panelManager.panels.size === 0) {
            this.showEmptyState();
        } else {
            this.hideEmptyState();
        }
    }

    updateCacheStatus() {
        const status = document.getElementById('cacheStatus');
        if (status) {
            status.textContent = `Кэш: ${this.cache.size()} записей`;
        }
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const dashboardGrid = document.getElementById('dashboardGrid');

        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (dashboardGrid) {
            dashboardGrid.classList.add('empty');
        }
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const dashboardGrid = document.getElementById('dashboardGrid');

        if (emptyState) {
            emptyState.style.display = 'none';
        }
        if (dashboardGrid) {
            dashboardGrid.classList.remove('empty');
        }
    }

    resetAddPanelForm() {
        const panelTitle = document.getElementById('panelTitle');
        if (panelTitle) {
            panelTitle.value = '';
        }

        const metricsInputs = document.querySelectorAll('.metrics-list input:checked');
        metricsInputs.forEach(cb => {
            cb.checked = false;
        });

        const selectedMetricsPreview = document.getElementById('selectedMetricsPreview');
        if (selectedMetricsPreview) {
            selectedMetricsPreview.innerHTML = '<span class="text-muted">Метрики не выбраны</span>';
        }
    }

    // Вспомогательные методы для уведомлений
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Простая реализация уведомлений
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'info': 'alert-info',
            'warning': 'alert-warning'
        }[type] || 'alert-info';

        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        // Автоматическое скрытие
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Методы для управления дашбордами
    async switchDashboard(dashboardId, layoutName = 'default') {
        this.currentDashboardId = dashboardId;
        this.currentLayoutName = layoutName;

        // Сохраняем текущий layout перед переключением
        await this.saveLayout();

        // Загружаем новый layout
        await this.loadLayout();

        this.showSuccess(`Переключен на дашборд: ${dashboardId}`);
    }

    async createNewDashboard(dashboardId, layoutName = 'default') {
        this.currentDashboardId = dashboardId;
        this.currentLayoutName = layoutName;

        // Сбрасываем панели для нового дашборда
        this.panelManager.clearPanels();
        this.showEmptyState();

        this.showSuccess(`Создан новый дашборд: ${dashboardId}`);
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('🚀 [App] Приложение инициализировано. Доступно через window.app');
});