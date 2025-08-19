const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../auth');

const router = express.Router();

/**
 * GET /metrics - KPIs
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const sql = `
      WITH agg AS (
        SELECT
          COUNT(*)::bigint                       AS count_points,
          COALESCE(SUM(consumption), 0)::float   AS total_consumption,
          COALESCE(AVG(consumption), 0)::float   AS avg_consumption,
          COALESCE(MAX(consumption), 0)::float   AS peak_consumption
        FROM energy_data
      )
      SELECT
        agg.count_points,
        agg.total_consumption,
        agg.avg_consumption,
        agg.peak_consumption,
        peak.peak_timestamp
      FROM agg
      LEFT JOIN LATERAL (
        SELECT timestamp AS peak_timestamp
        FROM energy_data
        ORDER BY consumption DESC, timestamp DESC
        LIMIT 1
      ) peak ON TRUE;
    `;

    const { rows } = await query(sql);
    const r = rows[0] || {
      count_points: 0,
      total_consumption: 0,
      avg_consumption: 0,
      peak_consumption: 0,
      peak_timestamp: null
    };

    const response = {
      count_points: Number(r.count_points) || 0,
      total_consumption: Math.round((Number(r.total_consumption) || 0) * 100) / 100,
      avg_consumption: Math.round((Number(r.avg_consumption) || 0) * 100) / 100,
      peak_consumption: Math.round((Number(r.peak_consumption) || 0) * 100) / 100,
      peak_timestamp: r.peak_timestamp || null
    };

    res.json(response);
  } catch (err) {
    console.error('Get metrics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /metrics/summary - extra bounds/dispersion
 */
router.get('/metrics/summary', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        MIN(timestamp)                         AS earliest_timestamp,
        MAX(timestamp)                         AS latest_timestamp,
        COALESCE(MIN(consumption), 0)::float   AS min_consumption,
        COALESCE(MAX(consumption), 0)::float   AS max_consumption,
        COALESCE(STDDEV(consumption), 0)::float AS consumption_stddev,
        COUNT(DISTINCT DATE(timestamp))::int   AS days_of_data
      FROM energy_data;
    `;
    const { rows } = await query(sql);
    const r = rows[0] || {};

    res.json({
      earliest_timestamp: r.earliest_timestamp || null,
      latest_timestamp: r.latest_timestamp || null,
      min_consumption: Number(r.min_consumption) || 0,
      max_consumption: Number(r.max_consumption) || 0,
      consumption_stddev: Math.round((Number(r.consumption_stddev) || 0) * 100) / 100,
      days_of_data: Number(r.days_of_data) || 0
    });
  } catch (err) {
    console.error('Get summary metrics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
