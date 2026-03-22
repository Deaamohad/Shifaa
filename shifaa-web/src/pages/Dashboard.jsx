import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back,{' '}
          <span className="font-medium text-slate-900">{user?.name}</span>
          <span className="text-slate-400 mx-1">·</span>
          <span className="capitalize text-teal-700">{user?.role}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Today&apos;s Appointments
          </h2>
          <p className="mt-3 text-2xl font-bold text-slate-800">—</p>
          <p className="text-xs text-slate-400 mt-1">Placeholder</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Pending Approvals
          </h2>
          <p className="mt-3 text-2xl font-bold text-slate-800">—</p>
          <p className="text-xs text-slate-400 mt-1">Placeholder</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Recent Invoices
          </h2>
          <p className="mt-3 text-2xl font-bold text-slate-800">—</p>
          <p className="text-xs text-slate-400 mt-1">Placeholder</p>
        </div>
      </div>
    </div>
  )
}
