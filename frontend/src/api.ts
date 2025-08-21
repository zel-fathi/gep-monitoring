const API_BASE = '/api';

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    username: string;
    is_admin: boolean;
  };
}

export interface EnergyDataPoint {
  id: number;
  timestamp: string;
  consumption: number;
}

export interface Metrics {
  total_consumption: number;
  avg_consumption: number;
  peak_consumption: number;
  peak_timestamp: string | null;
  count_points: number;
}

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

// API helper class
class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    // Handle different content types
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    } else {
      return response.text() as unknown as T;
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/token', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }

  // Energy data
  /**
   * Get energy data with optional limit and date range filters.
   * Accepts an object with optional properties: limit, from, to.
   */
  async getEnergyData(params: { limit?: number; from?: string; to?: string; page?: number } = {}): Promise<{ data: EnergyDataPoint[]; count: number; limit?: number; page?: number; total?: number; totalPages?: number }> {
    const queryParams: string[] = [];
    if (params.limit) {
      queryParams.push(`limit=${encodeURIComponent(params.limit)}`);
    }
    if (params.from) {
      queryParams.push(`from=${encodeURIComponent(params.from)}`);
    }
    if (params.to) {
      queryParams.push(`to=${encodeURIComponent(params.to)}`);
    }
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return this.request<{ data: EnergyDataPoint[]; count: number }>(`/data${queryString}`);
  }

  async uploadCsv(file: File): Promise<{ message: string; records_processed: number; records_inserted: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE}/data/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Energy data CRUD (admin only)
  async getEnergyDataById(id: number): Promise<EnergyDataPoint> {
    return this.request<EnergyDataPoint>(`/data/${id}`);
  }

  async updateEnergyData(id: number, payload: { timestamp?: string; consumption?: number }): Promise<{ message: string; data: EnergyDataPoint }> {
    return this.request<{ message: string; data: EnergyDataPoint }>(`/data/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteEnergyData(id: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/data/${id}`, {
      method: 'DELETE',
    });
  }

  // Metrics
  async getMetrics(): Promise<Metrics> {
    return this.request<Metrics>('/metrics');
  }

  // Users (admin only)
  async getUsers(): Promise<{ users: User[]; total: number }> {
    return this.request<{ users: User[]; total: number }>('/users');
  }

  async createUser(userData: { username: string; password: string; is_admin: boolean }): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserById(id: number): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  async updateUser(id: number, payload: { username?: string; password?: string; is_admin?: boolean }): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteUser(id: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Export functions
  downloadFile(endpoint: string, filename: string): void {
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE}${endpoint}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    .then(response => {
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Download error:', error);
      alert('Download failed: ' + error.message);
    });
  }

  downloadDataCsv(): void {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:]/g, '');
    this.downloadFile('/export/data.csv', `energy_data_${timestamp}.csv`);
  }

  downloadMetricsCsv(): void {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:]/g, '');
    this.downloadFile('/export/metrics.csv', `energy_metrics_${timestamp}.csv`);
  }

  downloadReport(): void {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:]/g, '');
    this.downloadFile('/export/report.md', `energy_report_${timestamp}.md`);
  }
}

export const api = new ApiClient();

// Auth helpers
export const getStoredUser = (): LoginResponse['user'] | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

export const logout = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
