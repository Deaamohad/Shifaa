import { useCallback, useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatMoney(amount) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  if (Number.isNaN(n)) return String(amount)
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  })
}

export default function Invoices() {
  const { user } = useAuth()
  const role = user?.role

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingId, setMarkingId] = useState(null)

  const canView = ['patient', 'receptionist', 'admin'].includes(role)
  const canMarkPaid = role === 'receptionist'

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/invoices')
      setInvoices(data.invoices || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load invoices.'
      setError(typeof msg === 'string' ? msg : 'Failed to load invoices.')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    fetchInvoices()
  }, [canView, fetchInvoices])

  const markPaid = async (id) => {
    setMarkingId(id)
    setError('')
    try {
      await api.patch(`/invoices/${id}/mark-paid`)
      await fetchInvoices()
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Could not mark invoice as paid.'
      setError(typeof msg === 'string' ? msg : 'Could not update invoice.')
    } finally {
      setMarkingId(null)
    }
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
        <p className="text-slate-600 mt-2">
          This page is available for patients, receptionists, and
          administrators.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
        <p className="text-slate-600 mt-1">
          {role === 'patient'
            ? 'Your billing history.'
            : 'Clinic invoices and payment status.'}
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-600 text-sm">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="p-6 text-slate-600 text-sm">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    #
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Patient
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Service
                  </th>
                  <th className="text-right font-semibold text-slate-700 px-4 py-3">
                    Amount
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Status
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Paid at
                  </th>
                  {canMarkPaid && (
                    <th className="text-left font-semibold text-slate-700 px-4 py-3">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const patient = inv.patient
                  const paid = inv.is_paid
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-800 font-mono text-xs">
                        {inv.id}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patient?.name ?? '—'}
                        {role !== 'patient' && patient?.id != null && (
                          <span className="text-slate-500 ml-1">
                            (#{patient.id})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs">
                        <span className="line-clamp-2">
                          {inv.service_description}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 text-right tabular-nums">
                        {formatMoney(inv.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {paid ? (
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {paid ? formatDateTime(inv.paid_at) : '—'}
                      </td>
                      {canMarkPaid && (
                        <td className="px-4 py-3">
                          {!paid ? (
                            <button
                              type="button"
                              onClick={() => markPaid(inv.id)}
                              disabled={markingId === inv.id}
                              className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-teal-800 disabled:opacity-60"
                            >
                              {markingId === inv.id ? '…' : 'Mark paid'}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
