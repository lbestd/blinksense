import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from .database import DatabaseManager


class LayoutManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.current_dashboard_id = 'default'
        self.current_layout_name = 'default'

    async def initialize(self):
        """Инициализация менеджера layout"""
        print("🔧 Инициализация LayoutManager...")
        # Убедимся, что таблица создана
        await self.db_manager._ensure_layout_table()
        print("✅ LayoutManager инициализирован")

    async def save_layout_config(self, dashboard_id: str, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Сохраняет конфигурацию layout в БД"""
        try:
            print(f"💾 Сохранение layout: {dashboard_id}/{name}")

            # Добавляем метаданные в конфиг
            full_config = {
                **config,
                "version": "1.0",
                "last_modified": datetime.now().isoformat(),
                "dashboard_id": dashboard_id,
                "name": name
            }

            success = await self.db_manager.save_layout(dashboard_id, name, full_config)

            if success:
                self.current_dashboard_id = dashboard_id
                self.current_layout_name = name

                return {
                    "status": "success",
                    "message": "Layout успешно сохранен",
                    "dashboard_id": dashboard_id,
                    "layout_name": name,
                    "timestamp": full_config["last_modified"]
                }
            else:
                return {
                    "status": "error",
                    "message": "Ошибка сохранения layout"
                }

        except Exception as e:
            print(f"❌ Ошибка в save_layout_config: {e}")
            return {
                "status": "error",
                "message": f"Ошибка сохранения: {str(e)}"
            }

    async def load_layout_config(self, dashboard_id: str, name: str = 'default') -> Dict[str, Any]:
        """Загружает конфигурацию layout из БД"""
        try:
            config = await self.db_manager.load_layout(dashboard_id, name)
            self.current_dashboard_id = dashboard_id
            self.current_layout_name = name
            return config
        except Exception as e:
            print(f"❌ Ошибка в load_layout_config: {e}")
            return self.get_default_layout(dashboard_id, name)

    async def load_dashboard_layouts(self, dashboard_id: str) -> Dict[str, Any]:
        """Загружает все layout конфигурации для дашборда"""
        try:
            layouts = await self.db_manager.get_dashboard_layouts(dashboard_id)
            current_config = await self.load_layout_config(dashboard_id, self.current_layout_name)

            return {
                "status": "success",
                "dashboard_id": dashboard_id,
                "current_layout": self.current_layout_name,
                "current_config": current_config,
                "available_layouts": layouts
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Ошибка загрузки layouts: {str(e)}"
            }

    async def load_all_dashboards(self) -> Dict[str, Any]:
        """Загружает список всех дашбордов"""
        try:
            dashboards = await self.db_manager.get_all_dashboards()

            return {
                "status": "success",
                "dashboards": dashboards,
                "current_dashboard": self.current_dashboard_id
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Ошибка загрузки дашбордов: {str(e)}"
            }

    async def delete_layout(self, dashboard_id: str, name: str) -> Dict[str, Any]:
        """Удаляет layout конфигурацию"""
        try:
            async with self.db_manager.pool.acquire() as conn:
                await conn.execute('''
                    UPDATE dashboard_layouts 
                    SET is_active = false 
                    WHERE dashboard_id = $1 AND name = $2
                ''', dashboard_id, name)

                return {
                    "status": "success",
                    "message": f"Layout '{name}' удален из дашборда '{dashboard_id}'"
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Ошибка удаления layout: {str(e)}"
            }

    async def duplicate_layout(self, source_dashboard_id: str, source_name: str,
                               target_dashboard_id: str, target_name: str) -> Dict[str, Any]:
        """Дублирует layout конфигурацию"""
        try:
            source_config = await self.db_manager.load_layout(source_dashboard_id, source_name)
            success = await self.db_manager.save_layout(target_dashboard_id, target_name, source_config)

            if success:
                return {
                    "status": "success",
                    "message": f"Layout '{source_name}' скопирован в '{target_dashboard_id}/{target_name}'"
                }
            else:
                return {
                    "status": "error",
                    "message": "Ошибка копирования layout"
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Ошибка копирования: {str(e)}"
            }

    def get_default_layout(self, dashboard_id: str, name: str = 'default') -> Dict[str, Any]:
        """Возвращает layout по умолчанию"""
        return {
            "panels": [],
            "timestamp": datetime.now().isoformat(),
            "version": "1.0",
            "dashboard_id": dashboard_id,
            "name": name
        }

    def validate_layout_config(self, config: Dict[str, Any]) -> bool:
        """Валидирует конфигурацию layout"""
        try:
            required_fields = ['panels', 'timestamp', 'version']
            return all(field in config for field in required_fields)
        except:
            return False

    def set_current_dashboard(self, dashboard_id: str, layout_name: str = 'default'):
        """Устанавливает текущий дашборд и layout"""
        self.current_dashboard_id = dashboard_id
        self.current_layout_name = layout_name
        print(f"🔀 Текущий дашборд установлен: {dashboard_id}/{layout_name}")