class DataTab {
    constructor(panel, gridManager) {
        this.panel = panel;
        this.gridManager = gridManager;
    }

    render() {
        return `
            <div class="data-tab-content">
                <div class="mb-4">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-database"></i> Источник данных
                    </h6>
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Тип источника</label>
                            <select class="form-select data-source">
                                <option value="current" ${this.panel.config.data.source === 'current' ? 'selected' : ''}>
                                    📊 Текущие данные
                                </option>
                                <option value="static" ${this.panel.config.data.source === 'static' ? 'selected' : ''}>
                                    📁 Статические данные
                                </option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Временной диапазон</label>
                            <select class="form-select date-range">
                                <option value="">Все данные</option>
                                <option value="last_24h">Последние 24 часа</option>
                                <option value="last_7d">Последние 7 дней</option>
                                <option value="last_30d">Последние 30 дней</option>
                                <option value="custom">Настраиваемый период</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-filter"></i> Фильтры данных
                    </h6>
                    <div class="filters-container">
                        ${this.renderFilters()}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary mt-2 add-filter">
                        <i class="fas fa-plus"></i> Добавить фильтр
                    </button>
                </div>

                <div class="mb-3">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-eye"></i> Предпросмотр данных
                    </h6>
                    <div class="card bg-light">
                        <div class="card-body p-3">
                            <div class="row text-center">
                                <div class="col-md-4">
                                    <div class="stat-item">
                                        <div class="stat-value h5 mb-1">${this.gridManager.sampleData ? this.gridManager.sampleData.length : 0}</div>
                                        <div class="stat-label small text-muted">Всего записей</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="stat-item">
                                        <div class="stat-value h5 mb-1" id="filtered-count">-</div>
                                        <div class="stat-label small text-muted">После фильтров</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="stat-item">
                                        <div class="stat-value h5 mb-1">${this.getAvailableFields().length}</div>
                                        <div class="stat-label small text-muted">Доступных полей</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getAvailableFields() {
        if (!this.gridManager.sampleData || !this.gridManager.sampleData.length) {
            return [];
        }
        
        const sample = this.gridManager.sampleData[0];
        return Object.keys(sample).map(key => ({
            id: key,
            name: this.formatFieldName(key),
            type: this.getFieldType(sample[key])
        }));
    }

    formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    getFieldType(value) {
        if (typeof value === 'number') return 'numeric';
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'date';
        return 'categorical';
    }

    renderFilters() {
        if (!this.panel.config.data.filters.length) {
            return '<div class="text-muted small">Нет активных фильтров</div>';
        }

        return this.panel.config.data.filters.map((filter, index) => `
            <div class="filter-item card p-3 mb-3">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label small text-muted">Поле</label>
                        <select class="form-select filter-field" data-index="${index}">
                            <option value="">Выберите поле...</option>
                            ${this.getAvailableFields().map(field =>
                                `<option value="${field.id}" ${filter.field === field.id ? 'selected' : ''}>
                                    ${field.name} (${field.type === 'numeric' ? '🔢' : field.type === 'date' ? '📅' : '📝'})
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small text-muted">Условие</label>
                        <select class="form-select filter-operator" data-index="${index}">
                            <option value="equals" ${filter.operator === 'equals' ? 'selected' : ''}>Равно</option>
                            <option value="not_equals" ${filter.operator === 'not_equals' ? 'selected' : ''}>Не равно</option>
                            <option value="contains" ${filter.operator === 'contains' ? 'selected' : ''}>Содержит</option>
                            <option value="gt" ${filter.operator === 'gt' ? 'selected' : ''}>Больше</option>
                            <option value="gte" ${filter.operator === 'gte' ? 'selected' : ''}>Больше равно</option>
                            <option value="lt" ${filter.operator === 'lt' ? 'selected' : ''}>Меньше</option>
                            <option value="lte" ${filter.operator === 'lte' ? 'selected' : ''}>Меньше равно</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small text-muted">Значение</label>
                        <input type="text" class="form-control filter-value" data-index="${index}"
                               value="${filter.value}" placeholder="Введите значение для фильтра...">
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small text-muted">&nbsp;</label>
                        <button type="button" class="btn btn-outline-danger w-100 remove-filter" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupEvents(container) {
        // Добавление фильтра
        const addFilterBtn = container.querySelector('.add-filter');
        if (addFilterBtn) {
            addFilterBtn.addEventListener('click', () => {
                this.panel.config.data.filters.push({
                    field: '',
                    operator: 'equals',
                    value: ''
                });
                this.refreshTab(container);
            });
        }

        // Удаление фильтров
        container.querySelectorAll('.remove-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.panel.config.data.filters.splice(index, 1);
                this.refreshTab(container);
            });
        });

        // Изменение фильтров
        container.querySelectorAll('.filter-field, .filter-operator, .filter-value').forEach(element => {
            element.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const type = e.target.classList.contains('filter-field') ? 'field' : 
                           e.target.classList.contains('filter-operator') ? 'operator' : 'value';
                
                if (this.panel.config.data.filters[index]) {
                    this.panel.config.data.filters[index][type] = e.target.value;
                }
                this.updateDataPreview();
            });
        });

        // Источник данных
        const dataSourceSelect = container.querySelector('.data-source');
        if (dataSourceSelect) {
            dataSourceSelect.addEventListener('change', (e) => {
                this.panel.config.data.source = e.target.value;
                this.updateDataPreview();
            });
        }

        // Временной диапазон
        const dateRangeSelect = container.querySelector('.date-range');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.panel.config.data.dateRange = e.target.value || null;
                this.updateDataPreview();
            });
        }
    }

    refreshTab(container) {
        const filtersContainer = container.querySelector('.filters-container');
        if (filtersContainer) {
            filtersContainer.innerHTML = this.renderFilters();
            this.setupEvents(container);
        }
    }

    updateDataPreview() {
        const filteredCount = this.getFilteredDataCount();
        const countElement = document.getElementById('filtered-count');
        if (countElement) {
            countElement.textContent = filteredCount;
        }
    }

    getFilteredDataCount() {
        if (!this.gridManager.sampleData) return 0;
        return this.gridManager.sampleData.length; // Временная заглушка
    }

    updateConfig() {
        // Обновляем конфигурацию на основе изменений в UI
        const filters = [];
        document.querySelectorAll('.filter-item').forEach(item => {
            const field = item.querySelector('.filter-field').value;
            const operator = item.querySelector('.filter-operator').value;
            const value = item.querySelector('.filter-value').value;

            if (field && value) {
                filters.push({ field, operator, value });
            }
        });

        this.panel.config.data.filters = filters;
    }
}