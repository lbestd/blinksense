import aiohttp.web
import aiohttp_jinja2
import jinja2
from pathlib import Path
from aiohttp import web
from aiohttp_compress import compress_middleware
import asyncio
from datetime import datetime, timedelta

from routes import setup_routes
from data_manager.database import DatabaseManager
from data_manager.generator import DataGenerator
from data_manager.layout_manager import LayoutManager
from config import config


async def create_app() -> web.Application:
    # Добавляем gzip компрессию для всех ответов
    app = web.Application(middlewares=[compress_middleware])

    template_dir = Path(__file__).parent / 'templates'
    aiohttp_jinja2.setup(app, loader=jinja2.FileSystemLoader(str(template_dir)))

    # Инициализация кеша для API данных
    app['data_cache'] = {
        'data': None,
        'timestamp': None,
        'ttl': 300  # 5 минут TTL
    }

    # Инициализация менеджера базы данных
    app['db_manager'] = DatabaseManager(config.DATABASE_URL)
    await app['db_manager'].connect()

    # Инициализация менеджера layout
    app['layout_manager'] = LayoutManager(app['db_manager'])
    await app['layout_manager'].initialize()

    # Инициализация генератора данных
    app['data_generator'] = DataGenerator()

    # Проверяем и генерируем данные если база пуста
    await _ensure_initial_data(app['db_manager'], app['data_generator'])

    setup_routes(app)
    return app


async def _ensure_initial_data(db_manager: DatabaseManager, data_generator: DataGenerator):
    """Проверяет и генерирует начальные данные если база пуста"""
    try:
        # Проверяем есть ли данные в таблице server_metrics
        existing_data = await db_manager.get_all_data('server_metrics', limit=1)
        if not existing_data:
            print("🔄 База данных пуста, генерируем начальные данные...")
            data = data_generator.generate_server_data(server_count=30000, days=7, interval_hours=6)
            await db_manager.insert_data('server_metrics', data)
            print(f"✅ Сгенерировано и сохранено {len(data)} записей")
        else:
            print(f"✅ В базе уже есть данные ({len(existing_data)}+ записей)")
    except Exception as e:
        print(f"⚠️ Ошибка при проверке данных: {e}")
        print("🔄 Пытаемся создать таблицу и сгенерировать данные...")
        data = data_generator.generate_server_data(server_count=50, days=3, interval_hours=12)
        await db_manager.insert_data('server_metrics', data)
        print(f"✅ Создана таблица и сохранено {len(data)} записей")


def main():
    static_dir = Path(__file__).parent / 'static'
    static_dir.mkdir(exist_ok=True)
    (static_dir / 'css').mkdir(exist_ok=True)
    (static_dir / 'js').mkdir(exist_ok=True)

    print("🚀 Запуск Server Monitoring Dashboard...")
    print(f"📊 База данных: {config.DATABASE_URL}")
    web.run_app(create_app(), host=config.HOST, port=config.PORT, print=None)


if __name__ == '__main__':
    main()