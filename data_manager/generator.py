import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class DataGenerator:
    def __init__(self):
        self.services = ['web', 'db', 'cache', 'api', 'storage', 'queue', 'monitoring', 'auth']
        self.zones = ['us-east', 'us-west', 'eu-central', 'eu-west', 'asia-south', 'asia-east']
        self.environments = ['production', 'staging', 'development']
        self.os_types = ['linux', 'windows']
        self.server_types = ['compute', 'memory', 'storage', 'gpu']
        self.statuses = ['healthy', 'warning', 'critical']

    def generate_server_data(self, server_count: int = 1000, days: int = 7, interval_hours: int = 6) -> List[Dict[str, Any]]:
        """Генерация данных по серверам"""
        servers = []
        base_date = datetime(2025, 1, 1)
        server_names = [f"SRV-{i:03d}" for i in range(1, server_count + 1)]

        for server_name in server_names:
            ip_parts = [random.randint(1, 255) for _ in range(4)]
            ip = ".".join(map(str, ip_parts))
            install_date = base_date - timedelta(days=random.randint(1, 365))

            for hour_offset in range(0, 24 * days, interval_hours):
                timestamp = base_date + timedelta(hours=hour_offset)
                last_update = timestamp - timedelta(days=random.randint(1, 30))
                next_maintenance = timestamp + timedelta(days=random.randint(1, 90))
                last_backup = timestamp - timedelta(days=random.randint(1, 7))
                cert_expiry = timestamp + timedelta(days=random.randint(30, 365))

                server_data = {
                    "timestamp": timestamp,
                    "server_name": server_name,
                    "server_ip": ip,
                    "server_zone": random.choice(self.zones),
                    "server_type": random.choice(self.server_types),
                    "service_name": random.choice(self.services),
                    "environment": random.choice(self.environments),
                    "os_type": random.choice(self.os_types),
                    "install_date": install_date,
                    "last_update_date": last_update,
                    "next_maintenance_date": next_maintenance,
                    "last_backup_date": last_backup,
                    "certificate_expiry_date": cert_expiry,
                    "days_since_install": (timestamp - install_date).days,
                    "days_since_last_update": (timestamp - last_update).days,
                    "days_until_maintenance": (next_maintenance - timestamp).days,
                    "days_since_last_backup": (timestamp - last_backup).days,
                    "days_until_cert_expiry": (cert_expiry - timestamp).days,
                    "cpu_usage": round(random.uniform(5, 95), 2),
                    "memory_usage": round(random.uniform(10, 90), 2),
                    "disk_usage": round(random.uniform(20, 80), 2),
                    "network_in": random.randint(100, 10000),
                    "network_out": random.randint(100, 10000),
                    "response_time": round(random.uniform(10, 500), 2),
                    "requests_per_second": random.randint(100, 5000),
                    "error_rate": round(random.uniform(0.1, 5), 2),
                    "revenue_impact": round(random.uniform(1000, 50000), 2),
                    "user_sessions": random.randint(1000, 50000),
                    "throughput": random.randint(100, 5000),
                    "status": random.choice(self.statuses),
                    "uptime_days": random.randint(1, 365),
                    "last_maintenance": timestamp - timedelta(days=random.randint(1, 30))
                }
                servers.append(server_data)

        return servers