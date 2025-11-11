class TableManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 50;
    }

    renderTable(data, page = 1, pageSize = 50) {
        this.currentPage = page;
        this.pageSize = pageSize;

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageData = data.slice(start, end);

        this.renderHeader(pageData);
        this.renderBody(pageData);
        this.renderPagination(data.length, page, pageSize);
        this.updateTableInfo(data.length, page, pageSize);
    }

    renderHeader(data) {
        const header = document.getElementById('tableHeader');
        if (!data.length) {
            header.innerHTML = '<tr><th class="text-center">Нет данных</th></tr>';
            return;
        }

        // Выбираем ключевые колонки для отображения
        const keyColumns = [
            'timestamp', 'server_name', 'server_ip', 'service_name',
            'cpu_usage', 'memory_usage', 'status', 'response_time'
        ];

        const columns = Object.keys(data[0]).filter(col =>
            keyColumns.includes(col)
        );

        header.innerHTML = `
            <tr>
                ${columns.map(col => `<th>${this.getColumnName(col)}</th>`).join('')}
            </tr>
        `;
    }

    renderBody(data) {
        const tbody = document.getElementById('tableBody');

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="100" class="text-center">Нет данных для отображения</td></tr>';
            return;
        }

        // Выбираем ключевые колонки для отображения
        const keyColumns = [
            'timestamp', 'server_name', 'server_ip', 'service_name',
            'cpu_usage', 'memory_usage', 'status', 'response_time'
        ];

        tbody.innerHTML = data.map(item => `
            <tr>
                ${keyColumns.map(col => `
                    <td>${this.formatValue(item[col], col)}</td>
                `).join('')}
            </tr>
        `).join('');
    }

    renderPagination(totalItems, currentPage, pageSize) {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(totalItems / pageSize);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '';

        // Previous button
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">‹</a>
            </li>
        `;

        // Page numbers (максимум 5 страниц)
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">›</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    updateTableInfo(totalItems, currentPage, pageSize) {
        const info = document.getElementById('tableInfo');
        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, totalItems);
        info.textContent = `Записи ${start}-${end} из ${totalItems}`;
    }

    getColumnName(field) {
        const names = {
            'timestamp': '📅 Дата',
            'server_name': '🖥️ Сервер',
            'server_ip': '🌐 IP',
            'server_zone': '🌍 Зона',
            'server_type': '⚙️ Тип',
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
            'uptime_days': '⏰ Аптайм',
            'last_maintenance': '🔧 Последнее обслуживание'
        };
        return names[field] || field;
    }

    formatValue(value, field) {
        if (!value && value !== 0) return '-';

        if (field === 'timestamp') {
            return new Date(value).toLocaleString('ru-RU');
        }

        if (typeof value === 'number') {
            if (field.includes('_usage') || field === 'error_rate') {
                return value.toFixed(1) + '%';
            }
            if (field === 'response_time') {
                return value.toFixed(1) + 'ms';
            }
            if (field.includes('revenue')) {
                return '$' + value.toLocaleString('ru-RU');
            }
            return value.toLocaleString('ru-RU');
        }

        if (field === 'status') {
            const statusClass = `status-${value}`;
            return `<span class="${statusClass}">${value}</span>`;
        }

        return value;
    }
}