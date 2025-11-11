from aiohttp import web
import aiohttp_jinja2
import json
from datetime import datetime
from data_manager.api_formatter import APIFormatter


def setup_routes(app: web.Application):
    app.router.add_static('/static/', path='static')
    app.router.add_get('/', dashboard_view)

    # API для данных
    app.router.add_get('/api/data', api_data)
    app.router.add_get('/api/data/compact', api_data_compact)
    app.router.add_get('/api/data/ultra', api_data_ultra_compact)
    app.router.add_get('/api/data/filtered', api_data_filtered)
    app.router.add_get('/api/metadata', api_metadata)

    # API для layout (новые эндпоинты с dashboard_id)
    app.router.add_get('/api/layout', api_get_layout)
    app.router.add_post('/api/layout', api_save_layout)
    app.router.add_get('/api/layouts', api_get_dashboard_layouts)
    app.router.add_get('/api/dashboards', api_get_all_dashboards)
    app.router.add_delete('/api/layout', api_delete_layout)
    app.router.add_post('/api/layout/duplicate', api_duplicate_layout)

    # API для управления кешем
    app.router.add_post('/api/cache/clear', api_clear_cache)
    app.router.add_get('/api/cache/stats', api_cache_stats)


@aiohttp_jinja2.template('dashboard.html')
async def dashboard_view(request: web.Request):
    import time
    return {
        "title": "Server Monitoring Dashboard",
        "cache_bust": str(int(time.time()))
    }


async def api_data(request: web.Request):
    """API для получения данных в полном формате"""
    db_manager = request.app['db_manager']

    # Параметры запроса
    limit = int(request.query.get('limit', 1000))
    table_name = request.query.get('table', 'server_metrics')

    try:
        data = await db_manager.get_all_data(table_name, limit=limit)
        return web.json_response(data)
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка получения данных: {str(e)}'},
            status=500
        )


async def api_data_compact(request: web.Request):
    """API для получения данных в компактном формате с кешированием"""
    db_manager = request.app['db_manager']
    cache = request.app['data_cache']

    # Параметры запроса
    limit = int(request.query.get('limit', 100000))  # Увеличен лимит по умолчанию
    table_name = request.query.get('table', 'server_metrics')
    use_cache = request.query.get('cache', 'true').lower() == 'true'

    cache_key = f"{table_name}_{limit}"

    try:
        # Проверяем кеш
        if use_cache and cache_key in cache:
            cached_data = cache[cache_key]
            if cached_data['timestamp']:
                cache_age = (datetime.now() - cached_data['timestamp']).total_seconds()
                if cache_age < cached_data['ttl']:
                    # Возвращаем из кеша
                    return web.Response(
                        text=cached_data['data'],
                        content_type='application/json',
                        headers={'X-Cache': 'HIT', 'X-Cache-Age': str(int(cache_age))}
                    )

        # Кеш промах - загружаем из БД
        data = await db_manager.get_all_data(table_name, limit=limit)

        # Метаданные для ответа
        metadata = {
            'table': table_name,
            'total_records': len(data),
            'timestamp': datetime.now().isoformat(),
            'format': 'compact'
        }

        # Конвертируем в компактный формат
        compact_json = APIFormatter.to_json(data, metadata)

        # Сохраняем в кеш
        if use_cache:
            if cache_key not in cache:
                cache[cache_key] = {'data': None, 'timestamp': None, 'ttl': 300}
            cache[cache_key]['data'] = compact_json
            cache[cache_key]['timestamp'] = datetime.now()

        return web.Response(
            text=compact_json,
            content_type='application/json',
            headers={'X-Cache': 'MISS'}
        )
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка получения данных: {str(e)}'},
            status=500
        )


