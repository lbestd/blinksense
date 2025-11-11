import os

class Config:
    HOST = os.getenv('HOST', 'localhost')
    PORT = int(os.getenv('PORT', 8081))
    DATA_FILE = os.getenv('DATA_FILE', 'sample_data.json')
    DATABASE_URL = os.getenv(
        'DATABASE_URL',
        'postgresql://dataset:ololoev34@localhost:5432/dataset'
    )


config = Config()