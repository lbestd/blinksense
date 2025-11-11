import asyncio
import asyncpg
from datetime import datetime, timedelta
import random
import os
import json
from typing import List, Dict, Any


class DataManager:
    def __init__(self, db_url: str = None, config_file: str = 'config.json'):
        # Указываем корректную строку подключения по умолчанию
        self.db_url = 'postgres://dataset:ololoev34@localhost:5432/dataset'
        self.config_file = config_file
        self.pool = None
        self.layout_config = self._load_layout_config()

    def _load_layout_config(self):
        """Загружает конфигурацию layout из файла"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {
            "panels": [],
            "timestamp": datetime.now().isoformat()
        }

    def _save_layout_config(self):
        """Сохраняет конфигурацию layout в файл"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.layout_config, f, indent=2)

    async def connect(self):
        """Устанавливает соединение с базой данных"""
        print(f"🔗 Подключаемся к базе: {self.db_url}")
        try:
            self.pool = await asyncpg.create_pool(
                self.db_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            await self._create_tables()
            print("✅ Подключение к базе данных установлено")
        except Exception as e:
            print(f"❌ Ошибка подключения к базе: {e}")
            raise

    async def _create_tables(self):
        """Создает таблицы если они не существуют"""
        async with self.pool.acquire() as conn:
            # Таблица серверных данных
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS server_metrics (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    server_name VARCHAR(50) NOT NULL,
                    server_ip VARCHAR(15) NOT NULL,
                    server_zone VARCHAR(20) NOT NULL,
                    server_type VARCHAR(20) NOT NULL,
                    service_name VARCHAR(20) NOT NULL,
                    environment VARCHAR(20) NOT NULL,
                    os_type VARCHAR(10) NOT NULL,

                    -- Даты
                    install_date TIMESTAMP NOT NULL,
                    last_update_date TIMESTAMP NOT NULL,
                    next_maintenance_date TIMESTAMP NOT NULL,
                    last_backup_date TIMESTAMP NOT NULL,
                    certificate_expiry_date TIMESTAMP NOT NULL,

                    -- Временные метрики (в днях)
                    days_since_install INTEGER NOT NULL,
                    days_since_last_update INTEGER NOT NULL,
                    days_until_maintenance INTEGER NOT NULL,
                    days_since_last_backup INTEGER NOT NULL,
                    days_until_cert_expiry INTEGER NOT NULL,

                    -- Ресурсы
                    cpu_usage DECIMAL(5,2) NOT NULL,
                    memory_usage DECIMAL(5,2) NOT NULL,
                    disk_usage DECIMAL(5,2) NOT NULL,
                    network_in INTEGER NOT NULL,
                    network_out INTEGER NOT NULL,

                    -- Производительность
                    response_time DECIMAL(8,2) NOT NULL,
                    requests_per_second INTEGER NOT NULL,
                    error_rate DECIMAL(5,2) NOT NULL,

                    -- Бизнес метрики
                    revenue_impact DECIMAL(10,2) NOT NULL,
                    user_sessions INTEGER NOT NULL,
                    throughput INTEGER NOT NULL,

                    -- Статус
                    status VARCHAR(10) NOT NULL,
                    uptime_days INTEGER NOT NULL,
                    last_maintenance TIMESTAMP NOT NULL,

                    -- Индексы для быстрого поиска
                    CONSTRAINT unique_server_timestamp UNIQUE (server_name, timestamp)
                )
            ''')

            # Индексы для ускорения запросов
            indexes = [
                'CREATE INDEX IF NOT EXISTS idx_timestamp ON server_metrics(timestamp)',
                'CREATE INDEX IF NOT EXISTS idx_server_name ON server_metrics(server_name)',
                'CREATE INDEX IF NOT EXISTS idx_service_name ON server_metrics(service_name)',
                'CREATE INDEX IF NOT EXISTS idx_environment ON server_metrics(environment)',
                'CREATE INDEX IF NOT EXISTS idx_status ON server_metrics(status)',
                'CREATE INDEX IF NOT EXISTS idx_zone ON server_metrics(server_zone)'
            ]

            for index_sql in indexes:
                await conn.execute(index_sql)

            print("✅ Таблицы и индексы созданы/проверены")

    async def load_data(self):
        """Загружает данные (генерирует если база пустая)"""
        await self.connect()

        # Проверяем есть ли данные в базе
        async with self.pool.acquire() as conn:
            count = await conn.fetchval('SELECT COUNT(*) FROM server_metrics')

            if count == 0:
                print("🔄 База данных пуста, генерируем данные...")
                await self._generate_and_insert_data()
            else:
                print(f"✅ В базе данных уже есть {count:,} записей")

    async def _generate_and_insert_data(self):
        """Генерация и вставка данных в PostgreSQL"""
        servers_data = await self._generate_server_data()

        print(f"📊 Генерация данных завершена, вставляем {len(servers_data):,} записей в базу...")

        # Пакетная вставка для производительности
        batch_size = 1000
        total_batches = (len(servers_data) + batch_size - 1) // batch_size

        async with self.pool.acquire() as conn:
            for i in range(0, len(servers_data), batch_size):
                batch = servers_data[i:i + batch_size]
                batch_num = (i // batch_size) + 1

                await conn.executemany('''
                    INSERT INTO server_metrics (
                        timestamp, server_name, server_ip, server_zone, server_type,
                        service_name, environment, os_type, install_date, last_update_date,
                        next_maintenance_date, last_backup_date, certificate_expiry_date,
                        days_since_install, days_since_last_update, days_until_maintenance,
                        days_since_last_backup, days_until_cert_expiry, cpu_usage, memory_usage,
                        disk_usage, network_in, network_out, response_time, requests_per_second,
                        error_rate, revenue_impact, user_sessions, throughput, status,
                        uptime_days, last_maintenance
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                        $29, $30, $31, $32
                    )
                ''', [
                    (
                        data['timestamp'], data['server_name'], data['server_ip'],
                        data['server_zone'], data['server_type'], data['service_name'],
                        data['environment'], data['os_type'], data['install_date'],
                        data['last_update_date'], data['next_maintenance_date'],
                        data['last_backup_date'], data['certificate_expiry_date'],
                        data['days_since_install'], data['days_since_last_update'],
                        data['days_until_maintenance'], data['days_since_last_backup'],
                        data['days_until_cert_expiry'], data['cpu_usage'], data['memory_usage'],
                        data['disk_usage'], data['network_in'], data['network_out'],
                        data['response_time'], data['requests_per_second'], data['error_rate'],
                        data['revenue_impact'], data['user_sessions'], data['throughput'],
                        data['status'], data['uptime_days'], data['last_maintenance']
                    ) for data in batch
                ])

                print(f"✅ Пакет {batch_num}/{total_batches} вставлен ({len(batch)} записей)")

        print(f"🎉 Все данные успешно загружены в базу!")

    async def _generate_server_data(self) -> List[Dict[str, Any]]:
        """Генерация данных по серверам (возвращает список словарей)"""
        servers = []

        # Конфигурация серверов
        server_names = [f"SRV-{i:03d}" for i in range(1, 1001)]  # Уменьшил для теста
        services = ['web', 'db', 'cache', 'api', 'storage', 'queue', 'monitoring', 'auth']
        zones = ['us-east', 'us-west', 'eu-central', 'eu-west', 'asia-south', 'asia-east']
        environments = ['production', 'staging', 'development']
        os_types = ['linux', 'windows']
        server_types = ['compute', 'memory', 'storage', 'gpu']

        base_date = datetime(2025, 1, 1)

        for server_name in server_names:
            ip_parts = [random.randint(1, 255) for _ in range(4)]
            ip = ".".join(map(str, ip_parts))

            # Дата установки сервера (от 1 до 365 дней назад)
            install_date = base_date - timedelta(days=random.randint(1, 365))

            for hour_offset in range(0, 24 * 7, 6):  # Данные за неделю каждые 6 часов
                timestamp = base_date + timedelta(hours=hour_offset)

                # Дата последнего обновления (от 1 до 30 дней назад)
                last_update = timestamp - timedelta(days=random.randint(1, 30))

                # Дата следующего планового обслуживания (от 1 до 90 дней вперед)
                next_maintenance = timestamp + timedelta(days=random.randint(1, 90))

                # Дата создания бэкапа (от 1 до 7 дней назад)
                last_backup = timestamp - timedelta(days=random.randint(1, 7))

                # Дата истечения сертификата (от 30 до 365 дней вперед)
                cert_expiry = timestamp + timedelta(days=random.randint(30, 365))

                server_data = {
                    "timestamp": timestamp,
                    "server_name": server_name,
                    "server_ip": ip,
                    "server_zone": random.choice(zones),
                    "server_type": random.choice(server_types),
                    "service_name": random.choice(services),
                    "environment": random.choice(environments),
                    "os_type": random.choice(os_types),

                    # Даты
                    "install_date": install_date,
                    "last_update_date": last_update,
                    "next_maintenance_date": next_maintenance,
                    "last_backup_date": last_backup,
                    "certificate_expiry_date": cert_expiry,

                    # Временные метрики (в днях)
                    "days_since_install": (timestamp - install_date).days,
                    "days_since_last_update": (timestamp - last_update).days,
                    "days_until_maintenance": (next_maintenance - timestamp).days,
                    "days_since_last_backup": (timestamp - last_backup).days,
                    "days_until_cert_expiry": (cert_expiry - timestamp).days,

                    # Ресурсы
                    "cpu_usage": round(random.uniform(5, 95), 2),
                    "memory_usage": round(random.uniform(10, 90), 2),
                    "disk_usage": round(random.uniform(20, 80), 2),
                    "network_in": random.randint(100, 10000),
                    "network_out": random.randint(100, 10000),

                    # Производительность
                    "response_time": round(random.uniform(10, 500), 2),
                    "requests_per_second": random.randint(100, 5000),
                    "error_rate": round(random.uniform(0.1, 5), 2),

                    # Бизнес метрики
                    "revenue_impact": round(random.uniform(1000, 50000), 2),
                    "user_sessions": random.randint(1000, 50000),
                    "throughput": random.randint(100, 5000),

                    # Статус
                    "status": random.choice(['healthy', 'warning', 'critical']),
                    "uptime_days": random.randint(1, 365),
                    "last_maintenance": (timestamp - timedelta(days=random.randint(1, 30)))
                }

                servers.append(server_data)

        return servers

    async def get_all_data(self, limit: int = None) -> List[Dict]:
        """Получает все данные из базы"""
        async with self.pool.acquire() as conn:
            query = 'SELECT * FROM server_metrics'
            if limit:
                query += f' LIMIT {limit}'

            rows = await conn.fetch(query)
            return [dict(row) for row in rows]

    async def get_filtered_data(self, start_date: datetime = None, end_date: datetime = None,
                                servers: List[str] = None, services: List[str] = None) -> List[Dict]:
        """Получает отфильтрованные данные"""
        async with self.pool.acquire() as conn:
            where_conditions = []
            params = []
            param_count = 0

            if start_date:
                param_count += 1
                where_conditions.append(f"timestamp >= ${param_count}")
                params.append(start_date)

            if end_date:
                param_count += 1
                where_conditions.append(f"timestamp <= ${param_count}")
                params.append(end_date)

            if servers:
                placeholders = ','.join([f"${i}" for i in range(param_count + 1, param_count + 1 + len(servers))])
                where_conditions.append(f"server_name IN ({placeholders})")
                params.extend(servers)
                param_count += len(servers)

            if services:
                placeholders = ','.join([f"${i}" for i in range(param_count + 1, param_count + 1 + len(services))])
                where_conditions.append(f"service_name IN ({placeholders})")
                params.extend(services)
                param_count += len(services)

            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            query = f"SELECT * FROM server_metrics WHERE {where_clause} ORDER BY timestamp"

            rows = await conn.fetch(query, *params)
            return [dict(row) for row in rows]

    async def get_available_servers(self) -> List[str]:
        """Получает список уникальных серверов"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch('SELECT DISTINCT server_name FROM server_metrics ORDER BY server_name')
            return [row['server_name'] for row in rows]

    async def get_available_services(self) -> List[str]:
        """Получает список уникальных сервисов"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch('SELECT DISTINCT service_name FROM server_metrics ORDER BY service_name')
            return [row['service_name'] for row in rows]

    def get_layout_config(self):
        return self.layout_config

    def update_layout_config(self, new_config):
        """Обновляет конфигурацию layout и сохраняет на сервере"""
        self.layout_config.update(new_config)
        self._save_layout_config()
        return self.layout_config

    async def close(self):
        """Закрывает соединение с базой"""
        if self.pool:
            await self.pool.close()


async def init_data_manager(db_url: str = None):
    data_manager = DataManager(db_url)
    await data_manager.load_data()
    return data_manager