async def api_data_ultra_compact(request: web.Request):
    """API для получения данных в ультра-компактном формате (только числовые данные)"""
    db_manager = request.app['db_manager']
    cache = request.app['data_cache']

    limit = int(request.query.get('limit', 100000))
    table_name = request.query.get('table', 'server_metrics')
    use_cache = request.query.get('cache', 'true').lower() == 'true'

    cache_key = f"{table_name}_{limit}_ultra"
    print(f"start : {datetime.now().strftime("%M:%S")}")

    try:
        # Проверяем кеш
        if use_cache and cache_key in cache:
            cached_data = cache[cache_key]
            if cached_data['timestamp']:
                cache_age = (datetime.now() - cached_data['timestamp']).total_seconds()
                if cache_age < cached_data['ttl']:
                    return web.Response(
                        text=cached_data['data'],
                        content_type='application/json',
                        headers={'X-Cache': 'HIT', 'X-Cache-Age': str(int(cache_age))}
                    )
        print(f"after check cache : {datetime.now().strftime("%M:%S")}")

        # Загружаем данные
        data = await db_manager.get_all_data(table_name, limit=limit)
        print(f"data : {datetime.now().strftime("%M:%S")}")

        # Оптимизация: конвертируем datetime в timestamp (числа короче строк)
        for row in data:
            for key, value in row.items():
                if isinstance(value, datetime):
                    row[key] = int(value.timestamp())

        # Минимальные метаданные
        metadata = {'total_records': len(data)}
        print(f"metadata : {datetime.now().strftime("%M:%S")}")
        # Конвертируем в компактный формат
        compact_json = APIFormatter.to_json(data, metadata)
        print(f"compact : {datetime.now().strftime("%M:%S")}")
        # Сохраняем в кеш
        if use_cache:
            if cache_key not in cache:
                cache[cache_key] = {'data': None, 'timestamp': None, 'ttl': 300}
            cache[cache_key]['data'] = compact_json
            cache[cache_key]['timestamp'] = datetime.now()
        print(f"cache : {datetime.now().strftime("%M:%S")}")
        return web.Response(
            text=compact_json,
            content_type='application/json',
            headers={'X-Cache': 'MISS'}
        )
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка получения данных: {str(e)}'},
            status=500
        )


async def api_data_filtered(request: web.Request):
    """API для получения отфильтрованных данных в компактном формате"""
    db_manager = request.app['db_manager']

    # Параметры запроса
    limit = int(request.query.get('limit', 1000))
    table_name = request.query.get('table', 'server_metrics')

    # Парсим фильтры из query параметров
    filters = {}
    for key, value in request.query.items():
        if key not in ['limit', 'table']:
            # Пытаемся преобразовать значения
            if value.lower() in ['true', 'false']:
                filters[key] = value.lower() == 'true'
            elif value.isdigit():
                filters[key] = int(value)
            elif value.replace('.', '').isdigit():
                filters[key] = float(value)
            else:
                filters[key] = value

    try:
        data = await db_manager.get_filtered_data(
            table_name,
            filters=filters if filters else None,
            limit=limit
        )

        # Метаданные для ответа
        metadata = {
            'table': table_name,
            'total_records': len(data),
            'filters_applied': filters,
            'timestamp': datetime.now().isoformat(),
            'format': 'compact'
        }

        # Конвертируем в компактный формат
        compact_json = APIFormatter.to_json(data, metadata)

        return web.Response(
            text=compact_json,
            content_type='application/json'
        )
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка фильтрации данных: {str(e)}'},
            status=500
        )


async def api_metadata(request: web.Request):
    """API для получения метаданных о таблицах и колонках"""
    db_manager = request.app['db_manager']
    table_name = request.query.get('table', 'server_metrics')

    try:
        # Получаем названия колонок
        columns = await db_manager.get_column_names(table_name)

        # Получаем пример данных для определения типов
        sample_data = await db_manager.get_all_data(table_name, limit=1)

        metadata = {
            'table_name': table_name,
            'columns': columns,
            'sample_record': sample_data[0] if sample_data else {},
            'total_columns': len(columns)
        }

        return web.json_response(metadata)
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка получения метаданных: {str(e)}'},
            status=500
        )


async def api_get_layout(request: web.Request):
    """Получение конфигурации layout из БД"""
    layout_manager = request.app['layout_manager']

    # Параметры из query string
    dashboard_id = request.query.get('dashboard_id', 'default')
    layout_name = request.query.get('name', 'default')

    try:
        layout_config = await layout_manager.load_layout_config(dashboard_id, layout_name)
        return web.json_response(layout_config)
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка загрузки layout: {str(e)}'},
            status=500
        )


