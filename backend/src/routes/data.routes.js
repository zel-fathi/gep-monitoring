const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const { authenticateToken, requireAdmin } = require('../auth');
const { parseCsv } = require('../utils/csv');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * GET /data - Get energy data with optional limit
 * Query params: limit (default: 100)
 */
router.get('/data', authenticateToken, async (req, res) => {
  try {
    // Support filtering by from/to (ISO 8601 strings), limit and page
    const { from, to } = req.query;
    let limit = parseInt(req.query.limit);
    let page = parseInt(req.query.page);

    // Default limit and page if not provided
    if (!limit || isNaN(limit)) {
      limit = 100;
    }
    if (!page || isNaN(page) || page < 1) {
      page = 1;
    }

    // Enforce limit bounds
    if (limit < 1 || limit > 10000) {
      return res.status(400).json({ error: 'Limit must be between 1 and 10000' });
    }

    let baseSql = 'FROM energy_data';
    const params = [];
    const conditions = [];

    // Append date range filters if provided
    if (from) {
      conditions.push(`timestamp >= $${params.length + 1}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`timestamp <= $${params.length + 1}`);
      params.push(to);
    }

    if (conditions.length > 0) {
      baseSql += ' WHERE ' + conditions.join(' AND ');
    }

    // Compute total count for pagination
    const countResult = await query(`SELECT COUNT(*) ${baseSql}`, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build final query with ordering, limit and offset
    const dataSql = `SELECT id, timestamp, consumption ${baseSql} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataParams = [...params, limit, offset];

    const result = await query(dataSql, dataParams);

    // Compute total pages
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      data: result.rows,
      count: result.rows.length,
      limit: limit,
      page: page,
      total: totalCount,
      totalPages: totalPages
    });
  } catch (err) {
    console.error('Get data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /data/upload - Upload CSV file with energy data (admin only)
 * Expects: multipart/form-data with 'file' field
 */
router.post('/data/upload', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    tempFilePath = req.file.path;
    
    // Parse CSV file
    const records = await parseCsv(tempFilePath);
    
    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid records found in CSV' });
    }

    // Insert records in batches
    const batchSize = 1000;
    let insertedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Build parameterized query for batch insert
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
        ON CONFLICT DO NOTHING
      `;
      
      const result = await query(insertQuery, values);
      insertedCount += result.rowCount;
    }

    res.json({
      message: 'Data uploaded successfully',
      records_processed: records.length,
      records_inserted: insertedCount
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.error('Failed to cleanup temp file:', cleanupErr);
      }
    }
  }
});

/**
 * GET /data/:id - Get single energy data record
 */
router.get('/data/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const result = await query(
      'SELECT id, timestamp, consumption FROM energy_data WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get single data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /data/:id - Update an energy data record (admin only)
 * Expects: { timestamp?, consumption? }
 */
router.put('/data/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const { timestamp, consumption } = req.body;
    // Validate at least one field
    if (timestamp === undefined && consumption === undefined) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const fields = [];
    const params = [];
    let idx = 1;
    if (timestamp !== undefined) {
      fields.push(`timestamp = $${idx++}`);
      params.push(timestamp);
    }
    if (consumption !== undefined) {
      fields.push(`consumption = $${idx++}`);
      params.push(consumption);
    }
    params.push(id);

    const updateQuery = `
      UPDATE energy_data
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, timestamp, consumption
    `;
    const result = await query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data not found' });
    }
    res.json({
      message: 'Data updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Update data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /data/:id - Delete an energy data record (admin only)
 */
router.delete('/data/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const result = await query(
      'DELETE FROM energy_data WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data not found' });
    }
    res.json({ message: 'Data deleted successfully', id });
  } catch (err) {
    console.error('Delete data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
