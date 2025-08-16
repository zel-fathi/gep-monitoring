# 🔧 Microgrid Energy Monitoring App

A complete full-stack application for monitoring microgrid energy consumption with real-time dashboards, data analytics, and comprehensive export capabilities.

## 🎯 Features

-- **Real-time Energy Monitoring**: Track energy consumption with interactive dashboards featuring both a line chart (time series) and a daily summary bar chart
- **JWT Authentication**: Secure login system with admin/user roles
- **Data Management**: CSV upload, bulk data ingestion, and export capabilities
- **Analytics & Reporting**: KPI cards, time-series and daily aggregate charts, PDF report generation and rich Markdown/CSV exports
- **Docker Orchestration**: Complete containerized setup with PostgreSQL, pgAdmin, Express, and Nginx
- **Modern Tech Stack**: React 18, Express 4, PostgreSQL 15, Nginx reverse proxy

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- WSL/Ubuntu environment (tested)
- Git

### One-Command Startup

```bash
# Clone the repository
git clone <repository-url>
cd microgrid-energy-monitoring

# Make startup script executable (if needed)
chmod +x start.sh

# Start all services
./start.sh
```

The startup script will:
1. Create `.env` from `.env.example` if it doesn't exist
2. Stop any existing services
3. Build and start all Docker containers
4. Display access URLs

### 🌐 Access Points

Once started, you can access:

- **Frontend Dashboard**: http://localhost/
- **pgAdmin Database UI**: http://localhost:5050
- **API Base**: http://localhost/api
- **OpenAPI Specification (YAML)**: http://localhost/api/openapi.yaml
- **Swagger UI**: http://localhost/api/docs

### 🔑 Default Credentials

- **Application Login**: `admin` / `admin123`
- **pgAdmin**: `admin@example.com` / `admin123`
- **Database**: `app` / `app` (for direct connections)

## 📁 Project Structure

```
.
├── docker-compose.yml          # Container orchestration
├── start.sh                   # One-command startup script
├── .env.example               # Environment variables template
├── README.md                  # This file
├── db/
│   └── init/
│       ├── 001_init.sql       # Database schema
│       └── 002_extras.sql     # Additional constraints
├── data/
│   └── energy_sample.csv      # Sample dataset (96 hours)
├── nginx/
│   ├── Dockerfile             # Multi-stage build (React + Nginx)
│   └── default.conf           # Nginx configuration
├── backend/
│   ├── Dockerfile             # Express backend container
│   ├── package.json           # Node.js dependencies
│   └── src/
│       ├── server.js          # Main Express server
│       ├── db.js              # PostgreSQL connection
│       ├── auth.js            # JWT authentication
│       ├── routes/            # API route handlers
│       └── utils/             # Utility functions
└── frontend/
    ├── index.html             # React app entry point
    ├── vite.config.ts         # Vite build configuration
    ├── package.json           # Frontend dependencies
    └── src/
        ├── main.tsx           # React entry point
        ├── App.tsx            # Main app with routing
        ├── api.ts             # API client
        ├── styles.css         # Global styles
        ├── pages/             # Page components
        └── components/        # Reusable components
```

## 🔧 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite 7.1.3** for fast development and building
- **Chart.js 4** for data visualization
- **React Router 6** for client-side routing
- **jsPDF 2.x** for PDF report generation

### Backend
- **Express 4.x** REST API server
- **PostgreSQL 15** database with raw SQL queries
- **JWT** authentication with bcrypt password hashing
- **Multer** for file uploads
- **CSV parsing** for data ingestion

### Infrastructure
- **Docker Compose 3.8** for orchestration
- **Nginx Alpine** reverse proxy and static file serving
- **pgAdmin 4** for database administration
- **Node 22 Alpine** for consistent runtime

## 📊 Database Schema

