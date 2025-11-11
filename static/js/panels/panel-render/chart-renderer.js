class ChartRenderer {
    static render(panel, gridManager) {
        const panelElement = document.getElementById(panel.id);
        if (!panelElement) return;

        const canvas = panelElement.querySelector('.panel-chart');
        const ctx = canvas.getContext('2d');

        // Уничтожаем предыдущий график
        if (panel.chartInstance) {
            panel.chartInstance.destroy();
        }

        // Проверяем наличие данных для отображения
        if (!this.hasDataToRender(panel)) {
            this.renderEmptyState(canvas, panel);
            return;
        }

        // Подготавливаем данные
        const chartData = this.prepareChartData(panel, gridManager);
        
        if (!chartData || chartData.labels.length === 0) {
            this.renderNoDataState(canvas);
            return;
        }

        // Создаем график
        panel.chartInstance = new Chart(ctx, {
            type: this.getChartType(panel),
            data: chartData,
            options: this.getChartOptions(panel)
        });
    }

    static hasDataToRender(panel) {
        // Проверяем есть ли меры для отображения
        return panel.config.measures && panel.config.measures.length > 0;
    }

    static renderEmptyState(canvas, panel) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем сообщение о настройке
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Настройте данные для отображения', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Нажмите ⚙️ чтобы добавить меры', canvas.width / 2, canvas.height / 2 + 10);
    }

    static renderNoDataState(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем сообщение об отсутствии данных
        ctx.fillStyle = '#dc3545';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Данные не найдены', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Проверьте фильтры', canvas.width / 2, canvas.height / 2 + 10);
    }

    static getChartType(panel) {
        return panel.config.display.chartType || 'bar';
    }

    static prepareChartData(panel, gridManager) {
        try {
            // Получаем отфильтрованные данные
            let data = this.getFilteredData(panel, gridManager);

            console.log(`📈 [Chart] Получено записей: ${data?.length || 0}`);

            if (!data || data.length === 0) {
                console.warn('⚠️ [Chart] Нет данных для отображения');
                return null;
            }

            // Для больших датасетов применяем сэмплирование
            const maxDataPoints = 1000; // Максимум точек на графике
            if (data.length > maxDataPoints && (!panel.config.dimensions || panel.config.dimensions.length === 0)) {
                console.log(`⚡ [Chart] Сэмплируем ${data.length} записей до ${maxDataPoints} точек`);
                data = this.sampleData(data, maxDataPoints);
            }

            // Группируем по размерам
            const groupedData = this.groupDataByDimensions(data, panel.config.dimensions);

            // Ограничиваем количество групп для производительности
            const maxGroups = 500;
            const groupKeys = Object.keys(groupedData);
            console.log(`📈 [Chart] Создано групп: ${groupKeys.length}`);

            if (groupKeys.length > maxGroups) {
                console.log(`⚡ [Chart] Ограничиваем ${groupKeys.length} групп до ${maxGroups}`);
                const limitedGroupedData = {};
                groupKeys.slice(0, maxGroups).forEach(key => {
                    limitedGroupedData[key] = groupedData[key];
                });
                // Агрегируем остальное в "Прочие"
                const others = [];
                groupKeys.slice(maxGroups).forEach(key => {
                    others.push(...groupedData[key]);
                });
                if (others.length > 0) {
                    limitedGroupedData['Прочие'] = others;
                }
                return this.processGroupedData(limitedGroupedData, panel.config.measures, panel.config.sorting);
            }

            return this.processGroupedData(groupedData, panel.config.measures, panel.config.sorting);

        } catch (error) {
            console.error('Ошибка подготовки данных для графика:', error);
            return null;
        }
    }

    static sampleData(data, maxPoints) {
        // Равномерное сэмплирование
        const step = Math.floor(data.length / maxPoints);
        if (step <= 1) return data;

        const sampled = [];
        for (let i = 0; i < data.length; i += step) {
            sampled.push(data[i]);
        }
        return sampled;
    }

    static processGroupedData(groupedData, measures, sorting) {
        // Агрегируем меры
        const aggregatedData = this.aggregateMeasures(groupedData, measures);

        // Сортируем данные
        const sortedData = this.applySorting(aggregatedData, sorting);

        return this.formatChartData(sortedData, measures);
    }

    static getFilteredData(panel, gridManager) {
        // Используем глобально отфильтрованные данные
        return gridManager.getFilteredData();
    }


    static groupDataByDimensions(data, dimensions) {
        if (!dimensions || dimensions.length === 0) {
            return { 'Всего': data };
        }

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
            
            measures.forEach(measure => {
                if (measure.expression) {
                    // Пользовательское выражение
                    result[groupKey][measure.field || measure.name] = this.evaluateExpression(measure.expression, group);
                } else if (measure.isStacked && measure.categoryField) {
                    // Стекированные категориальные меры
                    const categoryData = this.calculateCategoryBreakdown(group, measure);
                    result[groupKey][measure.field] = Object.values(categoryData).reduce((sum, count) => sum + count, 0);
                    
                    // Сохраняем детализацию по категориям
                    if (!result[groupKey].categoryData) {
                        result[groupKey].categoryData = {};
                    }
                    result[groupKey].categoryData[measure.categoryField] = categoryData;
                } else {
                    // Стандартная агрегация
                    result[groupKey][measure.field] = this.calculateAggregation(group, measure.field, measure.aggregation, measure);
                }
            });
        });
        
        return result;
    }

    static calculateCategoryBreakdown(data, measure) {
        // Подсчитываем количество записей по каждой категории
        const categoryCount = {};
        data.forEach(record => {
            const category = record[measure.categoryField];
            if (category !== undefined && category !== null) {
                categoryCount[category] = (categoryCount[category] || 0) + 1;
            }
        });
        
        return categoryCount;
    }

    static calculateStackedCategoryMeasure(data, measure) {
        // Для стекированных диаграмм создаем подсчет по категориям
        const categoryCount = {};
        data.forEach(record => {
            const category = record[measure.categoryField];
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        
        // Возвращаем общее количество для этой группы
        // Детализация по категориям будет обработана отдельно в formatChartData
        return Object.values(categoryCount).reduce((sum, count) => sum + count, 0);
    }

    static calculateAggregation(data, field, aggregation, measure = null) {
        switch (aggregation) {
            case 'count':
                // Для категориальных мер считаем все записи
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
        // Простая реализация вычисления выражений
        try {
            // Заменяем функции на JavaScript аналоги
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
            
            // Безопасное вычисление (только числа и основные операторы)
            if (/^[\d\s+\-*/().]+$/.test(jsExpression)) {
                return eval(jsExpression);
            }
            
            return 0;
        } catch (error) {
            console.error('Ошибка вычисления выражения:', expression, error);
            return 0;
        }
    }

    static applySorting(data, sorting) {
        if (!sorting || (!sorting.dimensions && !sorting.measures)) {
            return data;
        }

        // Применяем сортировку размеров
        // Пока используем простую сортировку по ключам
        const sortedKeys = Object.keys(data).sort();
        
        const result = {};
        sortedKeys.forEach(key => {
            result[key] = data[key];
        });
        
        return result;
    }

    static formatChartData(aggregatedData, measures) {
        const labels = Object.keys(aggregatedData);
        
        // Проверяем есть ли стекированные меры
        const hasStackedMeasures = measures.some(m => m.isStacked && m.categoryField);
        
        if (hasStackedMeasures) {
            return this.formatStackedChartData(aggregatedData, measures, labels);
        }
        
        const datasets = measures.map((measure, index) => {
            const fieldKey = measure.field || measure.name;
            return {
                label: measure.name,
                data: labels.map(label => aggregatedData[label][fieldKey] || 0),
                backgroundColor: this.getColor(index, 0.6),
                borderColor: this.getColor(index, 1),
                borderWidth: 2,
                tension: 0.3
            };
        });

        return {
            labels,
            datasets
        };
    }

    static formatStackedChartData(aggregatedData, measures, labels) {
        // Собираем все категории из стекированных мер
        const stackedMeasure = measures.find(m => m.isStacked && m.categoryField);
        if (!stackedMeasure) return this.formatChartData(aggregatedData, measures);

        // Получаем уникальные категории из данных
        const allCategories = new Set();
        Object.values(aggregatedData).forEach(group => {
            if (group.categoryData && group.categoryData[stackedMeasure.categoryField]) {
                Object.keys(group.categoryData[stackedMeasure.categoryField]).forEach(cat => {
                    allCategories.add(cat);
                });
            }
        });

        const categories = Array.from(allCategories);
        
        // Создаем dataset для каждой категории
        const datasets = categories.map((category, index) => ({
            label: category,
            data: labels.map(label => {
                const group = aggregatedData[label];
                return group.categoryData && 
                       group.categoryData[stackedMeasure.categoryField] && 
                       group.categoryData[stackedMeasure.categoryField][category] || 0;
            }),
            backgroundColor: this.getColor(index, 0.7),
            borderColor: this.getColor(index, 1),
            borderWidth: 1
        }));

        return {
            labels,
            datasets
        };
    }

    static getColor(index, alpha = 1) {
        const colors = [
            `rgba(54, 162, 235, ${alpha})`,   // Синий
            `rgba(255, 99, 132, ${alpha})`,   // Красный
            `rgba(75, 192, 192, ${alpha})`,   // Зеленый
            `rgba(255, 205, 86, ${alpha})`,   // Желтый
            `rgba(153, 102, 255, ${alpha})`,  // Фиолетовый
            `rgba(255, 159, 64, ${alpha})`,   // Оранжевый
            `rgba(199, 199, 199, ${alpha})`,  // Серый
            `rgba(83, 102, 255, ${alpha})`    // Индиго
        ];
        
        return colors[index % colors.length];
    }

    static getChartOptions(panel) {
        const isStacked = panel.config.display.stacked || panel.config.measures.some(m => m.isStacked);
        
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: !!panel.config.display.title,
                    text: panel.config.display.title || ''
                },
                legend: {
                    display: panel.config.display.showLegend !== false,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const measure = panel.config.measures[context.datasetIndex];
                            const value = ChartRenderer.formatValue(context.parsed.y, measure?.format || 'number');
                            return `${context.dataset.label}: ${value}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: isStacked,
                    grid: {
                        display: false
                    }
                },
                y: {
                    stacked: isStacked,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            const measure = panel.config.measures[0];
                            if (measure && measure.format) {
                                return ChartRenderer.formatValue(value, measure.format);
                            }
                            return value;
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                bar: {
                    borderWidth: 1,
                    borderRadius: 2
                }
            }
        };
    }

    static formatValue(value, format) {
        switch (format) {
            case 'percent':
                return `${(value * 100).toFixed(1)}%`;
            case 'currency':
                return `$${value.toLocaleString()}`;
            case 'bytes':
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                let size = value;
                let unitIndex = 0;
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex++;
                }
                return `${size.toFixed(1)} ${units[unitIndex]}`;
            case 'number':
            default:
                return value.toLocaleString();
        }
    }
}