/**
 * Виртуализированная таблица - правильная виртуализация
 * Рендерит ТОЛЬКО видимые строки
 */
class VirtualTable {
    constructor(container, options = {}) {
        this.container = container;
        this.data = [];
        this.headers = [];
        this.rowHeight = options.rowHeight || 35;
        this.bufferSize = options.bufferSize || 5;
        this.formatters = options.formatters || {};

        this.scrollTop = 0;
        this.visibleRows = 0;
        this.lastRenderedRange = { start: -1, end: -1 };

        this.init();
    }

    init() {
        // Простая структура
        this.container.innerHTML = `
            <div class="vt-wrapper">
                <div class="vt-header"></div>
                <div class="vt-body">
                    <div class="vt-spacer"></div>
                    <div class="vt-content"></div>
                </div>
                <div class="vt-footer">
                    <small class="vt-info"></small>
                </div>
            </div>
        `;

        this.wrapper = this.container.querySelector('.vt-wrapper');
        this.header = this.container.querySelector('.vt-header');
        this.body = this.container.querySelector('.vt-body');
        this.spacer = this.container.querySelector('.vt-spacer');
        this.content = this.container.querySelector('.vt-content');
        this.footer = this.container.querySelector('.vt-footer');
        this.info = this.container.querySelector('.vt-info');

        // Слушаем прокрутку
        this.body.addEventListener('scroll', () => {
            this.scrollTop = this.body.scrollTop;
            this.header.scrollLeft = this.body.scrollLeft;
            this.render();
        });

        // Пересчитываем при ресайзе
        const resizeObserver = new ResizeObserver(() => {
            this.updateMetrics();
            this.render();
        });
        resizeObserver.observe(this.body);
    }

    updateMetrics() {
        const bodyHeight = this.body.clientHeight;
        this.visibleRows = Math.ceil(bodyHeight / this.rowHeight) + this.bufferSize * 2;
        console.log(`📏 Metrics: bodyHeight=${bodyHeight}px, visibleRows=${this.visibleRows}`);
    }

    setData(headers, rows) {
        console.log(`📊 setData: ${rows.length} rows, ${headers.length} cols`);

        this.headers = headers;
        this.data = rows;

        if (!rows.length || !headers.length) {
            this.content.innerHTML = '<div class="p-3 text-muted text-center">Нет данных</div>';
            return;
        }

        this.updateMetrics();

        // Spacer создаёт область прокрутки
        const totalHeight = rows.length * this.rowHeight;
        this.spacer.style.height = `${totalHeight}px`;

        this.info.textContent = `Всего записей: ${rows.length.toLocaleString()}`;

        this.renderHeaders();
        this.render();

        console.log(`✅ Ready: totalHeight=${totalHeight}px`);
    }

    renderHeaders() {
        const cells = this.headers.map(h => {
            const icon = h.type === 'dimension' ? '📝' : '🔢';
            return `
                <div class="vt-h-cell" data-key="${h.key}">
                    ${icon} ${h.name}
                    <i class="fas fa-sort"></i>
                </div>
            `;
        }).join('');

        this.header.innerHTML = `<div class="vt-h-row">${cells}</div>`;

        // Устанавливаем grid-template-columns для синхронизации ширины колонок
        const gridCols = `repeat(${this.headers.length}, minmax(120px, 1fr))`;
        this.header.querySelector('.vt-h-row').style.gridTemplateColumns = gridCols;

        this.header.querySelectorAll('.vt-h-cell').forEach(cell => {
            cell.addEventListener('click', () => this.sort(cell.dataset.key));
        });
    }

    render() {
        if (!this.data.length) return;

        // Вычисляем диапазон
        const startIndex = Math.max(0, Math.floor(this.scrollTop / this.rowHeight) - this.bufferSize);
        const endIndex = Math.min(this.data.length, startIndex + this.visibleRows);

        // Оптимизация: не рендерим если диапазон не изменился
        if (startIndex === this.lastRenderedRange.start && endIndex === this.lastRenderedRange.end) {
            return;
        }

        this.lastRenderedRange = { start: startIndex, end: endIndex };

        const visibleData = this.data.slice(startIndex, endIndex);
        const offsetY = startIndex * this.rowHeight;

        console.log(`🖥️ Render: rows ${startIndex}-${endIndex} (${visibleData.length} divs), offset=${offsetY}px`);

        // Рендерим ТОЛЬКО видимые строки
        const gridCols = `repeat(${this.headers.length}, minmax(120px, 1fr))`;
        const rowsHTML = visibleData.map((row, idx) => {
            const rowIndex = startIndex + idx;
            const rowClass = rowIndex % 2 === 0 ? 'even' : 'odd';

            const cells = this.headers.map(h => {
                const value = this.formatCell(row[h.key], h);
                const align = h.type === 'measure' ? 'right' : '';
                return `<div class="vt-cell ${align}">${value}</div>`;
            }).join('');

            return `<div class="vt-row ${rowClass}" style="grid-template-columns: ${gridCols}">${cells}</div>`;
        }).join('');

        // Устанавливаем позицию и контент
        this.content.style.transform = `translateY(${offsetY}px)`;
        this.content.innerHTML = rowsHTML;
    }

    formatCell(value, header) {
        if (value === null || value === undefined) {
            return '<span class="text-muted">-</span>';
        }

        if (this.formatters[header.key]) {
            return this.formatters[header.key](value);
        }

        if (header.type === 'measure' && header.format) {
            return this.formatValue(value, header.format);
        }

        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        return String(value);
    }

    formatValue(value, format) {
        switch (format) {
            case 'percent':
                return `${(value * 100).toFixed(1)}%`;
            case 'currency':
                return `$${Number(value).toLocaleString()}`;
            case 'bytes':
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                let size = Number(value);
                let unitIndex = 0;
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex++;
                }
                return `${size.toFixed(1)} ${units[unitIndex]}`;
            default:
                return Number(value).toLocaleString();
        }
    }

    sort(key) {
        const header = this.headers.find(h => h.key === key);
        if (!header) return;

        if (this.sortField === key) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = key;
            this.sortDirection = 'asc';
        }

        this.data.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        // Обновляем иконки
        this.header.querySelectorAll('i').forEach(icon => {
            icon.className = 'fas fa-sort text-muted';
        });
        const activeIcon = this.header.querySelector(`[data-key="${key}"] i`);
        if (activeIcon) {
            activeIcon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} text-primary`;
        }

        // Прокручиваем наверх
        this.body.scrollTop = 0;
        this.scrollTop = 0;
        this.lastRenderedRange = { start: -1, end: -1 };
        this.render();
    }

    destroy() {
        this.container.innerHTML = '';
    }
}
