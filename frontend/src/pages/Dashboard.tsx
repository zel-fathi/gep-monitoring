import { useState, useEffect } from 'react'
import { api, getStoredUser, EnergyDataPoint, Metrics } from '../api'
import KPICard from '../components/KPICard'
import TimeSeriesChart from '../components/TimeSeriesChart'
import DailyConsumptionChart from '../components/DailyConsumptionChart'
import ConfirmModal from '../components/ConfirmModal'
import Navbar from '../components/Navbar'
import Pagination from '../components/Pagination'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [energyData, setEnergyData] = useState<EnergyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  // Notification state (for success/error messages)
  const [notification, setNotificationState] = useState<{ message: string; isError: boolean } | null>(null)

  /**
   * Show a notification message for a few seconds.
   * @param message The message to display
   * @param isError Whether the notification represents an error (affects styling)
   */
  const setNotification = (message: string, isError: boolean = false) => {
    setNotificationState({ message, isError })
    // Hide after 3 seconds
    setTimeout(() => setNotificationState(null), 3000)
  }

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  // rowsPerPage determines how many rows are shown on each page of the table
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [deleteRecord, setDeleteRecord] = useState<EnergyDataPoint | null>(null)

  // Filter states
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [limitFilter, setLimitFilter] = useState<string>('100')
  
  const user = getStoredUser()

  // Load dashboard data
  const loadData = async (page: number = 1) => {
    try {
      setLoading(true)
      setError('')

      const limitNum = parseInt(limitFilter)
      const params: any = { limit: limitNum || 100, page }
      if (fromDate) {
        params.from = new Date(fromDate).toISOString()
      }
      if (toDate) {
        params.to = new Date(toDate).toISOString()
      }

      const [metricsData, energyDataResponse] = await Promise.all([
        api.getMetrics(),
        api.getEnergyData(params)
      ])

      setMetrics(metricsData)
      // Reverse to show chronological order (oldest first)
      setEnergyData(energyDataResponse.data.slice().reverse())
      // Reset to first page whenever new data is loaded
      setCurrentPage(1)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters to energy data
  const applyFilters = async () => {
    try {
      setLoading(true)
      setError('')
      const params: any = {
        page: currentPage
      }
      if (fromDate) {
        params.from = new Date(fromDate).toISOString()
      }
      if (toDate) {
        params.to = new Date(toDate).toISOString()
      }
      const limitNum = parseInt(limitFilter)
      if (!isNaN(limitNum)) {
        params.limit = limitNum
      }
      const energyDataResponse = await api.getEnergyData(params)
      setEnergyData(energyDataResponse.data.slice().reverse())
      // Reset to first page when applying filters
      setCurrentPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filtered data')
    } finally {
      setLoading(false)
    }
  }

  // Clear filters and reload default data
  const clearFilters = async () => {
    setFromDate('')
    setToDate('')
    setLimitFilter('100')
    setCurrentPage(1)
    await loadData(1)
  }

  // Edit an energy data record (admin)
  const editDataRecord = async (item: EnergyDataPoint) => {
    try {
      const newTimestamp = prompt('Edit timestamp (ISO 8601)', item.timestamp)
      const newConsumptionStr = prompt('Edit consumption (kWh)', item.consumption.toString())
      if (newTimestamp === null && newConsumptionStr === null) {
        return
      }
      const payload: any = {}
      if (newTimestamp && newTimestamp !== item.timestamp) {
        const iso = new Date(newTimestamp).toISOString()
        payload.timestamp = iso
      }
      if (newConsumptionStr && newConsumptionStr !== item.consumption.toString()) {
        const num = parseFloat(newConsumptionStr)
        if (!isNaN(num)) {
          payload.consumption = num
        }
      }
      if (Object.keys(payload).length === 0) {
        return
      }
      await api.updateEnergyData(item.id, payload)
      // Refresh metrics and data after update
      await applyFilters()
      const metricsData = await api.getMetrics()
      setMetrics(metricsData)
      // setUploadStatus('')
      // Show success notification
      setNotification('Record updated successfully')
    } catch (err) {
      setNotification(err instanceof Error ? err.message : 'Update failed', true)
    }
  }

  // Delete an energy data record (admin)
  const handleDeleteClick = (item: EnergyDataPoint) => {
    setDeleteRecord(item)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteRecord) return
    try {
      await api.deleteEnergyData(deleteRecord.id)
      // Refresh data and metrics
      await applyFilters()
      const metricsData = await api.getMetrics()
      setMetrics(metricsData)
      setShowDeleteConfirm(false)
      setDeleteRecord(null)
      // Show success notification
      setNotification('Record deleted successfully')
    } catch (err) {
      setShowDeleteConfirm(false)
      setDeleteRecord(null)
      setNotification(err instanceof Error ? err.message : 'Delete failed', true)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteRecord(null)
  }


  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <>
      {/* Global Notification */}
      {notification && (
        <div
          className={notification.isError ? 'error-message' : 'success-message'}
          style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 1000 }}
        >
          {notification.message}
        </div>
      )}
      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <Navbar />

      <main className="dashboard-content">
        <div className="container">
          {error && (
            <div className="error-message">
              {error}
              <button 
                onClick={() => loadData()} 
                className="btn btn-small" 
                style={{ marginLeft: '1rem' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* KPI Cards */}
          {metrics && (
            <div className="kpi-grid">
              <KPICard
                title="Total Consumption"
                value={metrics.total_consumption}
                unit="kWh"
                color="#667eea"
              />
              <KPICard
                title="Average Consumption"
                value={metrics.avg_consumption}
                unit="kWh"
                color="#f093fb"
              />
              <KPICard
                title="Peak Consumption"
                value={metrics.peak_consumption}
                unit="kWh"
                color="#4facfe"
              />
              <KPICard
                title="Data Points"
                value={metrics.count_points}
                unit="records"
                color="#43e97b"
              />
            </div>
          )}

          {/* Filter Section */}
          <div className="card filter-section">
            <h2 className="filter-title">Filter Data</h2>
            <div className="filter-form">
              <div className="filter-field">
                <label htmlFor="fromDate">From:</label>
                <input
                  id="fromDate"
                  type="datetime-local"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="toDate">To:</label>
                <input
                  id="toDate"
                  type="datetime-local"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="limitFilter">Limit:</label>
                <input
                  id="limitFilter"
                  type="number"
                  min="1"
                  max="10000"
                  value={limitFilter}
                  onChange={(e) => setLimitFilter(e.target.value)}
                />
              </div>
              <div className="filter-buttons">
                <button onClick={applyFilters} className="btn btn-secondary btn-small">
                  Apply
                </button>
                <button onClick={clearFilters} className="btn btn-secondary btn-small">
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Chart */}
          <TimeSeriesChart
            data={energyData}
            title="Energy Consumption Over Time (Last 7 Days)"
            height={400}
          />

          {/* Additional chart showing daily aggregated consumption */}
          <DailyConsumptionChart
            data={energyData}
            title="Daily Energy Consumption Summary"
            height={300}
          />

          {/* Data management pointer */}
          <div className="card actions-section">
            <h2 className="actions-title">Data Management</h2>
            <p
              style={{ fontSize: '0.95rem', color: '#555' }}
            >
              To upload CSV files, export data or refresh the dataset, please use the{' '}
              <Link to="/actions" className="nav-link-inline">
                Data Management
              </Link>{' '}
              page.
            </p>
          </div>

          {/* Data Table */}
          <div className="card data-section">
            <h2 className="data-title">Energy Data</h2>
            {/* Controls for rows per page */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.875rem', color: '#555' }}>
                Rows per page:{' '}
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setRowsPerPage(isNaN(value) || value <= 0 ? 10 : value)
                    setCurrentPage(1)
                  }}
                  style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#555' }}>
                Total records: {energyData.length}
              </div>
            </div>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Timestamp</th>
                    <th>Consumption (kWh)</th>
                    {user?.is_admin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Compute paginated slice
                    const total = energyData.length
                    const pages = Math.max(1, Math.ceil(total / rowsPerPage))
                    const current = Math.min(currentPage, pages)
                    const startIndex = (current - 1) * rowsPerPage
                    const endIndex = startIndex + rowsPerPage
                    const pageSlice = energyData.slice(startIndex, endIndex)
                    return pageSlice.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{new Date(item.timestamp).toLocaleString()}</td>
                        <td>{item.consumption.toFixed(2)}</td>
                        {user?.is_admin && (
                          <td>
                            <button
                              onClick={() => editDataRecord(item)}
                              className="btn btn-secondary btn-small"
                              style={{ marginRight: '0.5rem' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="btn btn-danger btn-small"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {(() => {
              const total = energyData.length
              const pages = Math.max(1, Math.ceil(total / rowsPerPage))
              if (pages <= 1) return null
              const handleChange = (page: number) => {
                setCurrentPage(page)
                // Do not reload from server when switching client-side pages
              }
              return (
                <Pagination
                  currentPage={Math.min(currentPage, pages)}
                  totalPages={pages}
                  onPageChange={handleChange}
                />
              )
            })()}
          </div>
        </div>
      </main>
    </>
  )
}

export default Dashboard
