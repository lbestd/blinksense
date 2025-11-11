from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Any
import json


@dataclass
class CompactData:
    """Компактное представление данных для API"""
    headers: List[str]
    data: List[List[Any]]
    metadata: Dict[str, Any]

    def to_json(self):
        # Максимально компактный формат без пробелов и минимум метаданных
        result = {
            'h': self.headers,  # headers
            'd': self.data      # data rows
        }
        # Добавляем только критичные метаданные
        if self.metadata and 'total_records' in self.metadata:
            result['c'] = self.metadata['total_records']  # count
        return json.dumps(result, separators=(',', ':'), ensure_ascii=False, default=str)

    @classmethod
    def from_json(cls, json_str: str):
        data = json.loads(json_str)
        return cls(
            headers=data['h'],
            data=data['d'],
            metadata=data['m']
        )