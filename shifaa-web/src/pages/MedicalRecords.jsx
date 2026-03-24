import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function previewText(text, max = 80) {
  if (!text) return '—'
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export default function MedicalRecords() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const canAccess = ['patient', 'doctor', 'admin'].includes(user?.role)

  const fetchRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/medical-records')
      setRecords(data.medical_records || [])
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to load medical records.'
      setError(typeof msg === 'string' ? msg : 'Failed to load medical records.')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!['patient', 'doctor', 'admin'].includes(user?.role)) {
      setLoading(false)
      return
    }
    fetchRecords()
  }, [user?.role])

  if (!canAccess) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
        <p className="text-slate-600 mt-2">
          This page is available for patients, doctors, and administrators.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
        <p className="text-slate-600 mt-1">
          Clinical notes linked to completed visits.
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
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-slate-500 text-sm">
            Could not load records. Check the message above.
          </div>
        ) : records.length === 0 ? (
          <div className="p-6 text-slate-600">No medical records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Patient</th>
                  <th className="text-left font-semibold px-4 py-3">Doctor</th>
                  <th className="text-left font-semibold px-4 py-3">Visit</th>
                  <th className="text-left font-semibold px-4 py-3">Diagnosis</th>
                  <th className="text-left font-semibold px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">
                      {row.patient?.name || `Patient #${row.patient_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {row.doctor?.name || `Doctor #${row.doctor_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {formatDateTime(row.appointment?.scheduled_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      {previewText(row.diagnosis, 100)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="text-teal-700 font-medium hover:text-teal-900 text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="record-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Medical record
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selected.patient?.name || `Patient #${selected.patient_id}`} ·{' '}
                  {selected.doctor?.name || `Doctor #${selected.doctor_id}`}
                </p>
                <p className="text-xs text-slate-500">
                  Visit: {formatDateTime(selected.appointment?.scheduled_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 text-sm"
              >
                Close
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Symptoms
                </h3>
                <p className="text-slate-800 mt-1 whitespace-pre-wrap">
                  {selected.symptoms || '—'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Diagnosis
                </h3>
                <p className="text-slate-800 mt-1 whitespace-pre-wrap">
                  {selected.diagnosis || '—'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Prescription
                </h3>
                <p className="text-slate-800 mt-1 whitespace-pre-wrap">
                  {selected.prescription || '—'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Notes
                </h3>
                <p className="text-slate-800 mt-1 whitespace-pre-wrap">
                  {selected.notes || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
