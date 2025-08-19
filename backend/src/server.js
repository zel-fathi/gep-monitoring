const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { query } = require('./db');
const { hashPassword } = require('./utils/hash');
const { parseCsv } = require('./utils/csv');

// Import routes
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const dataRoutes = require('./routes/data.routes');
const metricsRoutes = require('./routes/metrics.routes');
const exportRoutes = require('./routes/export.routes');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api', authRoutes);
app.use('/api', usersRoutes);
app.use('/api', dataRoutes);
app.use('/api', metricsRoutes);
app.use('/api', exportRoutes);

/**
 * Serve OpenAPI specification
 */
app.get('/api/openapi.json', (req, res) => {
  // Build a minimal OpenAPI spec. This is static but could be generated dynamically if needed.
  const openapiSpec = {
    openapi: '3.0.1',
    info: {
      title: 'Microgrid Energy Monitoring API',
      version: '1.0.0',
      description: 'API specification for the energy monitoring backend'
    },
    servers: [
      { url: '/api', description: 'Relative API base' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/token': {
        post: {
          summary: 'Login and obtain JWT token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                  },
                  required: ['username', 'password']
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Successful login',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      access_token: { type: 'string' },
                      token_type: { type: 'string' },
                      expires_in: { type: 'integer' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          username: { type: 'string' },
                          is_admin: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/health': {
        get: {
          summary: 'Health check',
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      timestamp: { type: 'string' },
                      version: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/users': {
        get: {
          summary: 'List all users',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'List of users'
            }
          }
        },
        post: {
          summary: 'Create a new user',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    is_admin: { type: 'boolean' }
                  },
                  required: ['username', 'password']
                }
              }
            }
          },
          responses: {
            201: { description: 'User created' }
          }
        }
      },
      '/users/{id}': {
        get: {
          summary: 'Get user by ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'User details' },
            404: { description: 'User not found' }
          }
        },
        put: {
          summary: 'Update user',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    is_admin: { type: 'boolean' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'User updated' },
            404: { description: 'User not found' }
          }
        },
        delete: {
          summary: 'Delete user',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'User deleted' },
            404: { description: 'User not found' }
          }
        }
      },
      '/data': {
        get: {
          summary: 'Get energy data',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'List of energy data' }
          }
        }
      },
      '/data/upload': {
        post: {
          summary: 'Upload energy data CSV',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Upload success' }
          }
        }
      },
      '/data/{id}': {
        get: {
          summary: 'Get energy data by ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Energy data record' },
            404: { description: 'Data not found' }
          }
        },
        put: {
          summary: 'Update energy data record',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    consumption: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Energy data updated' },
            404: { description: 'Data not found' }
          }
        },
        delete: {
          summary: 'Delete energy data record',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Energy data deleted' },
            404: { description: 'Data not found' }
          }
        }
      },
      '/metrics': {
        get: {
          summary: 'Get energy KPIs',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'KPIs' }
          }
        }
      },
      '/metrics/summary': {
        get: {
          summary: 'Get energy summary metrics',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Summary metrics' }
          }
        }
      },
      '/export/data.csv': {
        get: {
          summary: 'Export energy data CSV',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'CSV file' }
          }
        }
      },
      '/export/metrics.csv': {
        get: {
          summary: 'Export metrics CSV',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'CSV file' }
          }
        }
      },
      '/export/report.md': {
        get: {
          summary: 'Export markdown report',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Markdown file' }
          }
        }
      }
    }
  };
  res.json(openapiSpec);
});

/**
 * Serve Swagger UI for API docs.
 * This endpoint returns an HTML page that loads Swagger UI from a CDN and points it to /api/openapi.json.
 */
app.get('/api/docs', (req, res) => {
  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>API Documentation</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js"></script>
    <script>
      window.onload = function() {
        SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.SwaggerUIStandalonePreset
          ],
          layout: 'BaseLayout',
          docExpansion: 'none'
        });
      };
    </script>
  </body>
