# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlinkSense is a Server Monitoring Dashboard built with Python/aiohttp that provides real-time visualization and analysis of server metrics. The application uses PostgreSQL for data storage and provides a web-based dashboard with customizable panels for charts and tables.

## Development Commands

### Running the Application

```bash
# Run the main application (starts on http://localhost:8081 by default)
python main.py
```

### Environment Configuration

The application is configured via environment variables (see config.py:4-10):
- `HOST` - Server host (default: localhost)
- `PORT` - Server port (default: 8081)
- `DATABASE_URL` - PostgreSQL connection string (default: postgresql://dataset:ololoev34@localhost:5432/dataset)
- `DATA_FILE` - Configuration file for layout (default: sample_data.json)

## Architecture

### Core Components

**Application Structure:**
- `main.py` - Application entry point and initialization
- `routes.py` - API routes and view handlers
- `config.py` - Environment configuration
- `data_manager/` - Data layer components

**Data Layer (data_manager/):**
- `database.py` - DatabaseManager handles PostgreSQL operations, table creation, and data queries
- `generator.py` - DataGenerator creates synthetic server metrics data
- `layout_manager.py` - LayoutManager manages dashboard layout configurations
- `api_formatter.py` - APIFormatter provides compact JSON format for efficient API responses
- `models.py` - CompactData model for optimized data transfer

**Frontend:**
- `templates/` - Jinja2 templates for HTML rendering
- `static/js/` - JavaScript modules for interactive dashboard
- `static/js/panels/` - Panel management and rendering logic
- `static/js/components/` - Reusable UI components

### Application Initialization Flow

1. `create_app()` in main.py:14 initializes the web application
2. DatabaseManager connects to PostgreSQL and ensures tables exist (main.py:21-22)
3. LayoutManager initializes and manages dashboard configurations (main.py:25-26)
4. DataGenerator is initialized for data generation (main.py:29)
5. `_ensure_initial_data()` checks if database is empty and generates sample data if needed (main.py:32)
6. Routes are configured via `setup_routes()` (main.py:34)

### Database Schema

**server_metrics table** (database.py:54-105):
- Tracks server metrics with timestamps
- Contains resource usage (CPU, memory, disk, network)
- Performance metrics (response time, requests per second, error rate)
- Business metrics (revenue impact, user sessions, throughput)
- Maintenance tracking (install dates, update dates, certificate expiry)
- Indexed on: timestamp, server_name, service_name, environment, status, server_zone

**dashboard_layouts table** (database.py:126-136):
- Stores dashboard layout configurations as JSONB
- Supports multiple dashboards via dashboard_id
- Multiple named layouts per dashboard
- Soft delete via is_active flag
- Unique constraint on (dashboard_id, name)

### Data Generation

DataGenerator (generator.py:14) creates realistic server metrics:
- Configurable server count, time range, and sampling interval
- Generates data for multiple server zones, environments, and service types
- Creates time-series data with random but realistic metric values
- Used to populate empty database on first run (main.py:45)

### API Endpoints

**Data APIs:**
- `GET /api/data` - Full format data (routes.py:34)
- `GET /api/data/compact` - Compact JSON format (routes.py:52)
- `GET /api/data/filtered` - Filtered data with query params (routes.py:85)
- `GET /api/metadata` - Table schema metadata (routes.py:137)

**Layout APIs:**
- `GET /api/layout` - Load specific layout (routes.py:164)
- `POST /api/layout` - Save layout configuration (routes.py:182)
- `GET /api/layouts` - Get all layouts for dashboard (routes.py:213)
- `GET /api/dashboards` - List all dashboards (routes.py:228)
- `DELETE /api/layout` - Delete layout (routes.py:241)
- `POST /api/layout/duplicate` - Duplicate layout (routes.py:262)

Query parameters for layout endpoints:
- `dashboard_id` - Dashboard identifier (default: 'default')
- `name` - Layout name (default: 'default')

### Compact Data Format

The application uses a compact JSON format (models.py:14-19) to reduce API response size:
- Headers ('h') contains column names once
- Data ('d') contains rows as arrays
- Metadata ('m') contains additional information
- Reduces JSON size by eliminating repeated key names

### Layout Configuration Structure

Layout configs are stored as JSONB with this structure:
- `panels[]` - Array of panel configurations
- `timestamp` - Last modification timestamp
- `version` - Configuration version
- `dashboard_id` - Parent dashboard ID
- `name` - Layout name

Each panel contains:
- `id` - Unique panel identifier
- `type` - Panel type (chart, table)
- `size` - Grid size (e.g., "5x5")
- `position` - Grid position {x, y}
- `config` - Panel-specific configuration (dimensions, measures, display settings)

### Database Connection Pooling

DatabaseManager uses asyncpg connection pooling (database.py:17-22):
- Min size: 1 connection
- Max size: 10 connections
- Command timeout: 60 seconds

### Data Filtering

The `get_filtered_data()` method (database.py:300) supports dynamic filtering:
- Accepts arbitrary column filters via dictionary
- Supports both single values and IN clauses for lists
- Dynamically constructs WHERE clauses with parameterized queries
- Used by `/api/data/filtered` endpoint (routes.py:85-134)

## Key Implementation Details

### Initial Data Population

On first run, the application generates and inserts initial data (main.py:38-55):
- Checks if server_metrics table is empty
- Generates 3000 servers × 7 days × 4 samples/day = ~84,000 records
- Falls back to smaller dataset (50 servers × 3 days) if table creation needed
- Uses bulk insert for performance

### Security Note

The database password in data_manager/data_manager.py:13 is hardcoded and should be moved to environment variables for production use.

### Layout Validation

LayoutManager validates configurations before saving (layout_manager.py:160-166):
- Required fields: panels, timestamp, version
- Validation occurs in POST /api/layout endpoint (routes.py:190-194)

### Async/Await Architecture

The entire application is async:
- Uses aiohttp for async web framework
- asyncpg for async PostgreSQL operations
- All database operations are awaited
- Application initialization is async (main.py:14)