async def api_save_layout(request: web.Request):
    """Сохранение конфигурации layout в БД"""
    layout_manager = request.app['layout_manager']

    try:
        data = await request.json()

        # Валидация данных
        if not layout_manager.validate_layout_config(data):
            return web.json_response(
                {'error': 'Некорректный формат конфигурации'},
                status=400
            )

        # Параметры из query string или из тела запроса
        dashboard_id = request.query.get('dashboard_id', data.get('dashboard_id', 'default'))
        layout_name = request.query.get('name', data.get('name', 'default'))

        result = await layout_manager.save_layout_config(dashboard_id, layout_name, data)

        if result['status'] == 'success':
            return web.json_response(result)
        else:
            return web.json_response(result, status=500)

    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка сохранения layout: {str(e)}'},
            status=500
        )

async def api_get_dashboard_layouts(request: web.Request):
    """Получение всех layout конфигураций для дашборда"""
    layout_manager = request.app['layout_manager']

    dashboard_id = request.query.get('dashboard_id', 'default')

    try:
        result = await layout_manager.load_dashboard_layouts(dashboard_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка загрузки layouts: {str(e)}'},
            status=500
        )

async def api_get_all_dashboards(request: web.Request):
    """Получение списка всех дашбордов"""
    layout_manager = request.app['layout_manager']

    try:
        result = await layout_manager.load_all_dashboards()
        return web.json_response(result)
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка загрузки дашбордов: {str(e)}'},
            status=500
        )

async def api_delete_layout(request: web.Request):
    """Удаление layout конфигурации"""
    layout_manager = request.app['layout_manager']

    try:
        dashboard_id = request.query.get('dashboard_id', 'default')
        layout_name = request.query.get('name', 'default')

        result = await layout_manager.delete_layout(dashboard_id, layout_name)

        if result['status'] == 'success':
            return web.json_response(result)
        else:
            return web.json_response(result, status=500)

    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка удаления layout: {str(e)}'},
            status=500
        )

async def api_duplicate_layout(request: web.Request):
    """Дублирование layout конфигурации"""
    layout_manager = request.app['layout_manager']

    try:
        data = await request.json()
        source_dashboard_id = data.get('source_dashboard_id', 'default')
        source_name = data.get('source_name', 'default')
        target_dashboard_id = data.get('target_dashboard_id', 'default')
        target_name = data.get('target_name', 'default')

        result = await layout_manager.duplicate_layout(
            source_dashboard_id, source_name,
            target_dashboard_id, target_name
        )

        if result['status'] == 'success':
            return web.json_response(result)
        else:
            return web.json_response(result, status=500)

    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка копирования layout: {str(e)}'},
            status=500
        )


async def api_clear_cache(request: web.Request):
    """Очистка кеша данных"""
    cache = request.app['data_cache']

    try:
        # Получаем список ключей для очистки
        cache_keys = [k for k in cache.keys() if k not in ['ttl']]

        # Очищаем кеш
        for key in cache_keys:
            if key not in ['ttl']:
                cache.pop(key, None)

        return web.json_response({
            'status': 'success',
            'message': f'Кеш очищен. Удалено записей: {len(cache_keys)}',
            'cleared_keys': cache_keys
        })
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка очистки кеша: {str(e)}'},
            status=500
        )


async def api_cache_stats(request: web.Request):
    """Статистика кеша"""
    cache = request.app['data_cache']

    try:
        stats = {
            'total_entries': len([k for k in cache.keys() if k not in ['ttl']]),
            'entries': []
        }

        for key, value in cache.items():
            if key == 'ttl':
                continue

            if isinstance(value, dict) and 'timestamp' in value:
                age = (datetime.now() - value['timestamp']).total_seconds() if value['timestamp'] else None
                size = len(value['data']) if value.get('data') else 0

                stats['entries'].append({
                    'key': key,
                    'age_seconds': age,
                    'ttl': value.get('ttl', 0),
                    'size_bytes': size,
                    'expired': age > value.get('ttl', 0) if age else False
                })

        return web.json_response(stats)
    except Exception as e:
        return web.json_response(
            {'error': f'Ошибка получения статистики: {str(e)}'},
            status=500
        )