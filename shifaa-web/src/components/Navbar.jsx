import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="text-sm text-slate-500">
        Signed in as{' '}
        <span className="font-medium text-slate-800">{user?.name ?? '—'}</span>
        <span className="mx-2 text-slate-300">·</span>
        <span className="capitalize text-teal-700">{user?.role ?? ''}</span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Log out
      </button>
    </header>
  )
}
