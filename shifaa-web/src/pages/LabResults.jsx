import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { API_ORIGIN } from '../api/axios'
import { useAuth } from '../hooks/useAuth'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function storageUrl(filePath) {
  if (!filePath) return null
  const normalized = String(filePath).replace(/^\//, '')
  return `${API_ORIGIN}/storage/${normalized}`
}

export default function LabResults() {
  const { user } = useAuth()
  const role = user?.role

  const [items, setItems] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAppts, setLoadingAppts] = useState(false)
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')

  const [title, setTitle] = useState('')
  const [appointmentId, setAppointmentId] = useState('')
  const [patientId, setPatientId] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const canView = ['patient', 'doctor', 'admin', 'receptionist'].includes(role)
  const canUpload = role === 'doctor' || role === 'receptionist'

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/lab-results')
      setItems(data.lab_results || [])
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to load lab results.'
      setError(typeof msg === 'string' ? msg : 'Failed to load lab results.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAppointmentsForUpload = useCallback(async () => {
    if (!canUpload) return
    setLoadingAppts(true)
    try {
      const { data } = await api.get('/appointments')
      setAppointments(data.appointments || [])
    } catch {
      setAppointments([])
    } finally {
      setLoadingAppts(false)
    }
  }, [canUpload])

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    fetchList()
  }, [canView, fetchList])

  useEffect(() => {
    if (canUpload) fetchAppointmentsForUpload()
  }, [canUpload, fetchAppointmentsForUpload])

  const appointmentOptions = useMemo(() => {
    const list = appointments || []
    if (role === 'doctor') {
      return list.filter((a) => a.doctor_id === user?.id)
    }
    return list
  }, [appointments, role, user?.id])

  const onSubmitUpload = async (e) => {
    e.preventDefault()
    setUploadError('')
    if (!title.trim()) {
      setUploadError('Title is required.')
      return
    }
    if (!file) {
      setUploadError('Choose a file (PDF, JPG, or PNG).')
      return
    }

    const apptId = appointmentId ? Number(appointmentId) : null
    if (role === 'doctor' && !apptId) {
      setUploadError('Select an appointment for this upload.')
      return
    }
    if (role === 'receptionist' && !apptId && !patientId.trim()) {
      setUploadError('Select an appointment or enter a patient user ID.')
      return
    }

    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('file', file)
    if (apptId) fd.append('appointment_id', String(apptId))
    else fd.append('patient_id', patientId.trim())

    setUploading(true)
    try {
      await api.post('/lab-results', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTitle('')
      setAppointmentId('')
      setPatientId('')
      setFile(null)
      await fetchList()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors &&
          Object.values(err.response.data.errors).flat().join(' ')) ||
        'Upload failed.'
      setUploadError(typeof msg === 'string' ? msg : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Lab Results</h1>
        <p className="text-slate-600 mt-2">
          This page is not available for your role.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lab Results</h1>
        <p className="text-slate-600 mt-1">
          Uploaded reports and imaging. Files are stored securely; open downloads
          in a new tab.
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

      {canUpload && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Upload lab result
          </h2>
          {uploadError && (
            <div
              className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2"
              role="alert"
            >
              {uploadError}
            </div>
          )}
          <form onSubmit={onSubmitUpload} className="space-y-3 max-w-xl">
            <div>
              <label
                htmlFor="lab-title"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Title
              </label>
              <input
                id="lab-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="e.g. CBC — March 2025"
              />
            </div>
            <div>
              <label
                htmlFor="lab-appointment"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Appointment {role === 'doctor' ? '(required)' : '(optional)'}
              </label>
              <select
                id="lab-appointment"
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                disabled={loadingAppts}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50"
              >
                <option value="">
                  {loadingAppts ? 'Loading…' : '— None —'}
                </option>
                {appointmentOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} · patient {a.patient_id} ·{' '}
                    {formatDateTime(a.scheduled_at)}
                  </option>
                ))}
              </select>
            </div>
            {role === 'receptionist' && (
              <div>
                <label
                  htmlFor="lab-patient-id"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Patient user ID (if no appointment)
                </label>
                <input
                  id="lab-patient-id"
                  type="text"
                  inputMode="numeric"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  placeholder="Numeric user id"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="lab-file"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                File (PDF, JPG, PNG)
              </label>
              <input
                id="lab-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-800"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-600 text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-slate-600 text-sm">No lab results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Title
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Patient
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Uploaded by
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Appointment
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Created
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    File
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => {
                  const patient = row.patient
                  const uploader = row.uploaded_by ?? row.uploadedBy
                  const appt = row.appointment
                  const href = storageUrl(row.file_path)
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {row.title}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patient?.name ?? '—'}{' '}
                        {patient?.id != null && (
                          <span className="text-slate-500">(#{patient.id})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {uploader?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {appt?.id != null ? `#${appt.id}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-700 font-medium hover:underline"
                          >
                            Open ({row.file_type ?? 'file'})
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
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
