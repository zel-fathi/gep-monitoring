const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../auth');
const { recordsToCsv } = require('../utils/csv');
const dayjs = require('dayjs');

const router = express.Router();

/**
 * GET /export/data.csv - full/filtered time-series
 * Query: from, to, limit
 */
router.get('/export/data.csv', authenticateToken, async (req, res) => {
  try {
    const { from, to, limit } = req.query;

    let sql = 'SELECT timestamp, consumption FROM energy_data';
    const params = [];
    const where = [];

    if (from) { where.push(`timestamp >= $${params.length + 1}`); params.push(from); }
    if (to)   { where.push(`timestamp <= $${params.length + 1}`); params.push(to); }

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY timestamp ASC';

    if (limit) {
      const n = parseInt(limit, 10);
      if (n > 0 && n <= 100000) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(n);
      }
    }

    const { rows } = await query(sql, params);
    const csv = recordsToCsv(rows, ['timestamp', 'consumption']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="energy_data_${dayjs().format('YYYYMMDD_HHmm')}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export data CSV error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * GET /export/metrics.csv - KPIs as CSV
 */
router.get('/export/metrics.csv', authenticateToken, async (req, res) => {
  try {
    const sql = `
      WITH agg AS (
        SELECT
          COUNT(*)::bigint                       AS count_points,
          COALESCE(SUM(consumption), 0)::float   AS total_consumption,
          COALESCE(AVG(consumption), 0)::float   AS avg_consumption,
          COALESCE(MAX(consumption), 0)::float   AS peak_consumption,
          COALESCE(MIN(consumption), 0)::float   AS min_consumption
        FROM energy_data
      )
      SELECT
        agg.count_points,
        agg.total_consumption,
        agg.avg_consumption,
        agg.peak_consumption,
        agg.min_consumption,
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
    const m = rows[0] || {
      count_points: 0, total_consumption: 0, avg_consumption: 0,
      peak_consumption: 0, min_consumption: 0, peak_timestamp: null
    };

    const records = [
      { metric: 'Total Consumption (kWh)',  value: Math.round((Number(m.total_consumption) || 0) * 100) / 100 },
      { metric: 'Average Consumption (kWh)',value: Math.round((Number(m.avg_consumption) || 0) * 100) / 100 },
      { metric: 'Peak Consumption (kWh)',   value: Math.round((Number(m.peak_consumption) || 0) * 100) / 100 },
      { metric: 'Minimum Consumption (kWh)',value: Math.round((Number(m.min_consumption) || 0) * 100) / 100 },
      { metric: 'Peak Timestamp',           value: m.peak_timestamp || 'N/A' },
      { metric: 'Total Data Points',        value: Number(m.count_points) || 0 }
    ];

    const csv = recordsToCsv(records, ['metric', 'value']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="energy_metrics_${dayjs().format('YYYYMMDD_HHmm')}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export metrics CSV error:', err);
    res.status(500).json({ error: 'Failed to export metrics' });
  }
});

/**
 * GET /export/report.md - Markdown report
 */
router.get('/export/report.md', authenticateToken, async (req, res) => {
  try {
    const sql = `
      WITH agg AS (
        SELECT
          COUNT(*)::bigint                       AS count_points,
          COALESCE(SUM(consumption), 0)::float   AS total_consumption,
          COALESCE(AVG(consumption), 0)::float   AS avg_consumption,
          COALESCE(MAX(consumption), 0)::float   AS peak_consumption,
          COALESCE(MIN(consumption), 0)::float   AS min_consumption
        FROM energy_data
      ),
      bounds AS (
        SELECT MIN(timestamp) AS earliest_timestamp,
               MAX(timestamp) AS latest_timestamp
        FROM energy_data
      ),
      peak AS (
        SELECT timestamp AS peak_timestamp
        FROM energy_data
        ORDER BY consumption DESC, timestamp DESC
        LIMIT 1
      )
      SELECT
        agg.count_points,
        agg.total_consumption,
        agg.avg_consumption,
        agg.peak_consumption,
        agg.min_consumption,
        bounds.earliest_timestamp,
        bounds.latest_timestamp,
        peak.peak_timestamp
      FROM agg
      LEFT JOIN bounds ON TRUE
      LEFT JOIN peak   ON TRUE;
    `;
    const { rows } = await query(sql);
    const m = rows[0] || {};

    const reportDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const dataStart  = m.earliest_timestamp ? dayjs(m.earliest_timestamp).format('YYYY-MM-DD HH:mm') : 'N/A';
    const dataEnd    = m.latest_timestamp   ? dayjs(m.latest_timestamp).format('YYYY-MM-DD HH:mm')   : 'N/A';

    const md = `# Microgrid Energy Monitoring Report

**Generated:** ${reportDate}  
**Data Period:** ${dataStart} to ${dataEnd}

## Key Performance Indicators

| Metric | Value |
|--------|-------|
| **Total Consumption** | ${Math.round((Number(m.total_consumption) || 0) * 100) / 100} kWh |
| **Average Consumption** | ${Math.round((Number(m.avg_consumption) || 0) * 100) / 100} kWh |
| **Peak Consumption** | ${Math.round((Number(m.peak_consumption) || 0) * 100) / 100} kWh |
| **Minimum Consumption** | ${Math.round((Number(m.min_consumption) || 0) * 100) / 100} kWh |
| **Peak Occurred At** | ${m.peak_timestamp ? dayjs(m.peak_timestamp).format('YYYY-MM-DD HH:mm:ss') : 'N/A'} |
| **Total Data Points** | ${Number(m.count_points) || 0} |

## Summary

${
  Number(m.count_points) > 0
    ? `The system recorded ${Number(m.count_points)} data points. Average consumption was ${Math.round((Number(m.avg_consumption) || 0) * 100) / 100} kWh, with a peak of ${Math.round((Number(m.peak_consumption) || 0) * 100) / 100} kWh at ${m.peak_timestamp ? dayjs(m.peak_timestamp).format('YYYY-MM-DD HH:mm') : 'unknown time'}. Total energy consumed: ${Math.round((Number(m.total_consumption) || 0) * 100) / 100} kWh.`
    : 'No energy data available for the reporting period.'
}

---
*Report generated by Microgrid Energy Monitoring System*
`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="energy_report_${dayjs().format('YYYYMMDD_HHmm')}.md"`);
    res.send(md);
  } catch (err) {
    console.error('Export report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
