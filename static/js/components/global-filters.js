class GlobalFilters {
    constructor(gridManager) {
        this.gridManager = gridManager;
        this.filters = {
            dateRange: null,
            customFilters: []
        };
        this.init();
    }

    init() {
        this.setupDateFilters();
        this.setupQuickFilters();
        this.setupAdvancedFilters();
        this.setupEvents();
    }

    setupDateFilters() {
        // Не устанавливаем автоматически дефолтные значения дат
        // Поля дат будут показаны только когда добавлен фильтр по дате
        this.updateDateFilterVisibility();
    }

    updateDateFilterVisibility() {
        const hasDateFilters = this.filters.customFilters.some(f => {
            const field = this.getAvailableFields().find(field => field.id === f.field);
            return field && field.type === 'date';
        });
        
        const dateControls = document.querySelector('.card-body .row');
        const startDateCol = dateControls?.querySelector('.col-md-3:nth-child(1)');
        const endDateCol = dateControls?.querySelector('.col-md-3:nth-child(2)');
        const quickFiltersCol = dateControls?.querySelector('.col-md-2:nth-child(3)');
        
        if (startDateCol && endDateCol && quickFiltersCol) {
            if (hasDateFilters) {
                startDateCol.style.display = 'block';
                endDateCol.style.display = 'block';
                quickFiltersCol.style.display = 'block';
            } else {
                startDateCol.style.display = 'none';
                endDateCol.style.display = 'none';
                quickFiltersCol.style.display = 'none';
            }
        }
    }

    setupQuickFilters() {
        const quickFilters = document.getElementById('quickFilters');
        if (quickFilters) {
            quickFilters.addEventListener('change', (e) => {
                this.applyQuickFilter(e.target.value);
            });
        }
    }

    setupAdvancedFilters() {
        this.renderAdvancedFilters();
        
        const addFilterBtn = document.getElementById('addFilter');
        if (addFilterBtn) {
            addFilterBtn.addEventListener('click', () => {
                this.addCustomFilter();
            });
        }

        // Показать/скрыть расширенные фильтры
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-outline-info btn-sm ms-2';
        toggleBtn.innerHTML = '<i class="fas fa-cog"></i> Расширенные';
        toggleBtn.onclick = () => this.toggleAdvancedFilters();
        
        const filtersRow = document.querySelector('.card-body .row');
        if (filtersRow) {
            const lastCol = filtersRow.querySelector('.col-md-2:last-child');
            if (lastCol) {
                lastCol.appendChild(toggleBtn);
            }
        }
    }

    setupEvents() {
        const applyBtn = document.getElementById('applyFilters');
        const resetBtn = document.getElementById('resetFilters');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
    }

    applyQuickFilter(filterType) {
        const now = new Date();
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        if (!startDate || !endDate) return;

        switch (filterType) {
            case 'last_24h':
                startDate.value = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
                endDate.value = now.toISOString().slice(0, 16);
                break;
            case 'last_7d':
                startDate.value = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
                endDate.value = now.toISOString().slice(0, 16);
                break;
            case 'last_30d':
                startDate.value = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
                endDate.value = now.toISOString().slice(0, 16);
                break;
        }
        
        // Автоматически применяем фильтр
        this.applyFilters();
    }

    addCustomFilter() {
        const filterId = `filter-${Date.now()}`;
        this.filters.customFilters.push({
            id: filterId,
            field: '',
            operator: 'equals',
            value: ''
        });
        
        this.renderAdvancedFilters();
    }

    removeCustomFilter(filterId) {
        this.filters.customFilters = this.filters.customFilters.filter(f => f.id !== filterId);
        this.renderAdvancedFilters();
    }

    renderAdvancedFilters() {
        const container = document.getElementById('dynamicFilters');
        if (!container) return;

        const availableFields = this.getAvailableFields();

        container.innerHTML = this.filters.customFilters.map(filter => {
            const selectedField = availableFields.find(f => f.id === filter.field);
            return `
                <div class="col-md-12 mb-3 filter-row" data-filter-id="${filter.id}">
                    <div class="card">
                        <div class="card-body p-3">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label small">Поле</label>
                                    <select class="form-control filter-field" data-filter-id="${filter.id}">
                                        <option value="">Выберите поле</option>
                                        ${availableFields.map(field => `
                                            <option value="${field.id}" data-type="${field.type}" ${filter.field === field.id ? 'selected' : ''}>
                                                ${field.type === 'date' ? '📅' : field.type === 'number' ? '🔢' : '📝'} ${field.name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small">Условие</label>
                                    ${this.renderOperatorSelect(filter, selectedField)}
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label small">Значение</label>
                                    ${this.renderValueInput(filter, selectedField)}
                                </div>
                                <div class="col-md-1 d-flex align-items-end">
                                    <button class="btn btn-outline-danger btn-sm remove-filter" data-filter-id="${filter.id}">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Добавляем обработчики событий
        this.setupAdvancedFilterEvents(container);
        
        // Обновляем видимость элементов дат
        this.updateDateFilterVisibility();
    }

    renderOperatorSelect(filter, selectedField) {
        const fieldType = selectedField ? selectedField.type : null;
        
        let operators = [];
        if (fieldType === 'date') {
            operators = [
                { value: 'equals', name: 'Равно' },
                { value: 'not_equals', name: 'Не равно' },
                { value: 'gt', name: 'После' },
                { value: 'gte', name: 'После или в' },
                { value: 'lt', name: 'До' },
                { value: 'lte', name: 'До или в' },
                { value: 'between', name: 'Между' }
            ];
        } else if (fieldType === 'number') {
            operators = [
                { value: 'equals', name: 'Равно' },
                { value: 'not_equals', name: 'Не равно' },
                { value: 'gt', name: 'Больше' },
                { value: 'gte', name: 'Больше или равно' },
                { value: 'lt', name: 'Меньше' },
                { value: 'lte', name: 'Меньше или равно' },
                { value: 'between', name: 'Между' }
            ];
        } else {
            operators = [
                { value: 'equals', name: 'Равно' },
                { value: 'not_equals', name: 'Не равно' },
                { value: 'contains', name: 'Содержит' },
                { value: 'not_contains', name: 'Не содержит' },
                { value: 'starts_with', name: 'Начинается с' },
                { value: 'ends_with', name: 'Заканчивается на' },
                { value: 'in', name: 'В списке' }
            ];
        }

        return `
            <select class="form-control filter-operator" data-filter-id="${filter.id}">
                <option value="">Выберите условие</option>
                ${operators.map(op => `
                    <option value="${op.value}" ${filter.operator === op.value ? 'selected' : ''}>
                        ${op.name}
                    </option>
                `).join('')}
            </select>
        `;
    }

    renderValueInput(filter, selectedField) {
        if (!selectedField) {
            return `<input type="text" class="form-control filter-value" data-filter-id="${filter.id}" 
                           value="${filter.value || ''}" placeholder="Сначала выберите поле" disabled>`;
        }

        const fieldType = selectedField.type;
        
        if (fieldType === 'date') {
            // Определяем нужен ли datetime-local или обычный date
            const inputType = this.needsDateTime(selectedField.id) ? 'datetime-local' : 'date';
            
            if (filter.operator === 'between') {
                return `
                    <div class="row g-2">
                        <div class="col-6">
                            <input type="${inputType}" class="form-control filter-value-start" data-filter-id="${filter.id}" 
                                   value="${this.formatDateValue(filter.valueStart, inputType)}" placeholder="От">
                        </div>
                        <div class="col-6">
                            <input type="${inputType}" class="form-control filter-value-end" data-filter-id="${filter.id}" 
                                   value="${this.formatDateValue(filter.valueEnd, inputType)}" placeholder="До">
                        </div>
                    </div>
                `;
            } else {
                return `<input type="${inputType}" class="form-control filter-value" data-filter-id="${filter.id}" 
                               value="${this.formatDateValue(filter.value, inputType)}" placeholder="Выберите ${inputType === 'datetime-local' ? 'дату и время' : 'дату'}">`;
            }
        } else if (fieldType === 'number') {
            if (filter.operator === 'between') {
                return `
                    <div class="row g-2">
                        <div class="col-6">
                            <input type="number" class="form-control filter-value-start" data-filter-id="${filter.id}" 
                                   value="${filter.valueStart || ''}" placeholder="От">
                        </div>
                        <div class="col-6">
                            <input type="number" class="form-control filter-value-end" data-filter-id="${filter.id}" 
                                   value="${filter.valueEnd || ''}" placeholder="До">
                        </div>
                    </div>
                `;
            } else {
                return `<input type="number" class="form-control filter-value" data-filter-id="${filter.id}" 
                               value="${filter.value || ''}" placeholder="Введите число">`;
            }
        } else {
            // Для категориальных полей показываем dropdown с уникальными значениями
            if (filter.operator === 'in') {
                const uniqueValues = this.getUniqueValues(selectedField.id);
                return `
                    <select class="form-control filter-value" data-filter-id="${filter.id}" multiple>
                        ${uniqueValues.map(val => `
                            <option value="${val}" ${(filter.value || []).includes(val) ? 'selected' : ''}>
                                ${val}
                            </option>
                        `).join('')}
                    </select>
                    <small class="text-muted">Удерживайте Ctrl для множественного выбора</small>
                `;
            } else {
                const uniqueValues = this.getUniqueValues(selectedField.id);
                return `
                    <div class="position-relative">
                        <input type="text" class="form-control filter-value" data-filter-id="${filter.id}" 
                               value="${filter.value || ''}" placeholder="Введите значение" list="values-${filter.id}">
                        <datalist id="values-${filter.id}">
                            ${uniqueValues.map(val => `<option value="${val}"></option>`).join('')}
                        </datalist>
                    </div>
                `;
            }
        }
    }

    getUniqueValues(fieldId) {
        if (!this.gridManager.sampleData || !this.gridManager.sampleData.length) {
            return [];
        }

        const uniqueValues = new Set();
        this.gridManager.sampleData.forEach(record => {
            const value = record[fieldId];
            if (value !== null && value !== undefined && value !== '') {
                uniqueValues.add(String(value));
            }
        });

        return Array.from(uniqueValues).sort().slice(0, 50); // Ограничиваем 50 значениями
    }

    setupAdvancedFilterEvents(container) {
        // Изменение поля - обновляем операторы и ввод значения
        container.querySelectorAll('.filter-field').forEach(select => {
            select.addEventListener('change', (e) => {
                const filterId = e.target.dataset.filterId;
                const filter = this.filters.customFilters.find(f => f.id === filterId);
                if (filter) {
                    filter.field = e.target.value;
                    filter.operator = ''; // Сбрасываем оператор
                    filter.value = ''; // Сбрасываем значение
                    this.renderAdvancedFilters(); // Перерисовываем
                }
            });
        });

        // Изменение оператора - обновляем поле ввода значения
        container.querySelectorAll('.filter-operator').forEach(select => {
            select.addEventListener('change', (e) => {
                const filterId = e.target.dataset.filterId;
                const filter = this.filters.customFilters.find(f => f.id === filterId);
                if (filter) {
                    const oldOperator = filter.operator;
                    filter.operator = e.target.value;
                    
                    // Сбрасываем значение только при кардинальной смене типа оператора
                    const needsValueReset = this.shouldResetValue(oldOperator, e.target.value);
                    if (needsValueReset) {
                        filter.value = '';
                        filter.valueStart = '';
                        filter.valueEnd = '';
                    }
                    
                    this.renderAdvancedFilters(); // Перерисовываем
                }
            });
        });

        // Изменение значения
        container.querySelectorAll('.filter-value, .filter-value-start, .filter-value-end').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateCustomFilterValue(e.target.dataset.filterId, e.target);
            });
        });

        container.querySelectorAll('.remove-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeCustomFilter(e.target.closest('[data-filter-id]').dataset.filterId);
            });
        });
    }

    updateCustomFilterValue(filterId, element) {
        const filter = this.filters.customFilters.find(f => f.id === filterId);
        if (!filter) return;

        if (element.classList.contains('filter-value-start')) {
            filter.valueStart = element.value;
            console.log('Updated valueStart:', filter.valueStart);
        } else if (element.classList.contains('filter-value-end')) {
            filter.valueEnd = element.value;
            console.log('Updated valueEnd:', filter.valueEnd);
        } else if (element.multiple) {
            // Для множественного выбора
            filter.value = Array.from(element.selectedOptions).map(option => option.value);
            console.log('Updated multi-value:', filter.value);
        } else {
            filter.value = element.value;
            console.log('Updated value:', filter.value);
        }
        
        console.log('Full filter after update:', filter);
    }

    shouldResetValue(oldOperator, newOperator) {
        // Определяем когда нужно сбрасывать значение при смене оператора
        
        if (!oldOperator || !newOperator) return false;
        
        // Группы совместимых операторов
        const singleValueOperators = ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'gt', 'gte', 'lt', 'lte'];
        const rangeOperators = ['between'];
        const multiValueOperators = ['in'];
        
        const oldGroup = this.getOperatorGroup(oldOperator, singleValueOperators, rangeOperators, multiValueOperators);
        const newGroup = this.getOperatorGroup(newOperator, singleValueOperators, rangeOperators, multiValueOperators);
        
        // Сбрасываем значение только при смене группы операторов
        return oldGroup !== newGroup;
    }

    getOperatorGroup(operator, singleValueOperators, rangeOperators, multiValueOperators) {
        if (singleValueOperators.includes(operator)) return 'single';
        if (rangeOperators.includes(operator)) return 'range';
        if (multiValueOperators.includes(operator)) return 'multi';
        return 'unknown';
    }

    updateCustomFilter(filterId, element) {
        const filter = this.filters.customFilters.find(f => f.id === filterId);
        if (!filter) return;

        if (element.classList.contains('filter-field')) {
            filter.field = element.value;
        } else if (element.classList.contains('filter-operator')) {
            filter.operator = element.value;
        } else if (element.classList.contains('filter-value')) {
            filter.value = element.value;
        }
    }

    getAvailableFields() {
        if (!this.gridManager.sampleData || !this.gridManager.sampleData.length) {
            return [];
        }
        
        const sample = this.gridManager.sampleData[0];
        return Object.keys(sample).map(key => ({
            id: key,
            name: this.formatFieldName(key),
            type: this.detectFieldType(sample[key])
        }));
    }

    detectFieldType(value) {
        if (value === null || value === undefined) return 'string';

        if (typeof value === 'number') return 'number';

        if (typeof value === 'string') {
            // Проверяем на числовое значение
            if (!isNaN(parseFloat(value)) && isFinite(value)) {
                return 'number';
            }

            // Проверяем на дату в ISO формате (2024-01-01T00:00:00)
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return 'date';
                }
            }

            // Проверяем на простую дату (2024-01-01, 01/01/2024 и т.д.)
            const dateFormats = [
                /^\d{4}-\d{2}-\d{2}$/,
                /^\d{2}\/\d{2}\/\d{4}$/,
                /^\d{2}\.\d{2}\.\d{4}$/,
                /^\d{4}\/\d{2}\/\d{2}$/
            ];

            if (dateFormats.some(format => format.test(value))) {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return 'date';
                }
            }
        }

        return 'string';
    }

    formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    needsDateTime(fieldId) {
        // Проверяем содержит ли поле время в формате ISO (T00:00:00)
        if (!this.gridManager.sampleData || !this.gridManager.sampleData.length) {
            return false;
        }
        
        const sample = this.gridManager.sampleData[0];
        const value = sample[fieldId];
        
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
    }

    formatDateValue(value, inputType) {
        if (!value) return '';
        
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return '';
            
            if (inputType === 'datetime-local') {
                // Форматируем для datetime-local (YYYY-MM-DDTHH:mm)
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            } else {
                // Форматируем для date (YYYY-MM-DD)
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                
                return `${year}-${month}-${day}`;
            }
        } catch (error) {
            console.warn('Error formatting date value:', value, error);
            return '';
        }
    }

    toggleAdvancedFilters() {
        const advancedSection = document.getElementById('advancedFilters');
        if (advancedSection) {
            const isVisible = advancedSection.style.display !== 'none';
            advancedSection.style.display = isVisible ? 'none' : 'block';
        }
    }

    applyFilters() {
        // Собираем все фильтры
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        // Временной диапазон
        if (startDate && endDate && startDate.value && endDate.value) {
            this.filters.dateRange = {
                start: startDate.value,
                end: endDate.value
            };
        }

        // Валидные пользовательские фильтры
        const validCustomFilters = this.filters.customFilters.filter(f => 
            f.field && f.operator && f.value
        );

        // Применяем фильтры ко всем панелям
        this.gridManager.applyGlobalFilters({
            dateRange: this.filters.dateRange,
            customFilters: validCustomFilters
        });

        // Обновляем все панели
        this.gridManager.refreshAllPanels();

        // Показываем уведомление
        this.showNotification('Фильтры применены', 'success');
    }

    resetFilters() {
        // Сброс фильтров
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const quickFilters = document.getElementById('quickFilters');

        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';
        if (quickFilters) quickFilters.value = '';

        this.filters.customFilters = [];
        this.filters.dateRange = null;

        this.renderAdvancedFilters();

        // Применяем пустые фильтры
        this.gridManager.applyGlobalFilters({
            dateRange: null,
            customFilters: []
        });

        this.gridManager.refreshAllPanels();
        this.showNotification('Фильтры сброшены', 'info');
    }

    showNotification(message, type = 'info') {
        // Простое уведомление через браузер
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Автоматически удаляем через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Получить текущие активные фильтры
    getCurrentFilters() {
        return {
            dateRange: this.filters.dateRange,
            customFilters: this.filters.customFilters.filter(f => f.field && f.operator && f.value)
        };
    }
}