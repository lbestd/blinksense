class FilterManager {
    constructor() {
        this.filters = [];
        this.fieldTypes = {};
    }

    analyzeData(data) {
        if (!data || data.length === 0) return;

        const sample = data[0];
        this.fieldTypes = {};

        for (const [key, value] of Object.entries(sample)) {
            if (key === 'timestamp') {
                this.fieldTypes[key] = 'datetime';
            } else if (typeof value === 'number') {
                this.fieldTypes[key] = 'number';
            } else if (typeof value === 'string') {
                this.fieldTypes[key] = 'category';
            }
        }
    }

    addFilter(field) {
        const filter = {
            id: Date.now(),
            field: field,
            type: this.fieldTypes[field],
            value: null
        };

        this.filters.push(filter);
        this.renderFilters();
    }

    removeFilter(id) {
        this.filters = this.filters.filter(f => f.id !== id);
        this.renderFilters();
    }

    renderFilters() {
        const container = document.getElementById('dynamicFilters');
        container.innerHTML = '';

        this.filters.forEach(filter => {
            const filterHtml = this.createFilterHtml(filter);
            container.innerHTML += filterHtml;
        });

        this.attachFilterEvents();
    }

    createFilterHtml(filter) {
        const fieldName = this.getFieldDisplayName(filter.field);

        if (filter.type === 'number') {
            return `
                <div class="col-md-3" data-filter-id="${filter.id}">
                    <div class="card">
                        <div class="card-body p-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <label class="form-label small mb-1">${fieldName}</label>
                                <button type="button" class="btn-close btn-close-sm" data-filter-remove></button>
                            </div>
                            <div class="row g-1">
                                <div class="col-6">
                                    <input type="number" class="form-control form-control-sm"
                                           placeholder="Мин" data-filter-min>
                                </div>
                                <div class="col-6">
                                    <input type="number" class="form-control form-control-sm"
                                           placeholder="Макс" data-filter-max>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (filter.type === 'category') {
            return `
                <div class="col-md-3" data-filter-id="${filter.id}">
                    <div class="card">
                        <div class="card-body p-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <label class="form-label small mb-1">${fieldName}</label>
                                <button type="button" class="btn-close btn-close-sm" data-filter-remove></button>
                            </div>
                            <input type="text" class="form-control form-control-sm"
                                   placeholder="Значение..." data-filter-value>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    attachFilterEvents() {
        document.querySelectorAll('[data-filter-remove]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterId = parseInt(e.target.closest('[data-filter-id]').dataset.filterId);
                this.removeFilter(filterId);
            });
        });
    }

    getFieldDisplayName(field) {
        const names = {
            'server_name': '🖥️ Сервер',
            'server_ip': '🌐 IP адрес',
            'server_zone': '🌍 Зона',
            'server_type': '⚙️ Тип сервера',
            'service_name': '🔧 Сервис',
            'environment': '🏷️ Окружение',
            'os_type': '💻 ОС',
            'cpu_usage': '🖥️ CPU %',
            'memory_usage': '🧠 Память %',
            'disk_usage': '💾 Диск %',
            'network_in': '📥 Сеть вх.',
            'network_out': '📤 Сеть исх.',
            'response_time': '⏱️ Время ответа',
            'requests_per_second': '📊 RPS',
            'error_rate': '❌ Ошибки %',
            'revenue_impact': '💰 Выручка',
            'user_sessions': '👥 Сессии',
            'throughput': '🚀 Пропускная способность',
            'status': '📊 Статус',
            'uptime_days': '⏰ Аптайм (дни)'
        };
        return names[field] || field;
    }

    getActiveFilters() {
        const activeFilters = {};

        this.filters.forEach(filter => {
            const element = document.querySelector(`[data-filter-id="${filter.id}"]`);
            if (!element) return;

            if (filter.type === 'number') {
                const min = element.querySelector('[data-filter-min]').value;
                const max = element.querySelector('[data-filter-max]').value;

                if (min || max) {
                    activeFilters[filter.field] = {};
                    if (min) activeFilters[filter.field].min = parseFloat(min);
                    if (max) activeFilters[filter.field].max = parseFloat(max);
                }
            } else if (filter.type === 'category') {
                const value = element.querySelector('[data-filter-value]').value;
                if (value) {
                    activeFilters[filter.field] = [value];
                }
            }
        });

        return activeFilters;
    }

    resetFilters() {
        this.filters = [];
        this.renderFilters();
    }
}