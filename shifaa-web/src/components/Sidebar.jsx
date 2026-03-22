import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const linkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-teal-700 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export default function Sidebar() {
  const { user } = useAuth()
  const role = user?.role

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <p className="text-lg font-semibold text-teal-800 tracking-tight">
          شفاء Shifaa
        </p>
        <p className="text-xs text-slate-500 mt-0.5">Clinic portal</p>
      </div>
      <nav className="p-3 space-y-1 flex-1">
        <NavLink to="/dashboard" className={linkClass} end>
          Dashboard
        </NavLink>
        {(role === 'receptionist' || role === 'admin') && (
          <>
            <NavLink to="/appointments" className={linkClass}>
              Appointments
            </NavLink>
            <NavLink to="/invoices" className={linkClass}>
              Invoices
            </NavLink>
          </>
        )}
        {(role === 'doctor' || role === 'admin') && (
          <>
            <NavLink to="/medical-records" className={linkClass}>
              Medical Records
            </NavLink>
            <NavLink to="/lab-results" className={linkClass}>
              Lab Results
            </NavLink>
          </>
        )}
        {role === 'admin' && (
          <NavLink to="/staff" className={linkClass}>
            Staff Management
          </NavLink>
        )}
      </nav>
    </aside>
  )
}
