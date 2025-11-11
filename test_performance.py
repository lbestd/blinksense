#!/usr/bin/env python3
"""
Скрипт для тестирования производительности API endpoints
"""
import asyncio
import time
import sys
from data_manager.database import DatabaseManager
from data_manager.api_formatter import APIFormatter
from datetime import datetime
from config import config


async def test_endpoints():
    """Тестирует размер и скорость различных форматов"""

    db_manager = DatabaseManager(config.DATABASE_URL)
    await db_manager.connect()

    print("=" * 80)
    print("🧪 ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ API ENDPOINTS")
    print("=" * 80)

    # Тестируем разные лимиты
    limits = [1000, 10000, 84000]

    for limit in limits:
        print(f"\n📊 Тестируем с лимитом: {limit:,} записей")
        print("-" * 80)

        # Загружаем данные
        start = time.time()
        data = await db_manager.get_all_data('server_metrics', limit=limit)
        db_time = (time.time() - start) * 1000

        print(f"  ⏱️  Время загрузки из БД: {db_time:.0f} ms")
        print(f"  📝 Загружено записей: {len(data):,}")

        # 1. Полный формат (обычный JSON)
        start = time.time()
        import json
        full_json = json.dumps(data, default=str)
        full_time = (time.time() - start) * 1000
        full_size = len(full_json)

        print(f"\n  1️⃣  ПОЛНЫЙ ФОРМАТ (standard JSON):")
        print(f"      📦 Размер: {full_size / 1024 / 1024:.2f} MB")
        print(f"      ⏱️  Время сериализации: {full_time:.0f} ms")

        # 2. Компактный формат
        start = time.time()
        metadata = {
            'table': 'server_metrics',
            'total_records': len(data),
            'timestamp': datetime.now().isoformat(),
            'format': 'compact'
        }
        compact_json = APIFormatter.to_json(data, metadata)
        compact_time = (time.time() - start) * 1000
        compact_size = len(compact_json)

        print(f"\n  2️⃣  КОМПАКТНЫЙ ФОРМАТ:")
        print(f"      📦 Размер: {compact_size / 1024 / 1024:.2f} MB")
        print(f"      ⏱️  Время сериализации: {compact_time:.0f} ms")
        print(f"      📉 Сжатие: {(1 - compact_size / full_size) * 100:.1f}%")

        # 3. Ультра-компактный формат (с timestamp)
        start = time.time()
        ultra_data = []
        for row in data:
            ultra_row = {}
            for key, value in row.items():
                if isinstance(value, datetime):
                    ultra_row[key] = int(value.timestamp())
                else:
                    ultra_row[key] = value
            ultra_data.append(ultra_row)

        ultra_metadata = {'total_records': len(ultra_data)}
        ultra_json = APIFormatter.to_json(ultra_data, ultra_metadata)
        ultra_time = (time.time() - start) * 1000
        ultra_size = len(ultra_json)

        print(f"\n  3️⃣  УЛЬТРА-КОМПАКТНЫЙ ФОРМАТ:")
        print(f"      📦 Размер: {ultra_size / 1024 / 1024:.2f} MB")
        print(f"      ⏱️  Время сериализации: {ultra_time:.0f} ms")
        print(f"      📉 Сжатие vs полный: {(1 - ultra_size / full_size) * 100:.1f}%")
        print(f"      📉 Сжатие vs компактный: {(1 - ultra_size / compact_size) * 100:.1f}%")

        # 4. Симуляция GZIP (примерное сжатие)
        import gzip
        gzipped = gzip.compress(ultra_json.encode('utf-8'))
        gzipped_size = len(gzipped)

        print(f"\n  4️⃣  С GZIP КОМПРЕССИЕЙ:")
        print(f"      📦 Размер: {gzipped_size / 1024 / 1024:.2f} MB")
        print(f"      📉 Сжатие vs оригинал: {(1 - gzipped_size / full_size) * 100:.1f}%")
        print(f"      🚀 ФИНАЛЬНОЕ сжатие: {full_size / gzipped_size:.1f}x")

        # Оценка скорости загрузки
        print(f"\n  ⏱️  ПРИМЕРНОЕ ВРЕМЯ ЗАГРУЗКИ:")
        # Предполагаем скорость интернета 10 MB/s (типичный DSL)
        download_speed_mbps = 10
        download_time = (gzipped_size / 1024 / 1024) / download_speed_mbps * 1000
        print(f"      📡 При 10 MB/s: ~{download_time:.0f} ms")

        # Общее время
        total_time = db_time + ultra_time + download_time
        print(f"      ⚡ ИТОГО: ~{total_time:.0f} ms (БД + сериализация + передача)")

    print("\n" + "=" * 80)
    print("✅ Тест завершен!")
    print("=" * 80)

    await db_manager.close()


if __name__ == '__main__':
    try:
        asyncio.run(test_endpoints())
    except KeyboardInterrupt:
        print("\n\n⚠️ Тест прерван пользователем")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Ошибка: {e}")
        sys.exit(1)
