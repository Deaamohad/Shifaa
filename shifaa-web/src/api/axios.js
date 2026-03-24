import axios from 'axios'

export const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
