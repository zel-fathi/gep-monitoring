const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

/**
 * Parse CSV file and return array of records
 */
const parseCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const records = [];
    
    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (data) => {
        // Parse timestamp and consumption
        const timestamp = dayjs.utc(data.timestamp).toISOString();
        const consumption = parseFloat(data.consumption);
        
        if (isNaN(consumption)) {
          console.warn(`⚠️ Invalid consumption value: ${data.consumption}`);
          return;
        }
        
        records.push({ timestamp, consumption });
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(records);
      });
  });
};

/**
 * Convert records to CSV string
 */
const recordsToCsv = (records, headers) => {
  const csvHeaders = headers.join(',');
  const csvRows = records.map(record => 
    headers.map(header => {
      const value = record[header];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

module.exports = {
  parseCsv,
  recordsToCsv,
};
