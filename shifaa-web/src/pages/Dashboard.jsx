import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

function isToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role
  const [loading, setLoading] = useState(true)
  const [a, setA] = useState('—')
  const [b, setB] = useState('—')
  const [c, setC] = useState('—')
  const [labelA, setLabelA] = useState('')
  const [labelB, setLabelB] = useState('')
  const [labelC, setLabelC] = useState('')

  useEffect(() => {
    if (!role) {
      setLoading(false)
      return
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        if (role === 'patient') {
          setLabelA('Visits today')
          setLabelB('Pending requests')
          setLabelC('Unpaid invoices')
          const [apRes, invRes] = await Promise.all([
            api.get('/appointments'),
            api.get('/invoices'),
          ])
          const appts = apRes.data.appointments || []
          const invs = invRes.data.invoices || []
          if (cancelled) return
          setA(String(appts.filter((x) => isToday(x.scheduled_at)).length))
          setB(String(appts.filter((x) => x.status === 'pending').length))
          setC(String(invs.filter((x) => !x.is_paid).length))
        } else if (role === 'doctor') {
          setLabelA('Upcoming visits')
          setLabelB('Completed')
          setLabelC('Chart entries')
          const [apRes, recRes] = await Promise.all([
            api.get('/appointments'),
            api.get('/medical-records'),
          ])
          const appts = apRes.data.appointments || []
          const recs = recRes.data.medical_records || []
          if (cancelled) return
          setA(
            String(
              appts.filter(
                (x) =>
                  x.status === 'pending' || x.status === 'confirmed'
              ).length
            )
          )
          setB(String(appts.filter((x) => x.status === 'completed').length))
          setC(String(recs.length))
        } else if (role === 'receptionist' || role === 'admin') {
          setLabelA('Pending approval')
          setLabelB('Visits today')
          setLabelC('Unpaid invoices')
          const [apRes, invRes] = await Promise.all([
            api.get('/appointments'),
            api.get('/invoices'),
          ])
          const appts = apRes.data.appointments || []
          const invs = invRes.data.invoices || []
          if (cancelled) return
          setA(String(appts.filter((x) => x.status === 'pending').length))
          setB(String(appts.filter((x) => isToday(x.scheduled_at)).length))
          setC(String(invs.filter((x) => !x.is_paid).length))
        } else {
          setLabelA('—')
          setLabelB('—')
          setLabelC('—')
          setA('—')
          setB('—')
          setC('—')
        }
      } catch {
        if (!cancelled) {
          setA('—')
          setB('—')
          setC('—')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [role])

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
        <p className="text-sm text-slate-500 mt-2 max-w-xl">
          Portfolio demo of the Shifaa clinic web portal. Use the sidebar to
          explore appointments, records, labs, and billing by role.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {labelA || '—'}
          </h2>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {loading ? '…' : a}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {labelB || '—'}
          </h2>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {loading ? '…' : b}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {labelC || '—'}
          </h2>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {loading ? '…' : c}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-5 text-sm text-slate-700">
        <p className="font-medium text-teal-900">Quick links</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            <Link to="/appointments" className="text-teal-800 underline">
              Appointments
            </Link>{' '}
            — book (patient), your schedule (doctor), or manage (staff).
          </li>
          {(role === 'patient' || role === 'doctor' || role === 'admin') && (
            <li>
              <Link to="/medical-records" className="text-teal-800 underline">
                Medical records
              </Link>{' '}
              — clinical history; doctors add visit notes after completion.
            </li>
          )}
          {(role === 'patient' || role === 'receptionist' || role === 'admin') && (
            <li>
              <Link to="/invoices" className="text-teal-800 underline">
                Invoices
              </Link>{' '}
              — patients view bills; reception marks paid.
            </li>
          )}
          {role === 'admin' && (
            <li>
              <Link to="/staff" className="text-teal-800 underline">
                Staff
              </Link>{' '}
              — manage clinic accounts.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
