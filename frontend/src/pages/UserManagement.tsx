import { useState, useEffect, FormEvent } from 'react'
import Navbar from '../components/Navbar'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import { api, getStoredUser, User } from '../api'

/**
 * Admin user management page.
 *
 * This page allows an administrator to view the list of users, create new users
 * and delete existing users. Only admins can access this page; non‑admin
 * users are redirected to the dashboard.
 */
const UserManagement = () => {
  const user = getStoredUser()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [notification, setNotification] = useState<{
    message: string
    isError: boolean
  } | null>(null)

  const [newUser, setNewUser] = useState<{ username: string; password: string; is_admin: boolean }>(
    {
      username: '',
      password: '',
      is_admin: false,
    },
  )

  // Pagination state for users table
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  // Delete confirmation state
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)

  useEffect(() => {
    if (user?.is_admin) {
      loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Fetch the list of users from the API.
   */
  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.getUsers()
      // The API returns { users, total }
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Show a notification message for a few seconds.
   */
  const showNotification = (message: string, isError: boolean = false) => {
    setNotification({ message, isError })
    setTimeout(() => setNotification(null), 3000)
  }

  /**
   * Handle form submission to create a new user.
   */
  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (!newUser.username || !newUser.password) {
        showNotification('Username and password are required', true)
        return
      }
      await api.createUser({
        username: newUser.username,
        password: newUser.password,
        is_admin: newUser.is_admin,
      })
      setNewUser({ username: '', password: '', is_admin: false })
      showNotification('User created successfully')
      await loadUsers()
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Failed to create user',
        true,
      )
    }
  }

  /**
   * Prompt delete confirmation for a specific user.
   */
  const handleDeleteClick = (u: User) => {
    setDeleteUser(u)
    setShowDeleteConfirm(true)
  }

  /**
   * Confirm deletion of a user.
   */
  const confirmDelete = async () => {
    if (!deleteUser) return
    try {
      await api.deleteUser(deleteUser.id)
      setShowDeleteConfirm(false)
      setDeleteUser(null)
      showNotification('User deleted successfully')
      await loadUsers()
    } catch (err) {
      setShowDeleteConfirm(false)
      setDeleteUser(null)
      showNotification(
        err instanceof Error ? err.message : 'Failed to delete user',
        true,
      )
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteUser(null)
  }

  // Redirect non‑admin users to the dashboard
  if (!user?.is_admin) {
    return (
      <>
        <Navbar />
        <main className="dashboard-content">
          <div className="container">
            <div className="error-message" style={{ marginTop: '2rem' }}>
              You do not have permission to access this page.
            </div>
          </div>
        </main>
      </>
    )
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
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <Navbar />
      <main className="dashboard-content">
        <div className="container">
          <div className="card data-section" style={{ marginBottom: '2rem' }}>
            <h2 className="data-title">User Management</h2>
            {error && (
              <div className="error-message">
                {error}
                <button
                  onClick={loadUsers}
                  className="btn btn-small"
                  style={{ marginLeft: '1rem' }}
                >
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : (
              <>
                {/* Controls for user table */}
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
                    Total users: {users.length}
                  </div>
                </div>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Admin?</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const total = users.length
                        const pages = Math.max(1, Math.ceil(total / rowsPerPage))
                        const current = Math.min(currentPage, pages)
                        const start = (current - 1) * rowsPerPage
                        const end = start + rowsPerPage
                        const slice = users.slice(start, end)
                        return slice.map((u) => (
                          <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td>{u.is_admin ? 'Yes' : 'No'}</td>
                            <td>{new Date(u.created_at).toLocaleString()}</td>
                            <td>
                              {u.id !== user.id && (
                                <button
                                  onClick={() => handleDeleteClick(u)}
                                  className="btn btn-danger btn-small"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const total = users.length
                  const pages = Math.max(1, Math.ceil(total / rowsPerPage))
                  if (pages <= 1) return null
                  return (
                    <Pagination
                      currentPage={Math.min(currentPage, pages)}
                      totalPages={pages}
                      onPageChange={(page) => setCurrentPage(page)}
                    />
                  )
                })()}
              </>
            )}
          </div>
          {/* Add User Form */}
          <div className="card data-section">
            <h2 className="data-title">Add New User</h2>
            <form onSubmit={handleAddUser} className="form-group">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label htmlFor="username" className="form-label">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="form-input"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id="isAdmin"
                    type="checkbox"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                  />
                  <label htmlFor="isAdmin" style={{ fontSize: '0.875rem', color: '#555' }}>
                    Admin
                  </label>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-small" style={{ marginTop: '1rem' }}>
                Add User
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}

export default UserManagement