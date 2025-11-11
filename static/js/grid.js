class GridManager {
    constructor() {
        this.metrics = [];
        this.sampleData = null;
        this.globalFilters = {
            dateRange: null,
            customFilters: []
        };
        this.panelManager = null;
    }

    analyzeData(data) {
        if (!data || data.length === 0) return;

        this.sampleData = data;
        this.metrics = this.extractMetricsFromData(data);
    }

    extractMetricsFromData(data) {
        const sample = data[0];
        const metrics = [];

        for (const [key, value] of Object.entries(sample)) {
            if (key === 'timestamp') continue;

            const metric = {
                id: key,
                name: this.formatFieldName(key),
                type: this.detectDataType(value)
            };
            metrics.push(metric);
        }

        return metrics.sort((a, b) => {
            const typeOrder = { 'number': 0, 'date': 1, 'string': 2 };
            return typeOrder[a.type] - typeOrder[b.type];
        });
    }

    detectDataType(value) {
        if (value === null || value === undefined) return 'string';

        if (typeof value === 'number') return 'number';

        if (typeof value === 'string') {
            if (!isNaN(parseFloat(value)) && isFinite(value)) {
                return 'number';
            }

            if (this.isIsoDateString(value)) {
                return 'date';
            }

            if (this.isDateString(value)) {
                return 'date';
            }
        }

        return 'string';
    }

    isIsoDateString(str) {
        // Принимаем как полный формат с секундами, так и короткий без секунд
        const hasSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
        const hasMinutes = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str);
        
        return (hasSeconds || hasMinutes) && !isNaN(Date.parse(str));
    }

    isDateString(str) {
        // Сначала проверяем ISO datetime формат
        if (this.isIsoDateString(str)) {
            return true;
        }
        
        // Потом проверяем обычные форматы дат
        const dateFormats = [
            /^\d{4}-\d{2}-\d{2}$/,
            /^\d{2}\/\d{2}\/\d{4}$/,
            /^\d{2}\.\d{2}\.\d{4}$/,
            /^\d{4}\/\d{2}\/\d{2}$/
        ];

        return dateFormats.some(format => format.test(str)) && !isNaN(Date.parse(str));
    }

    formatFieldName(field) {
        // Автоматическое форматирование: user_sessions -> User Sessions
        return field
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Методы для работы с глобальными фильтрами
    applyGlobalFilters(filters) {
        this.globalFilters = filters;
    }

    getFilteredData() {
        let data = this.sampleData || [];

        // Если глобальные фильтры не инициализированы, возвращаем все данные
        if (!this.globalFilters) {
            return data;
        }

        // Применяем временной фильтр
        if (this.globalFilters.dateRange) {
            data = this.applyDateRangeFilter(data, this.globalFilters.dateRange);
        }

        // Применяем пользовательские фильтры
        if (this.globalFilters.customFilters && this.globalFilters.customFilters.length > 0) {
            data = this.applyCustomFilters(data, this.globalFilters.customFilters);
        }

        return data;
    }

    applyDateRangeFilter(data, dateRange) {
        if (!dateRange || (!dateRange.start && !dateRange.end)) return data;

        return data.filter(record => {
            const recordDate = new Date(record.timestamp);
            if (dateRange.start && recordDate < new Date(dateRange.start)) return false;
            if (dateRange.end && recordDate > new Date(dateRange.end)) return false;
            return true;
        });
    }

    applyCustomFilters(data, filters) {
        return data.filter(record => {
            return filters.every(filter => {
                if (!filter.field || !filter.operator) return true;
                
                const value = record[filter.field];
                const filterValue = filter.value;
                
                // Проверяем что значение фильтра задано (кроме некоторых случаев)
                if (filterValue === '' || filterValue === null || filterValue === undefined) {
                    if (['between', 'in'].includes(filter.operator)) {
                        return this.handleSpecialOperators(value, filter);
                    }
                    return true;
                }
                
                switch (filter.operator) {
                    case 'equals':
                        return this.isDateLikeComparison(value, filterValue) 
                            ? this.compareDates(value, filterValue, '===')
                            : String(value) === String(filterValue);
                    case 'not_equals':
                        return this.isDateLikeComparison(value, filterValue)
                            ? this.compareDates(value, filterValue, '!==')
                            : String(value) !== String(filterValue);
                    case 'contains':
                        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                    case 'not_contains':
                        return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                    case 'starts_with':
                        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
                    case 'ends_with':
                        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
                    case 'gt':
                        return this.compareValues(value, filterValue, '>');
                    case 'gte':
                        return this.compareValues(value, filterValue, '>=');
                    case 'lt':
                        return this.compareValues(value, filterValue, '<');
                    case 'lte':
                        return this.compareValues(value, filterValue, '<=');
                    case 'between':
                        return this.handleBetween(value, filter);
                    case 'in':
                        return Array.isArray(filterValue) ? filterValue.includes(String(value)) : false;
                    default:
                        return true;
                }
            });
        });
    }

    handleSpecialOperators(value, filter) {
        if (filter.operator === 'between') {
            return this.handleBetween(value, filter);
        } else if (filter.operator === 'in') {
            return Array.isArray(filter.value) && filter.value.length > 0 
                ? filter.value.includes(String(value)) 
                : true;
        }
        return true;
    }

    handleBetween(value, filter) {
        const startValue = filter.valueStart;
        const endValue = filter.valueEnd;
        
        console.log('handleBetween:', { value, startValue, endValue });
        
        if (!startValue && !endValue) {
            console.log('Between: no values provided, returning true');
            return true;
        }
        
        if (startValue && !endValue) {
            const result = this.compareValues(value, startValue, '>=');
            console.log('Between: only start value, result:', result);
            return result;
        }
        
        if (!startValue && endValue) {
            const result = this.compareValues(value, endValue, '<=');
            console.log('Between: only end value, result:', result);
            return result;
        }
        
        const startCheck = this.compareValues(value, startValue, '>=');
        const endCheck = this.compareValues(value, endValue, '<=');
        const result = startCheck && endCheck;
        
        console.log('Between: both values, startCheck:', startCheck, 'endCheck:', endCheck, 'result:', result);
        return result;
    }

    compareValues(value1, value2, operator) {
        // Пытаемся определить тип данных и сравнить соответственно
        const isDate1 = this.isDateString(String(value1));
        const isDate2 = this.isDateString(String(value2));
        
        console.log('compareValues:', { value1, value2, operator, isDate1, isDate2 });
        
        if (isDate1 && isDate2) {
            const date1 = new Date(value1);
            const date2 = new Date(value2);
            
            console.log('Date comparison:', { 
                date1: date1.toISOString(), 
                date2: date2.toISOString(), 
                valid1: !isNaN(date1.getTime()), 
                valid2: !isNaN(date2.getTime()) 
            });
            
            switch (operator) {
                case '>': return date1 > date2;
                case '>=': return date1 >= date2;
                case '<': return date1 < date2;
                case '<=': return date1 <= date2;
                default: return false;
            }
        }
        
        // Пытаемся как числа
        const num1 = Number(value1);
        const num2 = Number(value2);
        
        if (!isNaN(num1) && !isNaN(num2)) {
            switch (operator) {
                case '>': return num1 > num2;
                case '>=': return num1 >= num2;
                case '<': return num1 < num2;
                case '<=': return num1 <= num2;
                default: return false;
            }
        }
        
        // Сравниваем как строки
        const str1 = String(value1);
        const str2 = String(value2);
        
        switch (operator) {
            case '>': return str1 > str2;
            case '>=': return str1 >= str2;
            case '<': return str1 < str2;
            case '<=': return str1 <= str2;
            default: return false;
        }
    }

    isDateLikeComparison(value1, value2) {
        return this.isDateString(String(value1)) || this.isDateString(String(value2));
    }

    compareDates(value1, value2, operator) {
        const date1 = new Date(value1);
        const date2 = new Date(value2);
        
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            return false;
        }
        
        switch (operator) {
            case '===':
                return date1.getTime() === date2.getTime();
            case '!==':
                return date1.getTime() !== date2.getTime();
            default:
                return false;
        }
    }

    refreshAllPanels() {
        if (this.panelManager) {
            this.panelManager.refreshAllPanels();
        }
    }

