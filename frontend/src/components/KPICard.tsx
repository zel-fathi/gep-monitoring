interface KPICardProps {
  title: string
  value: number | string
  unit?: string
  color?: string
}

const KPICard = ({ title, value, unit, color = '#667eea' }: KPICardProps) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      // Format large numbers with commas
      if (val >= 1000) {
        return val.toLocaleString('en-US', { 
          maximumFractionDigits: 1 
        })
      }
      // Round to 1 decimal place for smaller numbers
      return val.toFixed(1)
    }
    return String(val)
  }

  return (
    <div className="kpi-card" style={{ borderLeftColor: color }}>
      <div className="kpi-title">
        {title}
      </div>
      <div className="kpi-value">
        {formatValue(value)}
        {unit && <span className="kpi-unit"> {unit}</span>}
      </div>
    </div>
  )
}

export default KPICard
