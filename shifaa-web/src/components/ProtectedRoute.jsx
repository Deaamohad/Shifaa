import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { token, ready } = useAuth()
  const location = useLocation()
  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