showAddPanelModal() {
    if (this.metrics.length === 0) {
        alert('Данные еще не загружены или не содержат метрик');
        return;
    }

    this.populateMetricsList();

    // Добавляем обработчик для превью выбранных метрик
    this.setupMetricsSelectionPreview();

    const modal = new bootstrap.Modal(document.getElementById('addPanelModal'));
    modal.show();
}

// Новый метод для отображения превью выбранных метрик
setupMetricsSelectionPreview() {
    const checkboxes = document.querySelectorAll('.metric-checkbox');
    const previewContainer = document.getElementById('selectedMetricsPreview');

    if (!previewContainer) return;

    const updatePreview = () => {
        const selectedMetrics = this.getSelectedMetrics();

        if (selectedMetrics.length === 0) {
            previewContainer.innerHTML = '<span class="text-muted">Метрики не выбраны</span>';
        } else {
            previewContainer.innerHTML = selectedMetrics.map(metric =>
                `<span class="badge bg-primary me-1">${this.formatFieldName(metric.id)}</span>`
            ).join('');
        }
    };

    // Обновляем превью при изменении выбора
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePreview);
    });

    // Инициализируем превью
    updatePreview();
}
    populateMetricsList() {
    // Получаем контейнеры для разных типов метрик
    const numericContainer = document.getElementById('numericMetricsList');
    const categoricalContainer = document.getElementById('categoricalMetricsList');
    const dateContainer = document.getElementById('dateMetricsList');

    // Проверяем существование всех контейнеров
    if (!numericContainer || !categoricalContainer || !dateContainer) {
        console.error('Контейнеры для метрик не найдены в DOM');
        console.log('numericContainer:', !!numericContainer);
        console.log('categoricalContainer:', !!categoricalContainer);
        console.log('dateContainer:', !!dateContainer);
        return;
    }

    // Очищаем все контейнеры
    numericContainer.innerHTML = '';
    categoricalContainer.innerHTML = '';
    dateContainer.innerHTML = '';

    // Распределяем метрики по типам
    const numericMetrics = this.metrics.filter(m => m.type === 'number');
    const categoricalMetrics = this.metrics.filter(m => m.type === 'string');
    const dateMetrics = this.metrics.filter(m => m.type === 'date');

    // Заполняем числовые метрики
    if (numericMetrics.length > 0) {
        numericMetrics.forEach(metric => {
            const metricElement = this.createMetricCheckbox(metric);
            numericContainer.appendChild(metricElement);
        });
    } else {
        numericContainer.innerHTML = '<div class="text-muted">Нет числовых метрик</div>';
    }

    // Заполняем текстовые метрики
    if (categoricalMetrics.length > 0) {
        categoricalMetrics.forEach(metric => {
            const metricElement = this.createMetricCheckbox(metric);
            categoricalContainer.appendChild(metricElement);
        });
    } else {
        categoricalContainer.innerHTML = '<div class="text-muted">Нет текстовых метрик</div>';
    }

    // Заполняем метрики дат
    if (dateMetrics.length > 0) {
        dateMetrics.forEach(metric => {
            const metricElement = this.createMetricCheckbox(metric);
            dateContainer.appendChild(metricElement);
        });
    } else {
        dateContainer.innerHTML = '<div class="text-muted">Нет метрик с датами</div>';
    }
}

