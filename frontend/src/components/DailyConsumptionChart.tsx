// import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { EnergyDataPoint } from '../api';

// Register required Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Bar chart that aggregates energy consumption by day. Each bar represents
 * the total energy consumption for a given date. The input data is expected
 * to be a list of individual readings with timestamps and consumption values.
 */
interface DailyConsumptionChartProps {
  /**
   * Array of energy data points containing timestamps and consumption values.
   */
  data: EnergyDataPoint[];
  /**
   * Chart title. Defaults to "Daily Energy Consumption".
   */
  title?: string;
  /**
   * Height of the chart container in pixels. Defaults to 300.
   */
  height?: number;
}

const DailyConsumptionChart = ({ data, title = 'Daily Energy Consumption', height = 300 }: DailyConsumptionChartProps) => {
  // Aggregate data by calendar day (YYYY-MM-DD) and sum consumption
  const dailyTotals: Record<string, number> = {};
  data.forEach((point) => {
    const dateKey = new Date(point.timestamp).toISOString().split('T')[0];
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + point.consumption;
  });
  // Sort dates chronologically
  const sortedDates = Object.keys(dailyTotals).sort();
  // Prepare labels and data for the bar chart
  const chartData = {
    labels: sortedDates.map((dateStr) => {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Total Consumption (kWh)',
        data: sortedDates.map((d) => Number(dailyTotals[d].toFixed(2))),
        backgroundColor: '#43e97b',
        borderColor: '#43e97b',
        borderWidth: 1,
      },
    ],
  };
  // Chart configuration options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: { bottom: 20 },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Total: ${context.parsed.y.toFixed(1)} kWh`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          font: { size: 12, weight: 'bold' as const },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Consumption (kWh)',
          font: { size: 12, weight: 'bold' as const },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  // Show an empty state when there's no data
  if (sortedDates.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div
          style={{
            height: height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '1.1rem',
          }}
        >
          No data available to display
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div style={{ height: height }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default DailyConsumptionChart;