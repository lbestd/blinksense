class ChartManager {
    constructor() {
        this.chart = null;
    }

    renderChart(data, period = 'week') {
        const ctx = document.getElementById('stackedChart').getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        const chartData = this.prepareChartData(data, period);

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Временная шкала'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Значения'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }

    prepareChartData(data, period) {
        if (!data || data.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        // Группируем данные по временным периодам
        const aggregated = this.aggregateData(data, period);

        const labels = Object.keys(aggregated).sort();
        const datasets = [];

        // Основные метрики для отображения
        const metrics = [
            { key: 'cpu_usage', label: 'CPU %', color: '#FF6384' },
            { key: 'memory_usage', label: 'Memory %', color: '#36A2EB' },
            { key: 'disk_usage', label: 'Disk %', color: '#FFCE56' },
            { key: 'response_time', label: 'Response Time', color: '#4BC0C0' }
        ];

        metrics.forEach(metric => {
            const datasetData = labels.map(label =>
                aggregated[label][metric.key] || 0
            );

            datasets.push({
                label: metric.label,
                data: datasetData,
                backgroundColor: metric.color,
                borderColor: metric.color,
                borderWidth: 1
            });
        });

        return { labels, datasets };
    }

    aggregateData(data, period) {
        const aggregated = {};

        data.forEach(item => {
            const date = new Date(item.timestamp);
            let key;

            if (period === 'hour') {
                key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            } else if (period === 'day') {
                key = date.toISOString().split('T')[0]; // YYYY-MM-DD
            } else {
                // Неделя
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                key = startOfWeek.toISOString().split('T')[0];
            }

            if (!aggregated[key]) {
                aggregated[key] = {
                    cpu_usage: 0,
                    memory_usage: 0,
                    disk_usage: 0,
                    response_time: 0,
                    count: 0
                };
            }

            // Усредняем значения
            aggregated[key].cpu_usage += item.cpu_usage;
            aggregated[key].memory_usage += item.memory_usage;
            aggregated[key].disk_usage += item.disk_usage;
            aggregated[key].response_time += item.response_time;
            aggregated[key].count += 1;
        });

        // Вычисляем средние значения
        Object.keys(aggregated).forEach(key => {
            const count = aggregated[key].count;
            aggregated[key].cpu_usage = aggregated[key].cpu_usage / count;
            aggregated[key].memory_usage = aggregated[key].memory_usage / count;
            aggregated[key].disk_usage = aggregated[key].disk_usage / count;
            aggregated[key].response_time = aggregated[key].response_time / count;
            delete aggregated[key].count;
        });

        return aggregated;
    }
}