import asyncio
import asyncpg
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json


class DatabaseManager:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.pool = None

    async def connect(self):
        """Устанавливает соединение с базой данных"""
        print(f"🔗 Подключаемся к базе: {self._mask_db_url(self.db_url)}")
        try:
            self.pool = await asyncpg.create_pool(
                self.db_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            await self._ensure_tables()
            print("✅ Подключение к базе данных установлено")
        except Exception as e:
            print(f"❌ Ошибка подключения к базе: {e}")
            raise

    def _mask_db_url(self, db_url: str) -> str:
        """Маскирует пароль в строке подключения для безопасного логирования"""
        if '@' in db_url:
            parts = db_url.split('@')
            auth_part = parts[0]
            if ':' in auth_part:
                user_pass = auth_part.split(':')
                if len(user_pass) == 3:  # postgresql://user:password@host
                    user_pass[2] = '***'
                    auth_part = ':'.join(user_pass)
                elif len(user_pass) == 2:  # user:password@host
                    user_pass[1] = '***'
                    auth_part = ':'.join(user_pass)
            return '@'.join([auth_part] + parts[1:])
        return db_url

    async def _ensure_tables(self):
        """Создает все необходимые таблицы"""
        await self._ensure_data_table()
        await self._ensure_layout_table()

    async def _ensure_data_table(self):
        """Создает таблицу для данных если не существует"""
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

            print("✅ Таблица server_metrics создана/проверена")

    async def _ensure_layout_table(self):
        """Создает таблицу для хранения layout конфигураций"""
        async with self.pool.acquire() as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS dashboard_layouts (
                    id SERIAL PRIMARY KEY,
                    dashboard_id VARCHAR(50) NOT NULL DEFAULT 'default',
                    name VARCHAR(100) NOT NULL DEFAULT 'default',
                    config JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT true,
                    UNIQUE(dashboard_id, name)
                )
            ''')

            await conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_layouts_dashboard_id 
                ON dashboard_layouts(dashboard_id)
            ''')
            await conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_layouts_active 
                ON dashboard_layouts(is_active) WHERE is_active = true
            ''')

            print("✅ Таблица dashboard_layouts создана/проверена")

    async def save_layout(self, dashboard_id: str, name: str, config: dict) -> bool:
        """Сохраняет layout конфигурацию в БД"""
        async with self.pool.acquire() as conn:
            try:
                print(f"💾 [DB] === НАЧАЛО СОХРАНЕНИЯ ===")
                print(f"💾 [DB] dashboard_id: '{dashboard_id}'")
                print(f"💾 [DB] name: '{name}'")
                print(f"💾 [DB] config keys: {config.keys()}")
                print(f"💾 [DB] config.panels length: {len(config.get('panels', []))}")

                # Добавляем dashboard_id и name в конфиг
                config_with_meta = {
                    **config,
                    "dashboard_id": dashboard_id,
                    "name": name
                }

                # Преобразуем dict в JSON строку для PostgreSQL
                config_json = json.dumps(config_with_meta, ensure_ascii=False, default=str)
                print(f"💾 [DB] config_json length: {len(config_json)} chars")
                print(f"💾 [DB] config_json preview: {config_json[:200]}...")

                result = await conn.execute('''
                    INSERT INTO dashboard_layouts (dashboard_id, name, config, updated_at)
                    VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
                    ON CONFLICT (dashboard_id, name)
                    DO UPDATE SET config = $3::jsonb, updated_at = CURRENT_TIMESTAMP
                ''', dashboard_id, name, config_json)

                print(f"💾 [DB] Execute result: {result}")

                # Проверяем что данные действительно сохранились
                verify_row = await conn.fetchrow('''
                    SELECT dashboard_id, name, is_active,
                           jsonb_array_length(config->'panels') as panel_count,
                           updated_at
                    FROM dashboard_layouts
                    WHERE dashboard_id = $1 AND name = $2
                ''', dashboard_id, name)

                if verify_row:
                    print(f"✅ [DB] Верификация: найдена запись")
                    print(f"✅ [DB]   dashboard_id: '{verify_row['dashboard_id']}'")
                    print(f"✅ [DB]   name: '{verify_row['name']}'")
                    print(f"✅ [DB]   is_active: {verify_row['is_active']}")
                    print(f"✅ [DB]   panel_count: {verify_row['panel_count']}")
                    print(f"✅ [DB]   updated_at: {verify_row['updated_at']}")
                else:
                    print(f"⚠️ [DB] ВНИМАНИЕ: Запись НЕ найдена после сохранения!")

                print(f"💾 [DB] === КОНЕЦ СОХРАНЕНИЯ ===")
                return True
            except Exception as e:
                print(f"❌ [DB] Ошибка сохранения layout: {e}")
                import traceback
                print(f"❌ [DB] Traceback: {traceback.format_exc()}")
                return False

    async def load_layout(self, dashboard_id: str, name: str = 'default') -> dict:
        """Загружает layout конфигурацию из БД"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow('''
                SELECT config FROM dashboard_layouts 
                WHERE dashboard_id = $1 AND name = $2 AND is_active = true
            ''', dashboard_id, name)

            if row:
                return row['config']
            else:
                print(f"⚠️ Layout не найден, возвращаем default: {dashboard_id}/{name}")
                # Возвращаем конфигурацию по умолчанию
                return {
                    "panels": [],
                    "timestamp": datetime.now().isoformat(),
                    "version": "1.0",
                    "dashboard_id": dashboard_id,
                    "name": name
                }

    async def get_dashboard_layouts(self, dashboard_id: str) -> List[Dict[str, Any]]:
        """Получает все layout конфигурации для дашборда"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT id, name, created_at, updated_at 
                FROM dashboard_layouts 
                WHERE dashboard_id = $1 AND is_active = true 
                ORDER BY updated_at DESC
            ''', dashboard_id)
            return [dict(row) for row in rows]

    async def get_all_dashboards(self) -> List[Dict[str, Any]]:
        """Получает список всех дашбордов"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT DISTINCT dashboard_id, 
                       COUNT(*) as layout_count,
                       MAX(updated_at) as last_updated
                FROM dashboard_layouts 
                WHERE is_active = true 
                GROUP BY dashboard_id
                ORDER BY last_updated DESC
            ''')
            return [dict(row) for row in rows]

    async def insert_data(self, table_name: str, data: List[Dict[str, Any]]):
        """Вставляет данные в таблицу (динамически определяет колонки)"""
        if not data:
            return

        # Определяем колонки из первого элемента
        first_row = data[0]
        columns = list(first_row.keys())
        placeholders = [f"${i + 1}" for i in range(len(columns))]

        async with self.pool.acquire() as conn:
            # Создаем таблицу если не существует
            await self._create_table_if_not_exists(conn, table_name, first_row)

            # Вставляем данные
            for item in data:
                values = [item[col] for col in columns]
                await conn.execute(
                    f'INSERT INTO {table_name} ({", ".join(columns)}) VALUES ({", ".join(placeholders)})',
                    *values
                )

    async def _create_table_if_not_exists(self, conn, table_name: str, sample_data: Dict[str, Any]):
        """Создает таблицу на основе структуры данных"""
        columns_sql = []
        for col_name, value in sample_data.items():
            if isinstance(value, datetime):
                col_type = "TIMESTAMP"
            elif isinstance(value, int):
                col_type = "INTEGER"
            elif isinstance(value, float):
                col_type = "DECIMAL(10,2)"
            elif isinstance(value, bool):
                col_type = "BOOLEAN"
            else:
                col_type = "VARCHAR(255)"
            columns_sql.append(f"{col_name} {col_type}")

        create_table_sql = f'''
            CREATE TABLE IF NOT EXISTS {table_name} (
                id SERIAL PRIMARY KEY,
                {', '.join(columns_sql)}
            )
        '''
        await conn.execute(create_table_sql)

    async def get_column_names(self, table_name: str) -> List[str]:
        """Получает названия колонок из таблицы"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            """, table_name)
            return [row['column_name'] for row in rows if row['column_name'] != 'id']

    async def get_all_data(self, table_name: str, limit: int = None) -> List[Dict[str, Any]]:
        """Получает все данные из таблицы (оптимизированная версия)"""
        async with self.pool.acquire() as conn:
            query = f'SELECT * FROM {table_name}'
            if limit:
                query += f' LIMIT {limit}'
            print(f"preselect : {datetime.now().strftime("%M:%S")}")

            rows = await conn.fetch(query)
            print(f"postselect : {datetime.now().strftime("%M:%S")}")

            if not rows:
                return []

            # Получаем названия колонок из первой записи (без отдельного запроса)
            columns = [col for col in rows[0].keys() if col != 'id']

            # Оптимизированная конвертация через list comprehension
            return [
                {col: row[col] for col in columns}
                for row in rows
            ]

    async def get_filtered_data(self, table_name: str, filters: Dict[str, Any] = None,
                                limit: int = None) -> List[Dict[str, Any]]:
        """Получает отфильтрованные данные (оптимизированная версия)"""
        async with self.pool.acquire() as conn:
            where_conditions = []
            params = []
            param_count = 0

            if filters:
                for col_name, value in filters.items():
                    param_count += 1
                    if isinstance(value, (list, tuple)):
                        placeholders = ','.join([f"${i}" for i in range(param_count, param_count + len(value))])
                        where_conditions.append(f"{col_name} IN ({placeholders})")
                        params.extend(value)
                        param_count += len(value) - 1
                    else:
                        where_conditions.append(f"{col_name} = ${param_count}")
                        params.append(value)

            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            query = f"SELECT * FROM {table_name} WHERE {where_clause}"

            if limit:
                query += f" LIMIT {limit}"

            rows = await conn.fetch(query, *params)

            if not rows:
                return []

            # Получаем колонки из первой записи (без отдельного запроса)
            columns = [col for col in rows[0].keys() if col != 'id']

            # Оптимизированная конвертация
            return [
                {col: row[col] for col in columns}
                for row in rows
            ]

    async def close(self):
        """Закрывает соединение с базой"""
        if self.pool:
            await self.pool.close()
            print("🔌 Соединение с базой данных закрыто")