// Вспомогательный метод для создания checkbox элемента
    createMetricCheckbox(metric) {
        const metricElement = document.createElement('div');
        metricElement.className = 'form-check';
        metricElement.innerHTML = `
            <input class="form-check-input metric-checkbox" type="checkbox"
                   value="${metric.id}" id="metric-${metric.id}"
                   data-type="${metric.type}">
            <label class="form-check-label" for="metric-${metric.id}"
                   title="${metric.id} (${metric.type})">
                ${metric.name}
            </label>
        `;

        // Добавляем обработчик изменения для обновления превью
        const checkbox = metricElement.querySelector('input');
        checkbox.addEventListener('change', () => this.updateSelectedMetricsPreview());

        return metricElement;
    }

// Метод для обновления превью выбранных метрик
    updateSelectedMetricsPreview() {
        const selectedMetrics = this.getSelectedMetrics();
        const previewContainer = document.getElementById('selectedMetricsPreview');

        if (!previewContainer) {
            console.error('Элемент selectedMetricsPreview не найден');
            return;
        }

        if (selectedMetrics.length === 0) {
            previewContainer.innerHTML = '<span class="text-muted">Метрики не выбраны</span>';
        } else {
            previewContainer.innerHTML = selectedMetrics.map(metric =>
                `<span class="badge bg-primary me-1">${this.formatFieldName(metric.id)}</span>`
            ).join('');
        }
    }

    // Упростите метод setupMetricsSelectionPreview
    setupMetricsSelectionPreview() {
        // Просто инициализируем превью
        this.updateSelectedMetricsPreview();
    }
    getTypeDisplayName(type) {
        const typeNames = {
            'number': '📊 Числовые',
            'date': '📅 Даты',
            'string': '📝 Текстовые'
        };
        return typeNames[type] || type;
    }

    getSelectedMetrics() {
        const checkboxes = document.querySelectorAll('.metric-checkbox:checked');
        return Array.from(checkboxes).map(cb => ({
            id: cb.value,
            type: cb.dataset.type
        }));
    }
    validatePanelSelection() {
        const selectedMetrics = this.getSelectedMetrics();
        const panelType = document.getElementById('panelType').value;

        if (selectedMetrics.length === 0) {
            alert('Выберите хотя бы одну метрику');
            return false;
        }

        if (panelType === 'chart') {
            // Для графиков разрешаем любые метрики - система сама адаптируется
            if (selectedMetrics.length > 8) {
                alert('Для графика рекомендуется не более 8 метрик');
                return false;
            }
        }

        return true;
    }
}