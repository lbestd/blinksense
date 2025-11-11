class SortingTab {
    constructor(panel, gridManager) {
        this.panel = panel;
        this.gridManager = gridManager;
    }

    render() {
        return `
            <div class="sorting-tab-content">
                <div class="mb-4">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-sort"></i> Сортировка (Sorting)
                    </h6>
                    <div class="alert alert-info">
                        <small>
                            <strong>Сортировка</strong> определяет порядок отображения измерений и мер 
                            (по названию, по значению, по алфавиту, по числовому значению и т.д.).
                        </small>
                    </div>
                </div>

                <div class="mb-4">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-layer-group"></i> Сортировка размеров
                    </h6>
                    ${this.renderDimensionsSorting()}
                </div>

                <div class="mb-4">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-calculator"></i> Сортировка мер
                    </h6>
                    ${this.renderMeasuresSorting()}
                </div>

                <div class="mb-3">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-cog"></i> Глобальные настройки
                    </h6>
                    <div class="card">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <label class="form-label">Направление по умолчанию</label>
                                    <select class="form-select default-sort-order" id="default-sort-order">
                                        <option value="asc" ${this.getDefaultSortOrder() === 'asc' ? 'selected' : ''}>
                                            ↑ По возрастанию
                                        </option>
                                        <option value="desc" ${this.getDefaultSortOrder() === 'desc' ? 'selected' : ''}>
                                            ↓ По убыванию
                                        </option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Режим сортировки</label>
                                    <select class="form-select sort-mode" id="sort-mode">
                                        <option value="dimensions_first">Сначала размеры, затем меры</option>
                                        <option value="measures_first">Сначала меры, затем размеры</option>
                                        <option value="custom" selected>Пользовательский порядок</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDimensionsSorting() {
        if (!this.panel.config.dimensions.length) {
            return `
                <div class="text-center p-4 text-muted">
                    <i class="fas fa-layer-group fa-2x mb-2"></i>
                    <div>Размеры не настроены</div>
                    <small>Перейдите на вкладку "Размеры" чтобы добавить размеры</small>
                </div>
            `;
        }

        return `
            <div class="dimensions-sorting">
                ${this.panel.config.dimensions.map((dimension, index) => `
                    <div class="card dimension-sort-item mb-3" data-type="dimension" data-index="${index}">
                        <div class="card-body p-3">
                            <div class="row g-3 align-items-center">
                                <div class="col-md-3">
                                    <label class="form-label small text-muted">Размер</label>
                                    <div class="fw-semibold">
                                        ${dimension.type === 'date' ? '📅' : '📝'} ${dimension.name}
                                    </div>
                                    <small class="text-muted">${dimension.field}</small>
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label small text-muted">Сортировать по</label>
                                    <select class="form-select dimension-sort-by" data-index="${index}">
                                        <option value="name" ${(this.getSortingRule('dimensions', dimension.field)?.sortBy || 'name') === 'name' ? 'selected' : ''}>
                                            📝 По названию
                                        </option>
                                        <option value="value" ${this.getSortingRule('dimensions', dimension.field)?.sortBy === 'value' ? 'selected' : ''}>
                                            🔢 По значению
                                        </option>
                                        <option value="frequency" ${this.getSortingRule('dimensions', dimension.field)?.sortBy === 'frequency' ? 'selected' : ''}>
                                            📊 По частоте
                                        </option>
                                    </select>
                                </div>
                                
                                <div class="col-md-2">
                                    <label class="form-label small text-muted">Порядок</label>
                                    <select class="form-select dimension-sort-order" data-index="${index}">
                                        <option value="asc" ${(this.getSortingRule('dimensions', dimension.field)?.order || 'asc') === 'asc' ? 'selected' : ''}>
                                            ↑ Возрастание
                                        </option>
                                        <option value="desc" ${this.getSortingRule('dimensions', dimension.field)?.order === 'desc' ? 'selected' : ''}>
                                            ↓ Убывание
                                        </option>
                                    </select>
                                </div>
                                
                                <div class="col-md-2">
                                    <label class="form-label small text-muted">Приоритет</label>
                                    <div class="btn-group w-100" role="group">
                                        <button type="button" class="btn btn-outline-secondary move-dimension-up" 
                                                data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-up"></i>
                                        </button>
                                        <button type="button" class="btn btn-outline-secondary move-dimension-down" 
                                                data-index="${index}" ${index === this.panel.config.dimensions.length - 1 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-down"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="col-md-2">
                                    <label class="form-label small text-muted">Включено</label>
                                    <div class="form-check form-switch">
                                        <input class="form-check-input dimension-sort-enabled" type="checkbox" 
                                               data-index="${index}" ${this.getSortingRule('dimensions', dimension.field) ? 'checked' : ''}>
                                        <label class="form-check-label">Активно</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMeasuresSorting() {
        if (!this.panel.config.measures.length) {
            return `
                <div class="text-center p-4 text-muted">
                    <i class="fas fa-calculator fa-2x mb-2"></i>
                    <div>Меры не настроены</div>
                    <small>Перейдите на вкладку "Меры" чтобы добавить меры</small>
                </div>
            `;
        }

        return `
            <div class="measures-sorting">
                ${this.panel.config.measures.map((measure, index) => `
                    <div class="card measure-sort-item mb-3" data-type="measure" data-index="${index}">
                        <div class="card-body p-3">
                            <div class="row g-3 align-items-center">
                                <div class="col-md-4">
                                    <label class="form-label small text-muted">Мера</label>
                                    <div class="fw-semibold">
                                        🔢 ${measure.name}
                                    </div>
                                    <small class="text-muted">${measure.expression || measure.field || 'Пользовательское'}</small>
                                </div>
                                
                                <div class="col-md-2">
                                    <label class="form-label small text-muted">Порядок</label>
                                    <select class="form-select measure-sort-order" data-index="${index}">
                                        <option value="asc" ${(this.getSortingRule('measures', measure.field)?.order || 'desc') === 'asc' ? 'selected' : ''}>
                                            ↑ Возрастание
                                        </option>
                                        <option value="desc" ${(this.getSortingRule('measures', measure.field)?.order || 'desc') === 'desc' ? 'selected' : ''}>
                                            ↓ Убывание
                                        </option>
                                    </select>
                                </div>
                                
                                <div class="col-md-2">
                                    <label class="form-label small text-muted">Приоритет</label>
                                    <div class="btn-group w-100" role="group">
                                        <button type="button" class="btn btn-outline-secondary move-measure-up" 
                                                data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-up"></i>
                                        </button>
                                        <button type="button" class="btn btn-outline-secondary move-measure-down" 
                                                data-index="${index}" ${index === this.panel.config.measures.length - 1 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-down"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="col-md-2">
                                    <label class="form-label small text-muted">Включено</label>
                                    <div class="form-check form-switch">
                                        <input class="form-check-input measure-sort-enabled" type="checkbox" 
                                               data-index="${index}" ${this.getSortingRule('measures', measure.field) ? 'checked' : ''}>
                                        <label class="form-check-label">Активно</label>
                                    </div>
                                </div>
                                
                                <div class="col-md-2">
                                    <label class="form-label small text-muted">Основная</label>
                                    <div class="form-check">
                                        <input class="form-check-input measure-primary-sort" type="radio" 
                                               name="primaryMeasureSort" data-index="${index}"
                                               ${this.isPrimarySortMeasure(measure.field) ? 'checked' : ''}>
                                        <label class="form-check-label">Главная</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getSortingRule(type, field) {
        if (!this.panel.config.sorting || !this.panel.config.sorting[type]) {
            return null;
        }
        return this.panel.config.sorting[type].find(rule => rule.field === field);
    }

    getDefaultSortOrder() {
        return this.panel.config.sorting.defaultOrder || 'asc';
    }

    isPrimarySortMeasure(field) {
        return this.panel.config.sorting.primaryMeasure === field;
    }

    setupEvents(container) {
        // Изменение настроек сортировки размеров
        container.querySelectorAll('.dimension-sort-by, .dimension-sort-order').forEach(element => {
            element.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const dimension = this.panel.config.dimensions[index];
                
                if (dimension) {
                    this.updateDimensionSorting(dimension.field, {
                        sortBy: container.querySelector(`.dimension-sort-by[data-index="${index}"]`).value,
                        order: container.querySelector(`.dimension-sort-order[data-index="${index}"]`).value
                    });
                }
            });
        });

        // Включение/выключение сортировки размеров
        container.querySelectorAll('.dimension-sort-enabled').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const dimension = this.panel.config.dimensions[index];
                
                if (e.target.checked) {
                    this.updateDimensionSorting(dimension.field, {
                        sortBy: container.querySelector(`.dimension-sort-by[data-index="${index}"]`).value,
                        order: container.querySelector(`.dimension-sort-order[data-index="${index}"]`).value
                    });
                } else {
                    this.removeDimensionSorting(dimension.field);
                }
            });
        });

        // Изменение настроек сортировки мер
        container.querySelectorAll('.measure-sort-order').forEach(element => {
            element.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const measure = this.panel.config.measures[index];
                
                if (measure) {
                    this.updateMeasureSorting(measure.field, {
                        order: e.target.value
                    });
                }
            });
        });

        // Включение/выключение сортировки мер
        container.querySelectorAll('.measure-sort-enabled').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const measure = this.panel.config.measures[index];
                
                if (e.target.checked) {
                    this.updateMeasureSorting(measure.field, {
                        order: container.querySelector(`.measure-sort-order[data-index="${index}"]`).value
                    });
                } else {
                    this.removeMeasureSorting(measure.field);
                }
            });
        });

        // Выбор основной меры для сортировки
        container.querySelectorAll('.measure-primary-sort').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const index = parseInt(e.target.dataset.index);
                    const measure = this.panel.config.measures[index];
                    this.panel.config.sorting.primaryMeasure = measure.field;
                }
            });
        });

        // Перемещение размеров
        this.setupMoveEvents(container, 'dimension', this.panel.config.dimensions);
        
        // Перемещение мер
        this.setupMoveEvents(container, 'measure', this.panel.config.measures);

        // Глобальные настройки
        const defaultSortOrderSelect = container.querySelector('#default-sort-order');
        if (defaultSortOrderSelect) {
            defaultSortOrderSelect.addEventListener('change', (e) => {
                this.panel.config.sorting.defaultOrder = e.target.value;
            });
        }

        const sortModeSelect = container.querySelector('#sort-mode');
        if (sortModeSelect) {
            sortModeSelect.addEventListener('change', (e) => {
                this.panel.config.sorting.mode = e.target.value;
            });
        }
    }

    setupMoveEvents(container, type, collection) {
        container.querySelectorAll(`.move-${type}-up`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                if (index > 0) {
                    [collection[index-1], collection[index]] = [collection[index], collection[index-1]];
                    this.refreshTab(container);
                }
            });
        });

        container.querySelectorAll(`.move-${type}-down`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                if (index < collection.length - 1) {
                    [collection[index], collection[index+1]] = [collection[index+1], collection[index]];
                    this.refreshTab(container);
                }
            });
        });
    }

    updateDimensionSorting(field, options) {
        if (!this.panel.config.sorting.dimensions) {
            this.panel.config.sorting.dimensions = [];
        }

        let rule = this.panel.config.sorting.dimensions.find(r => r.field === field);
        if (!rule) {
            rule = { field };
            this.panel.config.sorting.dimensions.push(rule);
        }

        Object.assign(rule, options);
    }

    removeDimensionSorting(field) {
        if (this.panel.config.sorting.dimensions) {
            this.panel.config.sorting.dimensions = this.panel.config.sorting.dimensions.filter(r => r.field !== field);
        }
    }

    updateMeasureSorting(field, options) {
        if (!this.panel.config.sorting.measures) {
            this.panel.config.sorting.measures = [];
        }

        let rule = this.panel.config.sorting.measures.find(r => r.field === field);
        if (!rule) {
            rule = { field };
            this.panel.config.sorting.measures.push(rule);
        }

        Object.assign(rule, options);
    }

    removeMeasureSorting(field) {
        if (this.panel.config.sorting.measures) {
            this.panel.config.sorting.measures = this.panel.config.sorting.measures.filter(r => r.field !== field);
        }
    }

    refreshTab(container) {
        const tabContent = container.querySelector('.sorting-tab-content');
        if (tabContent) {
            tabContent.innerHTML = this.render().replace('<div class="sorting-tab-content">', '').replace('</div>', '');
            this.setupEvents(container);
        }
    }

    updateConfig() {
        // Конфигурация обновляется в реальном времени через события
    }
}