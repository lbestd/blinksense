class DimensionsTab {
    constructor(panel, gridManager) {
        this.panel = panel;
        this.gridManager = gridManager;
    }

    render() {
        return `
            <div class="dimensions-tab-content">
                <div class="mb-4">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-layer-group"></i> Размеры (Dimensions)
                    </h6>
                    <div class="alert alert-info">
                        <small>
                            <strong>Размеры</strong> - это категории или группы, по которым вы агрегируете данные. 
                            Например: "Сервер", "Зона", "Тип ОС". Основное измерение определяет точки/столбцы на графике.
                        </small>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">
                            <i class="fas fa-plus"></i> Доступные поля
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
                            <i class="fas fa-list"></i> Выбранные размеры
                        </h6>
                        <span class="badge bg-primary">${this.panel.config.dimensions.length} выбрано</span>
                    </div>
                    
                    <div id="selected-dimensions">
                        ${this.renderSelectedDimensions()}
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
            .filter(key => this.isValidDimension(sample[key]))
            .map(key => ({
                id: key,
                name: this.formatFieldName(key),
                type: this.getFieldType(sample[key])
            }));
    }

    isValidDimension(value) {
        // Размеры - это категориальные и временные поля
        return typeof value === 'string' || 
               (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value));
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
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'date';
        return 'categorical';
    }

    renderAvailableFields() {
        const fields = this.getAvailableFields();
        const selectedFields = this.panel.config.dimensions.map(d => d.field);
        
        return fields
            .filter(field => !selectedFields.includes(field.id))
            .map(field => `
                <div class="col-md-6 mb-2">
                    <div class="card field-card h-100" data-field-id="${field.id}" style="cursor: pointer;">
                        <div class="card-body p-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="fw-semibold">${field.type === 'date' ? '📅' : '📝'} ${field.name}</div>
                                    <small class="text-muted">${field.id}</small>
                                </div>
                                <button class="btn btn-outline-primary btn-sm add-dimension" data-field="${field.id}">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('') || '<div class="col-12"><div class="text-muted text-center">Все доступные размеры уже выбраны</div></div>';
    }

    renderSelectedDimensions() {
        if (!this.panel.config.dimensions.length) {
            return `
                <div class="text-center p-4 text-muted">
                    <i class="fas fa-layer-group fa-2x mb-2"></i>
                    <div>Размеры не выбраны</div>
                    <small>Выберите поля из списка выше</small>
                </div>
            `;
        }

        return this.panel.config.dimensions.map((dimension, index) => `
            <div class="card dimension-item mb-3" data-index="${index}">
                <div class="card-body p-3">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Поле</label>
                            <div class="fw-semibold">
                                ${dimension.type === 'date' ? '📅' : '📝'} ${dimension.name}
                            </div>
                            <small class="text-muted">${dimension.field}</small>
                        </div>
                        
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Отображаемое имя</label>
                            <input type="text" class="form-control dimension-name" 
                                   value="${dimension.name}" data-index="${index}"
                                   placeholder="Введите название...">
                        </div>
                        
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Сортировка</label>
                            <select class="form-select dimension-sort-by" data-index="${index}">
                                <option value="name" ${dimension.sortBy === 'name' ? 'selected' : ''}>По названию</option>
                                <option value="value" ${dimension.sortBy === 'value' ? 'selected' : ''}>По значению</option>
                            </select>
                        </div>
                        
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Порядок</label>
                            <select class="form-select dimension-sort-order" data-index="${index}">
                                <option value="asc" ${dimension.sortOrder === 'asc' ? 'selected' : ''}>По возрастанию</option>
                                <option value="desc" ${dimension.sortOrder === 'desc' ? 'selected' : ''}>По убыванию</option>
                            </select>
                        </div>
                        
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Действия</label>
                            <div class="btn-group w-100" role="group">
                                <button type="button" class="btn btn-outline-secondary move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-arrow-up"></i>
                                </button>
                                <button type="button" class="btn btn-outline-secondary move-down" data-index="${index}" ${index === this.panel.config.dimensions.length - 1 ? 'disabled' : ''}>
                                    <i class="fas fa-arrow-down"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger remove-dimension" data-index="${index}">
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
        // Добавление размера
        container.querySelectorAll('.add-dimension').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldId = e.target.closest('[data-field]').dataset.field;
                const field = this.getAvailableFields().find(f => f.id === fieldId);
                
                if (field) {
                    this.panel.config.dimensions.push({
                        field: field.id,
                        name: field.name,
                        type: field.type,
                        sortBy: 'name',
                        sortOrder: 'asc'
                    });
                    this.refreshTab(container);
                }
            });
        });

        // Удаление размера
        container.querySelectorAll('.remove-dimension').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                this.panel.config.dimensions.splice(index, 1);
                this.refreshTab(container);
            });
        });

        // Перемещение размеров
        container.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                if (index > 0) {
                    [this.panel.config.dimensions[index-1], this.panel.config.dimensions[index]] = 
                    [this.panel.config.dimensions[index], this.panel.config.dimensions[index-1]];
                    this.refreshTab(container);
                }
            });
        });

        container.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('[data-index]').dataset.index);
                if (index < this.panel.config.dimensions.length - 1) {
                    [this.panel.config.dimensions[index], this.panel.config.dimensions[index+1]] = 
                    [this.panel.config.dimensions[index+1], this.panel.config.dimensions[index]];
                    this.refreshTab(container);
                }
            });
        });

        // Изменение настроек размеров
        container.querySelectorAll('.dimension-name, .dimension-sort-by, .dimension-sort-order').forEach(element => {
            element.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const dimension = this.panel.config.dimensions[index];
                
                if (dimension) {
                    if (e.target.classList.contains('dimension-name')) {
                        dimension.name = e.target.value;
                    } else if (e.target.classList.contains('dimension-sort-by')) {
                        dimension.sortBy = e.target.value;
                    } else if (e.target.classList.contains('dimension-sort-order')) {
                        dimension.sortOrder = e.target.value;
                    }
                }
            });
        });
    }

    refreshTab(container) {
        const tabContent = container.querySelector('.dimensions-tab-content');
        if (tabContent) {
            tabContent.innerHTML = this.render().replace('<div class="dimensions-tab-content">', '').replace('</div>', '');
            this.setupEvents(container);
        }
    }

    updateConfig() {
        // Конфигурация обновляется в реальном времени через события
    }
}