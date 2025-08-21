import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LoginRequest } from '../api'

const Login = () => {
  const [credentials, setCredentials] = useState<LoginRequest>({
    username: '',
    password: ''
  })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!credentials.username || !credentials.password) {
        throw new Error('Please enter both username and password')
      }

      const response = await api.login(credentials)
      
      // Store auth data
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Redirect to dashboard
      navigate('/dashboard')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof LoginRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">⚡ Microgrid Monitor</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
          Sign in to access your energy dashboard
        </p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={credentials.username}
              onChange={handleInputChange('username')}
              placeholder="Enter your username"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={credentials.password}
              onChange={handleInputChange('password')}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center', marginBottom: '0.5rem' }}>
            Default credentials:
          </p>
          <p style={{ fontSize: '0.875rem', color: '#333', textAlign: 'center', fontFamily: 'monospace' }}>
            <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
