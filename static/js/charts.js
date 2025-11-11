// ClientCache класс для управления кэшированием на клиенте
class ClientCache {
    constructor(ttl = 300000) {
        this.ttl = ttl;
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    set(key, data) {
        console.log(`💾 Сохранение в кэш: ${key.substring(0, 50)}...`);
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            console.log(`❌ Промах кэша: ${key.substring(0, 50)}...`);
            return null;
        }

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            this.misses++;
            console.log(`⏰ Истек кэш: ${key.substring(0, 50)}...`);
            return null;
        }

        this.hits++;
        console.log(`✅ Попадание в кэш: ${key.substring(0, 50)}...`);
        return item.data;
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    size() {
        return this.cache.size;
    }

    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total * 100).toFixed(1) : 0;
        return {
            size: this.size(),
            hits: this.hits,
            misses: this.misses,
            hitRate: hitRate
        };
    }
}

// Утилиты для работы с датами
function formatDateForAPI(dateString) {
    if (!dateString) return null;
    // Просто возвращаем дату как есть - сервер сам разберется
    return dateString;
}

function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU');
}

// Функции для работы с фильтрами
function gatherFilters() {
    const filters = {};

    // Числовые фильтры диапазона
    ['sales', 'marketing', 'operations', 'support'].forEach(field => {
        const minEl = document.querySelector(`.${field}-min`);
        const maxEl = document.querySelector(`.${field}-max`);

        if (minEl && maxEl) {
            const minVal = minEl.value ? parseInt(minEl.value) : null;
            const maxVal = maxEl.value ? parseInt(maxEl.value) : null;

            if (minVal !== null || maxVal !== null) {
                filters[field] = {};
                if (minVal !== null) filters[field].min = minVal;
                if (maxVal !== null) filters[field].max = maxVal;
            }
        }
    });

    // Категориальные фильтры
    ['region', 'product'].forEach(field => {
        const selectEl = document.querySelector(`.${field}-select`);
        if (selectEl) {
            const selected = Array.from(selectEl.selectedOptions)
                .map(opt => opt.value)
                .filter(val => val !== '');

            if (selected.length > 0) {
                filters[field] = selected;
            }
        }
    });

    console.log('🔍 Собраны фильтры:', filters);
    return filters;
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const alertClass = {
        'info': 'alert-info',
        'success': 'alert-success',
        'warning': 'alert-warning',
        'error': 'alert-danger'
    }[type] || 'alert-info';

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show notification`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Функция для показа ошибок
function showError(message) {
    console.error('❌ Ошибка:', message);
    showNotification(message, 'error');
}

// Функция для показа успешных операций
function showSuccess(message) {
    console.log('✅ Успех:', message);
    showNotification(message, 'success');
}

// Утилиты для измерения производительности
class PerformanceTracker {
    constructor() {
        this.metrics = new Map();
    }

    start(name) {
        this.metrics.set(name, {
            startTime: performance.now(),
            endTime: null,
            duration: null
        });
    }

    end(name) {
        const metric = this.metrics.get(name);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;
        }
        return metric ? metric.duration : null;
    }

    getDuration(name) {
        const metric = this.metrics.get(name);
        return metric ? metric.duration : null;
    }

    clear() {
        this.metrics.clear();
    }
}

// Глобальный трекер производительности
window.performanceTracker = new PerformanceTracker();