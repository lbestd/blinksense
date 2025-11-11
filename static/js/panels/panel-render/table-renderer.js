class TableRenderer {
    static render(panel, gridManager) {
        const panelElement = document.getElementById(panel.id);
        if (!panelElement) return;

        const tableContainer = panelElement.querySelector('.virtual-table-container');

        if (!tableContainer) {
            console.error('❌ TableRenderer: .virtual-table-container не найден');
            return;
        }

        if (!this.hasDataToRender(panel)) {
            this.renderEmptyState(tableContainer);
            return;
        }

        // Подготавливаем данные
        const tableData = this.prepareTableData(panel, gridManager);

        if (!tableData || tableData.rows.length === 0) {
            this.renderNoDataState(tableContainer);
            return;
        }

        // Рендерим таблицу
        this.renderTable(tableContainer, tableData, panel);
    }

    static hasDataToRender(panel) {
        // Для таблицы нужны либо размеры, либо меры
        return (panel.config.dimensions && panel.config.dimensions.length > 0) || 
               (panel.config.measures && panel.config.measures.length > 0);
    }

    static renderEmptyState(container) {
        container.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="fas fa-table fa-2x mb-2"></i>
                <div>Настройте данные для отображения</div>
                <small>Нажмите ⚙️ чтобы добавить размеры и меры</small>
            </div>
        `;
    }

    static renderNoDataState(container) {
        container.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="fas fa-exclamation-triangle fa-2x mb-2 text-warning"></i>
                <div class="text-danger">Данные не найдены</div>
                <small>Проверьте фильтры данных</small>
            </div>
        `;
    }

    static prepareTableData(panel, gridManager) {
        try {
            // Получаем отфильтрованные данные
            const data = this.getFilteredData(panel, gridManager);

            console.log(`📊 [Table] Получено записей: ${data?.length || 0}`);

            if (!data || data.length === 0) {
                console.warn('⚠️ [Table] Нет данных для отображения');
                return null;
            }

            // Если есть размеры - группируем, если нет - показываем детальные данные
            if (panel.config.dimensions && panel.config.dimensions.length > 0) {
                console.log(`📊 [Table] Используем агрегированную таблицу с ${panel.config.dimensions.length} размерностями`);
                return this.prepareAggregatedTable(data, panel);
            } else {
                console.log(`📊 [Table] Используем детальную таблицу`);
                return this.prepareDetailTable(data, panel);
            }

        } catch (error) {
            console.error('❌ [Table] Ошибка подготовки данных:', error);
            return null;
        }
    }

    static getFilteredData(panel, gridManager) {
        // Используем глобально отфильтрованные данные
        return gridManager.getFilteredData();
    }

    static prepareAggregatedTable(data, panel) {
        console.log(`📊 [Table] Начинаем агрегацию ${data.length} записей с ${panel.config.dimensions.length} размерностями`);

        // Группируем по размерам
        const groupedData = this.groupDataByDimensions(data, panel.config.dimensions);
        const groupCount = Object.keys(groupedData).length;

        console.log(`📊 [Table] После группировки: ${groupCount} групп`);

        // ВАЖНО: Если групп слишком много (близко к исходному количеству данных),
        // значит группировка не работает и нужно использовать детальное отображение
        if (groupCount > 10000) {
            console.warn(`⚠️ [Table] Слишком много групп (${groupCount})! Переключаемся на детальную таблицу`);
            // Используем детальное отображение вместо агрегации
            return this.prepareDetailTable(data, panel);
        }

        // Агрегируем меры
        const aggregatedData = this.aggregateMeasures(groupedData, panel.config.measures || []);

        // Формируем заголовки
        const headers = [
            ...panel.config.dimensions.map(dim => ({
                key: dim.field,
                name: dim.name,
                type: 'dimension'
            })),
            ...panel.config.measures.map(measure => ({
                key: measure.name, // Используем имя меры как ключ вместо поля
                name: measure.name,
                type: 'measure',
                format: measure.format
            }))
        ];

        // Формируем строки
        const rows = Object.keys(aggregatedData).map(groupKey => {
            const row = {};

            // Разбираем ключ группы обратно на размеры
            const dimensionValues = groupKey.split(' | ');
            panel.config.dimensions.forEach((dim, index) => {
                row[dim.field] = dimensionValues[index] || '';
            });

            // Добавляем агрегированные меры
            panel.config.measures.forEach(measure => {
                const measureKey = measure.name; // Используем имя меры как ключ
                row[measureKey] = aggregatedData[groupKey][measureKey] || 0;
            });

            return row;
        });

        console.log(`📊 [Table] Агрегация завершена: ${rows.length} итоговых строк, ${headers.length} колонок`);

        // Покажем пример первой строки для отладки
        if (rows.length > 0) {
            console.log(`📊 [Table] Пример строки:`, rows[0]);
        }

        return { headers, rows };
    }

    static prepareDetailTable(data, panel) {
        // Для детального отображения берем все поля
        const measures = panel.config.measures || [];

        let headers = [];
        let fieldsToShow = [];

        // Если есть меры, показываем только их
        if (measures.length > 0) {
            headers = measures.map(measure => ({
                key: measure.field,
                name: measure.name,
                type: 'measure',
                format: measure.format
            }));
            fieldsToShow = measures.map(m => m.field);
        } else {
            // Если мер нет, показываем первые несколько полей из данных
            const sampleRecord = data[0];
            const availableFields = Object.keys(sampleRecord);
            fieldsToShow = availableFields.slice(0, 10); // Ограничиваем количество колонок

            headers = fieldsToShow.map(field => ({
                key: field,
                name: this.formatFieldName(field),
                type: this.getFieldType(sampleRecord[field])
            }));
        }

        // НЕ ограничиваем строки здесь - виртуальная таблица справится
        const rows = data.map(record => {
            const row = {};
            fieldsToShow.forEach(field => {
                row[field] = record[field];
            });
            return row;
        });

        return { headers, rows };
    }

    static formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    static getFieldType(value) {
        if (typeof value === 'number') return 'measure';
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'date';
        return 'dimension';
    }

    static groupDataByDimensions(data, dimensions) {
        const groups = {};
        
        data.forEach(record => {
            // Создаем ключ группировки на основе размерностей
            const groupKey = dimensions.map(dim => {
                const value = record[dim.field];
                // Форматируем значение в зависимости от типа
                if (dim.type === 'date') {
                    return new Date(value).toLocaleDateString();
                }
                return String(value);
            }).join(' | ');
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(record);
        });
        
        return groups;
    }

    static aggregateMeasures(groupedData, measures) {
        const result = {};
        
        Object.keys(groupedData).forEach(groupKey => {
            const group = groupedData[groupKey];
            result[groupKey] = {};
            
            if (!measures || measures.length === 0) {
                return;
            }
            
            measures.forEach(measure => {
                const measureKey = measure.name; // Используем имя меры как ключ
                
                if (measure.expression) {
                    // Пользовательское выражение
                    result[groupKey][measureKey] = this.evaluateExpression(measure.expression, group);
                } else if (measure.isStacked && measure.categoryField) {
                    // Стекированные категориальные меры - считаем общее количество записей в группе
                    if (measure.aggregation === 'count') {
                        result[groupKey][measureKey] = group.length;
                    } else if (measure.aggregation === 'count_distinct') {
                        const uniqueValues = new Set(group.map(record => record[measure.categoryField]));
                        result[groupKey][measureKey] = uniqueValues.size;
                    } else {
                        result[groupKey][measureKey] = this.calculateAggregation(group, measure.field, measure.aggregation);
                    }
                } else {
                    // Стандартная агрегация
                    result[groupKey][measureKey] = this.calculateAggregation(group, measure.field, measure.aggregation);
                }
            });
        });
        
        return result;
    }

    static calculateAggregation(data, field, aggregation) {
        switch (aggregation) {
            case 'count':
                // Для count считаем все записи
                return data.length;
            case 'count_distinct':
                const uniqueValues = new Set(data.map(record => record[field]));
                return uniqueValues.size;
            case 'sum':
                const sumValues = data.map(record => Number(record[field])).filter(v => !isNaN(v));
                return sumValues.reduce((sum, val) => sum + val, 0);
            case 'avg':
                const avgValues = data.map(record => Number(record[field])).filter(v => !isNaN(v));
                return avgValues.length > 0 ? avgValues.reduce((sum, val) => sum + val, 0) / avgValues.length : 0;
            case 'min':
                const minValues = data.map(record => Number(record[field])).filter(v => !isNaN(v));
                return minValues.length > 0 ? Math.min(...minValues) : 0;
            case 'max':
                const maxValues = data.map(record => Number(record[field])).filter(v => !isNaN(v));
                return maxValues.length > 0 ? Math.max(...maxValues) : 0;
            default:
                return data.length;
        }
    }

    static evaluateExpression(expression, data) {
        // Аналогично chart-renderer.js
        try {
            let jsExpression = expression
                .replace(/Sum\(([^)]+)\)/g, (match, field) => {
                    const values = data.map(r => Number(r[field])).filter(v => !isNaN(v));
                    return values.reduce((sum, val) => sum + val, 0);
                })
                .replace(/Avg\(([^)]+)\)/g, (match, field) => {
                    const values = data.map(r => Number(r[field])).filter(v => !isNaN(v));
                    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
                })
                .replace(/Count\(([^)]+)\)/g, (match, field) => {
                    return data.filter(r => r[field] !== undefined && r[field] !== null).length;
                })
                .replace(/Min\(([^)]+)\)/g, (match, field) => {
                    const values = data.map(r => Number(r[field])).filter(v => !isNaN(v));
                    return values.length > 0 ? Math.min(...values) : 0;
                })
                .replace(/Max\(([^)]+)\)/g, (match, field) => {
                    const values = data.map(r => Number(r[field])).filter(v => !isNaN(v));
                    return values.length > 0 ? Math.max(...values) : 0;
                });
            
            if (/^[\d\s+\-*/().]+$/.test(jsExpression)) {
                return eval(jsExpression);
            }
            
            return 0;
        } catch (error) {
            console.error('Ошибка вычисления выражения:', expression, error);
            return 0;
        }
    }

    static renderTable(container, tableData, panel) {
        const { headers, rows } = tableData;

        console.log(`📊 [Table] Рендеринг: ${rows.length} строк, ${headers.length} колонок`);

        // Используем виртуализацию для больших таблиц (>500 строк)
        if (rows.length > 500) {
            console.log(`⚡ [Table] Используем виртуализацию для ${rows.length} строк`);

            // Проверяем что VirtualTable доступен
            if (typeof VirtualTable === 'undefined') {
                console.error('❌ [Table] VirtualTable не загружен! Используем обычный рендеринг');
                // Fallback - показываем первые 1000 строк
                const limitedData = { headers, rows: rows.slice(0, 1000) };
                this.renderStandardTable(container, limitedData, panel);
                return;
            }

            // Уничтожаем предыдущую виртуальную таблицу если есть
            if (panel.virtualTableInstance) {
                panel.virtualTableInstance.destroy();
            }

            // container уже является .virtual-table-container, используем его напрямую
            try {
                panel.virtualTableInstance = new VirtualTable(container, {
                    rowHeight: 35,
                    bufferSize: 5,
                    formatters: this.getFormatters(headers)
                });

                panel.virtualTableInstance.setData(headers, rows);
                console.log(`✅ [Table] Виртуальная таблица создана успешно`);
            } catch (error) {
                console.error('❌ [Table] Ошибка создания виртуальной таблицы:', error);
                // Fallback
                this.renderStandardTable(container, { headers, rows: rows.slice(0, 1000) }, panel);
            }
            return;
        }

        // Для маленьких таблиц
        this.renderStandardTable(container, tableData, panel);
    }

    static renderStandardTable(container, tableData, panel) {
        const { headers, rows } = tableData;

        console.log(`📊 [Table] Стандартный рендеринг для ${rows.length} строк`);

        let html = `
            <table class="table table-sm table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        ${headers.map(header => `
                            <th scope="col" class="text-nowrap">
                                ${header.type === 'dimension' ? '📝' : '🔢'} ${header.name}
                                <i class="fas fa-sort ms-1 text-muted" style="cursor: pointer;"></i>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, index) => `
                        <tr${index % 2 === 0 ? ' class="table-light"' : ''}>
                            ${headers.map(header => `
                                <td class="${header.type === 'measure' ? 'text-end' : ''}">
                                    ${this.formatCellValue(row[header.key], header)}
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Добавляем информацию о количестве записей
        if (rows.length > 0) {
            html += `
                <div class="d-flex justify-content-between align-items-center mt-2 px-2">
                    <small class="text-muted">
                        Показано ${rows.length} записей
                    </small>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" title="Экспорт в CSV">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-outline-secondary" title="Обновить">
                            <i class="fas fa-refresh"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Добавляем обработчики сортировки
        this.setupTableSorting(container, tableData, panel);
    }

    static getFormatters(headers) {
        const formatters = {};
        headers.forEach(header => {
            formatters[header.key] = (value) => this.formatCellValue(value, header);
        });
        return formatters;
    }

    static formatCellValue(value, header) {
        if (value === null || value === undefined) {
            return '<span class="text-muted">-</span>';
        }

        // Для мер применяем форматирование
        if (header.type === 'measure' && header.format) {
            return this.formatValue(value, header.format);
        }

        // Для дат
        if (header.type === 'date') {
            try {
                return new Date(value).toLocaleString();
            } catch {
                return value;
            }
        }

        // Для чисел
        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        return String(value);
    }

    static formatValue(value, format) {
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
            case 'number':
            default:
                return Number(value).toLocaleString();
        }
    }

    static setupTableSorting(container, tableData, panel) {
        const sortIcons = container.querySelectorAll('th i.fa-sort');
        
        sortIcons.forEach((icon, columnIndex) => {
            icon.addEventListener('click', () => {
                this.sortTable(container, tableData, columnIndex, panel);
            });
        });
    }

    static sortTable(container, tableData, columnIndex, panel) {
        const { headers, rows } = tableData;
        const header = headers[columnIndex];
        
        // Определяем направление сортировки
        const isAscending = !container.dataset.sortDesc || container.dataset.sortColumn !== columnIndex.toString();
        container.dataset.sortDesc = isAscending ? 'false' : 'true';
        container.dataset.sortColumn = columnIndex.toString();

        // Сортируем данные
        const sortedRows = [...rows].sort((a, b) => {
            const aVal = a[header.key];
            const bVal = b[header.key];
            
            // Обработка null/undefined
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return isAscending ? -1 : 1;
            if (bVal == null) return isAscending ? 1 : -1;

            // Сравнение значений
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return isAscending ? aVal - bVal : bVal - aVal;
            }
            
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            
            if (aStr < bStr) return isAscending ? -1 : 1;
            if (aStr > bStr) return isAscending ? 1 : -1;
            return 0;
        });

        // Перерендериваем таблицу
        this.renderTable(container, { headers, rows: sortedRows }, panel);

        // Обновляем иконки сортировки
        const newSortIcons = container.querySelectorAll('th i.fa-sort');
        newSortIcons.forEach((icon, index) => {
            icon.className = 'fas fa-sort ms-1 text-muted';
            if (index === columnIndex) {
                icon.className = `fas fa-sort-${isAscending ? 'up' : 'down'} ms-1 text-primary`;
            }
        });
    }
}