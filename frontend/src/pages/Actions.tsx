import { useRef, useState } from 'react'
import jsPDF from 'jspdf'
import Navbar from '../components/Navbar'
import { api, getStoredUser } from '../api'

/**
 * Actions page
 *
 * This page consolidates all of the data management actions (upload,
 * export and refresh) in one place, separate from the dashboard. The
 * UI is similar to the actions section previously embedded inside
 * Dashboard, but moved here to improve separation of concerns. The
 * page also provides basic feedback via notifications and status
 * messages.
 */
const Actions = () => {
  const user = getStoredUser()

  // Notification state (for success/error messages)
  const [notification, setNotification] = useState<{
    message: string
    isError: boolean
  } | null>(null)

  /**
   * Show a notification message for a few seconds.
   * @param message The message to display
   * @param isError Whether the notification represents an error (affects styling)
   */
  const showNotification = (message: string, isError: boolean = false) => {
    setNotification({ message, isError })
    setTimeout(() => setNotification(null), 3000)
  }

  // File upload status & loading flag
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [uploadLoading, setUploadLoading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle CSV file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setUploadStatus('Please select a CSV file')
      return
    }

    try {
      setUploadLoading(true)
      setUploadStatus('')

      const result = await api.uploadCsv(file)
      setUploadStatus(
        `✅ Success: ${result.records_inserted} records inserted from ${result.records_processed} processed`
      )
      // Show success notification
      showNotification('CSV uploaded successfully')
    } catch (err) {
      setUploadStatus(
        `❌ Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
      showNotification(
        err instanceof Error ? err.message : 'Upload failed',
        true
      )
    } finally {
      setUploadLoading(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Generate PDF report (metrics only, chart image may not be available here)
  const generatePdfReport = async () => {
    try {
      const metrics = await api.getMetrics()
      if (!metrics) {
        alert('No data available for PDF generation')
        return
      }
      const pdf = new jsPDF()
      // const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 20
      // Title
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Microgrid Energy Monitoring Report', margin, 30)
      // Date
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      const reportDate = new Date().toLocaleString()
      pdf.text(`Generated: ${reportDate}`, margin, 45)
      // KPIs section
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Key Performance Indicators', margin, 65)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      let yPos = 80
      const kpis = [
        ['Total Consumption:', `${metrics.total_consumption.toFixed(1)} kWh`],
        ['Average Consumption:', `${metrics.avg_consumption.toFixed(1)} kWh`],
        ['Peak Consumption:', `${metrics.peak_consumption.toFixed(1)} kWh`],
        [
          'Peak Occurred At:',
          metrics.peak_timestamp
            ? new Date(metrics.peak_timestamp).toLocaleString()
            : 'N/A',
        ],
        ['Total Data Points:', metrics.count_points.toString()],
      ]
      kpis.forEach(([label, value]) => {
        pdf.text(label, margin, yPos)
        pdf.text(value, margin + 80, yPos)
        yPos += 15
      })
      // Save PDF
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:]/g, '')
      pdf.save(`energy_report_${timestamp}.pdf`)
      showNotification('PDF report generated successfully')
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF report')
    }
  }

  // Handle data refresh (call metrics endpoint as a simple refresh)
  const refreshData = async () => {
    try {
      await api.getMetrics()
      showNotification('Data refreshed successfully')
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Refresh failed',
        true
      )
    }
  }

  return (
    <>
      {notification && (
        <div
          className={
            notification.isError ? 'error-message' : 'success-message'
          }
          style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 1000 }}
        >
          {notification.message}
        </div>
      )}
      <Navbar />
      <main className="dashboard-content">
        <div className="container">
          <div className="card actions-section">
            <h2 className="actions-title">Data Management</h2>
            <div className="actions-grid">
              {/* CSV Upload (Admin Only) */}
              {user?.is_admin && (
                <div className="action-group">
                  <h3>📤 Data Upload</h3>
                  <div className="file-upload">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="file-input"
                      disabled={uploadLoading}
                    />
                  </div>
                  {uploadLoading && (
                    <div className="loading">
                      <div className="spinner"></div>
                    </div>
                  )}
                  {uploadStatus && (
                    <div
                      className={
                        uploadStatus.includes('❌')
                          ? 'error-message'
                          : 'success-message'
                      }
                    >
                      {uploadStatus}
                    </div>
                  )}
                  <p
                    style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}
                  >
                    Upload CSV with columns: timestamp, consumption
                  </p>
                </div>
              )}
              {/* Export Options */}
              <div className="action-group">
                <h3>📊 Export Data</h3>
                <div className="button-group">
                  <button
                    onClick={() => api.downloadDataCsv()}
                    className="btn btn-secondary btn-small"
                  >
                    📄 Data CSV
                  </button>
                    
                  <button
                    onClick={() => api.downloadMetricsCsv()}
                    className="btn btn-secondary btn-small"
                  >
                    📈 Metrics CSV
                  </button>
                  <button
                    onClick={() => api.downloadReport()}
                    className="btn btn-secondary btn-small"
                  >
                    📝 Markdown Report
                  </button>
                  <button
                    onClick={generatePdfReport}
                    className="btn btn-primary btn-small"
                  >
                    📄 PDF Report
                  </button>
                </div>
              </div>
              {/* Refresh Data */}
              <div className="action-group">
                <h3>🔄 Refresh</h3>
                <button
                  onClick={refreshData}
                  className="btn btn-secondary btn-small"
                  disabled={uploadLoading}
                >
                  Refresh Data
                </button>
                <p
                  style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}
                >
                  Reload dashboard data metrics
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default Actions