### Users Table
```sql
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### Energy Data Table
```sql
energy_data (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  consumption DOUBLE PRECISION NOT NULL CHECK (consumption >= 0)
)
```

## 🔌 API Endpoints

### Authentication
- `POST /api/token` - Login (username, password) → JWT token

### Health & Info
- `GET /api/health` - Service health check
- `GET /api` - API endpoint documentation

### Energy Data
- `GET /api/data?limit=N` - Get energy data (authenticated)
- `POST /api/data/upload` - Upload CSV data (admin only)

### Metrics & Analytics
- `GET /api/metrics` - Get KPI metrics (authenticated)
- `GET /api/metrics/summary` - Additional summary metrics

### User Management (Admin Only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user

### Export & Reports
- `GET /api/export/data.csv` - Export data as CSV
- `GET /api/export/metrics.csv` - Export metrics as CSV
- `GET /api/export/report.md` - Export Markdown report

### Documentation
- `GET /api/openapi.yaml` - Download the OpenAPI specification in YAML format. Import this into tools like Postman or Stoplight to explore the API.
- `GET /api/docs` - Interactive API documentation powered by Swagger UI. Navigate here to view and test endpoints in the browser.

## 📈 Using the Application

### 1. Login
- Navigate to http://localhost/
- Use default credentials: `admin` / `admin123`
- Admin users have additional upload and user management capabilities

### 2. Dashboard Overview
- **KPI Cards**: Total consumption, average, peak consumption, data points
- **Time Series Chart**: Interactive energy consumption over time
- **Daily Consumption Chart**: Bar chart summarizing total consumption per day for easier trend analysis
- **Export Options**: Download data in various formats

### 3. Data Upload (Admin Only)
- Upload CSV files with format: `timestamp,consumption`
- Timestamps should be in ISO 8601 format (e.g., `2025-08-20T00:00:00Z`)
- System validates data and provides feedback on successful uploads

### 4. Export & Reporting
- **Data CSV**: Raw time-series data export
- **Metrics CSV**: Key performance indicators
- **Markdown Report**: Comprehensive analysis document
- **PDF Report**: Client-side generated report with charts

## 🗄️ Database Management

### Connecting to PostgreSQL
Use pgAdmin at http://localhost:5050 or connect directly:

```bash
# Connection details
Host: localhost
Port: 5432
Database: app_db
Username: app
Password: app
```

### Database Initialization
- Schema creation runs automatically on first startup
- Sample data (96 hours) loads if energy_data table is empty
- Admin user created from environment variables

### Backup & Restore
```bash
# Backup
docker exec -i $(docker-compose ps -q db) pg_dump -U app app_db > backup.sql

# Restore
docker exec -i $(docker-compose ps -q db) psql -U app app_db < backup.sql
```

## 🛠️ Development

### Local Development
```bash
# Start in development mode
docker-compose up --build

# View logs
docker-compose logs -f [service]

# Restart specific service
docker-compose restart [service]
```

### Environment Variables
Copy `.env.example` to `.env` and modify as needed:

```env
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app_db
JWT_SECRET=supersecret_change_me
FIRST_SUPERUSER=admin
FIRST_SUPERUSER_PASSWORD=admin123
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin123
```

### Adding New Features

#### Backend API Route
1. Create route file in `backend/src/routes/`
2. Register in `backend/src/server.js`
3. Add authentication middleware if needed

#### Frontend Component
1. Create component in `frontend/src/components/`
2. Add to appropriate page in `frontend/src/pages/`
3. Update API client in `frontend/src/api.ts` if needed

## 🔍 Troubleshooting

### Common Issues

1. **Services won't start**
   ```bash
   # Clean up and rebuild
   docker-compose down -v
   docker system prune -f
   ./start.sh
   ```

2. **Database connection errors**
   - Check if PostgreSQL container is healthy: `docker-compose ps`
   - Verify environment variables in `.env`

3. **Frontend build failures**
   - Clear node modules: `docker-compose down && docker-compose up --build`
   - Check Docker build context in `nginx/Dockerfile`

4. **Permission errors on start.sh**
   ```bash
   chmod +x start.sh
   ```

5. **API endpoints returning 401**
   - Check JWT token in browser localStorage
   - Verify backend logs: `docker-compose logs backend`

### Service Status
```bash
# Check all services
docker-compose ps

# View service logs
docker-compose logs -f [service-name]

# Restart service
docker-compose restart [service-name]

# Rebuild and restart
docker-compose up -d --build [service-name]
```

### Database Issues
```bash
# Connect to database directly
docker exec -it $(docker-compose ps -q db) psql -U app app_db

# Reset database
docker-compose down -v
docker-compose up -d db
```

## 📝 Notes

- **Database Init**: SQL scripts in `db/init/` run only on first database initialization
- **Sample Data**: Automatically loaded from `data/energy_sample.csv` if table is empty
- **File Uploads**: Stored temporarily during processing, not persisted
- **Authentication**: JWT tokens expire after 60 minutes
- **CORS**: Configured for development; adjust for production deployment

## 🚀 Production Deployment

For production deployment:

1. **Security**: Change all default passwords and JWT secrets
2. **Environment**: Use production-grade environment variables
3. **SSL**: Configure HTTPS termination at load balancer or nginx
4. **Database**: Use managed PostgreSQL service for production
5. **Monitoring**: Add logging and monitoring solutions
6. **Backup**: Implement automated database backup strategy

## 📄 License

This project is provided as-is for demonstration purposes.
