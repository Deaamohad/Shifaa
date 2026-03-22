import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function StaffManagement() {
  const { user } = useAuth()
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
      <p className="text-slate-600 mt-2">Coming soon</p>
    </div>
  )
}