</html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Serve the OpenAPI specification in YAML format. The specification file
// lives in the project root (backend/openapi.yaml) and can be consumed by
// documentation tools or API clients. If the file cannot be read, a 500
// status code will be returned.
app.get('/api/openapi.yaml', (req, res) => {
  const specPath = path.join(__dirname, '..', 'openapi.yaml');
  fs.readFile(specPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read OpenAPI file:', err);
      return res.status(500).send('Failed to read OpenAPI specification');
    }
    res.setHeader('Content-Type', 'text/yaml');
    res.send(data);
  });
});

// API endpoints list (simple OpenAPI-ish JSON)
app.get('/api', (req, res) => {
  res.json({
    title: 'Microgrid Energy Monitoring API',
    version: '1.0.0',
    description: 'Express backend for energy monitoring dashboard',
    endpoints: {
      'POST /api/token': 'OAuth-like login (username, password) → JWT',
      'GET /api/health': 'Health check',
      'GET /api/users': 'List users (admin only)',
      'POST /api/users': 'Create user (admin only)',
      'GET /api/users/{id}': 'Get user by ID (admin only)',
      'PUT /api/users/{id}': 'Update user (admin only)',
      'DELETE /api/users/{id}': 'Delete user (admin only)',
      'GET /api/data': 'Get energy data with optional limit and date filters',
      'POST /api/data/upload': 'Upload CSV data (admin only)',
      'GET /api/data/{id}': 'Get single data record',
      'PUT /api/data/{id}': 'Update data record (admin only)',
      'DELETE /api/data/{id}': 'Delete data record (admin only)',
      'GET /api/metrics': 'Get energy consumption KPIs',
      'GET /api/metrics/summary': 'Get additional summary metrics',
      'GET /api/export/data.csv': 'Export data as CSV',
      'GET /api/export/metrics.csv': 'Export metrics as CSV',
      'GET /api/export/report.md': 'Export comprehensive Markdown report',
      'GET /api/openapi.json': 'OpenAPI specification (JSON)',
      'GET /api/docs': 'Swagger UI documentation'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

/**
 * Initialize database and seed data
 */
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');

    // Seed admin user if it doesn't exist
    const adminUser = process.env.FIRST_SUPERUSER || 'admin';
    const adminPassword = process.env.FIRST_SUPERUSER_PASSWORD || 'admin123';

    const existingAdmin = await query('SELECT id FROM users WHERE username = $1', [adminUser]);
    
    if (existingAdmin.rows.length === 0) {
      console.log(`👤 Creating admin user: ${adminUser}`);
      const passwordHash = await hashPassword(adminPassword);
      
      await query(
        'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3)',
        [adminUser, passwordHash, true]
      );
      
      console.log('✅ Admin user created successfully');
    } else {
      console.log('👤 Admin user already exists');
    }

    // Load sample data if energy_data table is empty
    const energyDataCount = await query('SELECT COUNT(*) FROM energy_data');
    const dataCount = parseInt(energyDataCount.rows[0].count);
    
    if (dataCount === 0) {
      const sampleDataPath = '/data/energy_sample.csv';
      
      if (fs.existsSync(sampleDataPath)) {
        console.log('📊 Loading sample energy data...');
        
        try {
          const records = await parseCsv(sampleDataPath);
          
          if (records.length > 0) {
            // Insert records in batches
            const batchSize = 1000;
            let totalInserted = 0;
            
            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize);
              
              const values = [];
              const placeholders = [];
              
              batch.forEach((record, index) => {
                const baseIndex = index * 2;
                placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2})`);
                values.push(record.timestamp, record.consumption);
              });
              
              const insertQuery = `
                INSERT INTO energy_data (timestamp, consumption) 
                VALUES ${placeholders.join(', ')}
              `;
              
              const result = await query(insertQuery, values);
              totalInserted += result.rowCount;
            }
            
            console.log(`✅ Loaded ${totalInserted} sample energy records`);
          }
        } catch (csvErr) {
          console.error('❌ Failed to load sample data:', csvErr.message);
        }
      } else {
        console.log('⚠️ Sample data file not found at /data/energy_sample.csv');
      }
    } else {
      console.log(`📊 Energy data already exists (${dataCount} records)`);
    }

    console.log('✅ Database initialization complete');

  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
    
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
