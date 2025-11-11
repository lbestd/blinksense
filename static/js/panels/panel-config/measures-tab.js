class MeasuresTab {
    constructor(panel, gridManager) {
        this.panel = panel;
        this.gridManager = gridManager;
    }

    render() {
        return `
            <div class="measures-tab-content">
                <div class="mb-4">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-calculator"></i> Меры (Measures)
                    </h6>
                    <div class="alert alert-info">
                        <small>
                            <strong>Меры</strong> - это числовые значения, которые агрегируются (суммируются, усредняются и т.д.). 
                            Примеры: Sum(CPU Usage), Avg(Memory), Count(Servers). Выражения пишутся на формульном языке.
                        </small>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">
                            <i class="fas fa-chart-bar"></i> Быстрые меры по категориям
                        </h6>
                        <small class="text-muted">Для стекированных диаграмм</small>
                    </div>
                    
                    <div class="row">
                        ${this.renderCategoryMeasures()}
                    </div>
                </div>

                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">
                            <i class="fas fa-plus"></i> Доступные числовые поля
                        </h6>
                        <span class="badge bg-secondary">${this.getAvailableFields().length} полей</span>
                    </div>
                    
                    <div class="row">
                        ${this.renderAvailableFields()}
                    </div>
                </div>

                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">
                            <i class="fas fa-list"></i> Выбранные меры
                        </h6>
                        <span class="badge bg-primary">${this.panel.config.measures.length} выбрано</span>
                    </div>
                    
                    <div id="selected-measures">
                        ${this.renderSelectedMeasures()}
                    </div>
                </div>

                <div class="mb-3">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-code"></i> Пользовательские выражения
                    </h6>
                    <div class="card">
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label">Название выражения</label>
                                <input type="text" class="form-control" id="custom-measure-name" 
                                       placeholder="Например: 'Эффективность CPU'">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Формула</label>
                                <input type="text" class="form-control" id="custom-measure-expression" 
                                       placeholder="Например: Sum(cpu_usage) / Count(server_name)">
                                <div class="form-text">
                                    Доступные функции: Sum(), Avg(), Count(), Min(), Max(), а также +, -, *, /
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline-success" id="add-custom-measure">
                                <i class="fas fa-plus"></i> Добавить выражение
                            </button>
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
        return Object.keys(sample)
            .filter(key => this.isValidMeasure(sample[key]))
            .map(key => ({
                id: key,
                name: this.formatFieldName(key),
                type: 'numeric'
            }));
    }

    isValidMeasure(value) {
        return typeof value === 'number';
    }

    getCategoryFields() {
        if (!this.gridManager.sampleData || !this.gridManager.sampleData.length) {
            return [];
        }
        
        const sample = this.gridManager.sampleData[0];
        return Object.keys(sample)
            .filter(key => typeof sample[key] === 'string')
            .map(key => ({
                id: key,
                name: this.formatFieldName(key),
                type: 'categorical'
            }));
    }

    renderCategoryMeasures() {
        const categoryFields = this.getCategoryFields();
        
        if (!categoryFields.length) {
            return '<div class="col-12"><div class="text-muted text-center">Категориальные поля не найдены</div></div>';
        }

        return categoryFields.map(field => `
            <div class="col-md-6 mb-2">
                <div class="card field-card h-100" data-field-id="${field.id}" style="cursor: pointer;">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-semibold">📊 Количество по "${field.name}"</div>
                                <small class="text-muted">Count(${field.id})</small>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-outline-success btn-sm add-category-count" 
                                        data-field="${field.id}" 
                                        title="Подсчет по категориям">
                                    📊
                                </button>
                                <button class="btn btn-outline-info btn-sm add-category-unique" 
                                        data-field="${field.id}"
                                        title="Уникальные значения">
                                    🔢
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    getAggregationOptions() {
        return [
            { value: 'sum', name: 'Сумма', icon: '∑' },
            { value: 'avg', name: 'Среднее', icon: '⌀' },
            { value: 'count', name: 'Количество', icon: '№' },
            { value: 'count_distinct', name: 'Уникальные', icon: '🔢' },
            { value: 'min', name: 'Минимум', icon: '↓' },
            { value: 'max', name: 'Максимум', icon: '↑' }
        ];
    }

    renderAvailableFields() {
        const fields = this.getAvailableFields();
        const selectedFields = this.panel.config.measures.map(m => m.field);
        
        if (!fields.length) {
            return '<div class="col-12"><div class="text-muted text-center">Числовые поля не найдены</div></div>';
        }

        return fields
            .filter(field => !selectedFields.includes(field.id))
            .map(field => `
                <div class="col-md-6 mb-2">
                    <div class="card field-card h-100" data-field-id="${field.id}" style="cursor: pointer;">
                        <div class="card-body p-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="fw-semibold">🔢 ${field.name}</div>
                                    <small class="text-muted">${field.id}</small>
                                </div>
                                <div class="btn-group">
                                    ${this.getAggregationOptions().map(agg => `
                                        <button class="btn btn-outline-primary btn-sm add-measure" 
                                                data-field="${field.id}" data-aggregation="${agg.value}"
                                                title="${agg.name}(${field.name})">
                                            ${agg.icon}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('') || '<div class="col-12"><div class="text-muted text-center">Все доступные меры уже выбраны</div></div>';
    }

    renderSelectedMeasures() {
        if (!this.panel.config.measures.length) {
            return `
                <div class="text-center p-4 text-muted">
                    <i class="fas fa-calculator fa-2x mb-2"></i>
                    <div>Меры не выбраны</div>
                    <small>Выберите числовые поля из списка выше или создайте пользовательское выражение</small>
                </div>
            `;
        }

        return this.panel.config.measures.map((measure, index) => `
            <div class="card measure-item mb-3" data-index="${index}">
                <div class="card-body p-3">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Выражение</label>
                            <div class="fw-semibold">
                                ${measure.expression || `${this.getAggregationOptions().find(a => a.value === measure.aggregation)?.icon} ${measure.aggregation.toUpperCase()}(${measure.name})`}
                            </div>
                            <small class="text-muted">${measure.field || 'Пользовательское'}</small>
                        </div>
                        
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Отображаемое имя</label>
                            <input type="text" class="form-control measure-name" 
                                   value="${measure.name}" data-index="${index}"
                                   placeholder="Введите название...">
                        </div>
                        
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Агрегация</label>
                            <select class="form-select measure-aggregation" data-index="${index}" ${measure.expression ? 'disabled' : ''}>
                                ${this.getAggregationOptions().map(agg => `
                                    <option value="${agg.value}" ${measure.aggregation === agg.value ? 'selected' : ''}>
                                        ${agg.icon} ${agg.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Формат</label>
                            <select class="form-select measure-format" data-index="${index}">
                                <option value="number" ${(measure.format || 'number') === 'number' ? 'selected' : ''}>Число</option>
                                <option value="percent" ${measure.format === 'percent' ? 'selected' : ''}>Проценты</option>
                                <option value="currency" ${measure.format === 'currency' ? 'selected' : ''}>Валюта</option>
                                <option value="bytes" ${measure.format === 'bytes' ? 'selected' : ''}>Байты</option>
                            </select>
                        </div>
                        
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Действия</label>
                            <div class="btn-group w-100" role="group">
                                <button type="button" class="btn btn-outline-secondary move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-arrow-up"></i>
                                </button>
                                <button type="button" class="btn btn-outline-secondary move-down" data-index="${index}" ${index === this.panel.config.measures.length - 1 ? 'disabled' : ''}>
                                    <i class="fas fa-arrow-down"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger remove-measure" data-index="${index}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupEvents(container) {
        // Добавление категориальных мер для стекированных диаграмм
        container.querySelectorAll('.add-category-count').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldId = e.target.dataset.field;
                const field = this.getCategoryFields().find(f => f.id === fieldId);
                
                if (field) {
                    this.panel.config.measures.push({
                        field: fieldId,
                        name: `Количество записей`,
                        aggregation: 'count',
                        format: 'number',
                        categoryField: fieldId,
                        isStacked: true
                    });
                    this.refreshTab(container);
                    
                    // Автоматически устанавливаем тип диаграммы как стекированную
                    this.panel.config.display.chartType = 'bar';
                    this.panel.config.display.stacked = true;
                }
            });
        });

        container.querySelectorAll('.add-category-unique').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldId = e.target.dataset.field;
                const field = this.getCategoryFields().find(f => f.id === fieldId);
                
                if (field) {
                    this.panel.config.measures.push({
                        field: fieldId,
                        name: `Уникальные ${field.name}`,
                        aggregation: 'count_distinct',
                        format: 'number',
                        categoryField: fieldId,
                        isStacked: true
                    });
                    this.refreshTab(container);
                    
                    // Автоматически устанавливаем тип диаграммы как стекированную
                    this.panel.config.display.chartType = 'bar';
                    this.panel.config.display.stacked = true;
                }
            });
        });

        // Добавление простых мер
        container.querySelectorAll('.add-measure').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldId = e.target.dataset.field;
                const aggregation = e.target.dataset.aggregation;
                const field = this.getAvailableFields().find(f => f.id === fieldId);
                
                if (field) {
                    this.panel.config.measures.push({
                        field: field.id,
                        name: `${aggregation.toUpperCase()}(${field.name})`,
                        aggregation: aggregation,
                        format: 'number'
                    });
                    this.refreshTab(container);
                }
            });
        });

        // Добавление пользовательского выражения
        const customBtn = container.querySelector('#add-custom-measure');
        if (customBtn) {
            customBtn.addEventListener('click', () => {
                const name = container.querySelector('#custom-measure-name').value.trim();
                const expression = container.querySelector('#custom-measure-expression').value.trim();
                
                if (name && expression) {
                    this.panel.config.measures.push({
                        field: null,
                        name: name,
                        expression: expression,
                        aggregation: 'custom',
                        format: 'number'
                    });
                    
                    // Очистить поля
                    container.querySelector('#custom-measure-name').value = '';
                    container.querySelector('#custom-measure-expression').value = '';
                    
                    this.refreshTab(container);
                }
            });
        }

        // Удаление меры
        container.querySelectorAll('.remove-measure').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                this.panel.config.measures.splice(index, 1);
                this.refreshTab(container);
            });
        });

        // Перемещение мер
        container.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                if (index > 0) {
                    [this.panel.config.measures[index-1], this.panel.config.measures[index]] = 
                    [this.panel.config.measures[index], this.panel.config.measures[index-1]];
                    this.refreshTab(container);
                }
            });
        });

        container.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                if (index < this.panel.config.measures.length - 1) {
                    [this.panel.config.measures[index], this.panel.config.measures[index+1]] = 
                    [this.panel.config.measures[index+1], this.panel.config.measures[index]];
                    this.refreshTab(container);
                }
            });
        });

        // Изменение настроек мер
        container.querySelectorAll('.measure-name, .measure-aggregation, .measure-format').forEach(element => {
            element.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const measure = this.panel.config.measures[index];
                
                if (measure) {
                    if (e.target.classList.contains('measure-name')) {
                        measure.name = e.target.value;
                    } else if (e.target.classList.contains('measure-aggregation')) {
                        measure.aggregation = e.target.value;
                    } else if (e.target.classList.contains('measure-format')) {
                        measure.format = e.target.value;
                    }
                }
            });
        });
    }

    refreshTab(container) {
        const tabContent = container.querySelector('.measures-tab-content');
        if (tabContent) {
            tabContent.innerHTML = this.render().replace('<div class="measures-tab-content">', '').replace('</div>', '');
            this.setupEvents(container);
        }
    }

    updateConfig() {
        // Конфигурация обновляется в реальном времени через события
    }
}