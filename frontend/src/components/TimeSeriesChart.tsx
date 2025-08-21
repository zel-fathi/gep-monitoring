import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { EnergyDataPoint } from '../api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

interface TimeSeriesChartProps {
  data: EnergyDataPoint[]
  title?: string
  height?: number
}

const TimeSeriesChart = ({ data, title = 'Energy Consumption Over Time', height = 400 }: TimeSeriesChartProps) => {
  const chartRef = useRef<any>(null)

  // Prepare chart data
  const chartData = {
    labels: data.map(point => new Date(point.timestamp)),
    datasets: [
      {
        label: 'Energy Consumption (kWh)',
        data: data.map(point => point.consumption),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#667eea',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#667eea',
        borderWidth: 1,
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex
            const timestamp = data[index]?.timestamp
            if (timestamp) {
              const date = new Date(timestamp)
              return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            }
            return ''
          },
          label: (context: any) => {
            return `Consumption: ${context.parsed.y.toFixed(1)} kWh`
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'MMM dd HH:mm',
            day: 'MMM dd',
          },
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Energy Consumption (kWh)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 5,
      },
    },
  }

  // Function to get chart instance for PDF generation
  const getChartImage = (): string | null => {
    try {
      if (chartRef.current && chartRef.current.toBase64Image) {
        return chartRef.current.toBase64Image()
      }
    } catch (error) {
      console.warn('Could not get chart image:', error)
    }
    return null
  }

  // Expose chart image function to parent component
  useEffect(() => {
    // Store reference for PDF generation
    (window as any).getChartImage = getChartImage
  }, [])

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div style={{ 
          height: height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#666',
          fontSize: '1.1rem'
        }}>
          No data available to display
        </div>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div style={{ height: height }}>
        <Line
          ref={(ref) => { chartRef.current = ref }}
          data={chartData}
          options={options}
        />
      </div>
    </div>
  )
}

export default TimeSeriesChart
