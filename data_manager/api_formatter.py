from typing import List, Dict, Any
from .models import CompactData
from datetime import datetime


class APIFormatter:
    @staticmethod
    def to_compact_format(data: List[Dict[str, Any]], metadata: Dict[str, Any] = None) -> CompactData:
        """Конвертирует данные в компактный формат"""
        if not data:
            return CompactData(headers=[], data=[], metadata=metadata or {})

        # Получаем заголовки из ключей первого элемента
        headers = list(data[0].keys())

        # Преобразуем данные в список списков
        compact_data = []
        for item in data:
            row = []
            for header in headers:
                value = item[header]
                # Преобразуем datetime в строку для JSON
                if isinstance(value, datetime):
                    value = value.isoformat()
                row.append(value)
            compact_data.append(row)

        metadata = metadata or {
            'total_count': len(data),
            'columns_count': len(headers),
            'format': 'compact'
        }

        return CompactData(headers=headers, data=compact_data, metadata=metadata)

    @staticmethod
    def from_compact_format(compact_data: CompactData) -> List[Dict[str, Any]]:
        """Восстанавливает данные из компактного формата"""
        result = []
        headers = compact_data.headers

        for row in compact_data.data:
            item = {}
            for i, header in enumerate(headers):
                if i < len(row):
                    item[header] = row[i]
            result.append(item)

        return result

    @staticmethod
    def to_json(data: List[Dict[str, Any]], metadata: Dict[str, Any] = None) -> str:
        """Быстрая конвертация в JSON (компактный формат)"""
        compact_data = APIFormatter.to_compact_format(data, metadata)
        return compact_data.to_json()

    @staticmethod
    def from_json(json_str: str) -> List[Dict[str, Any]]:
        """Быстрое восстановление из JSON"""
        compact_data = CompactData.from_json(json_str)
        return APIFormatter.from_compact_format(compact_data)