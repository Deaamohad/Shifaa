import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
}

function getStatusBadgeClass(status) {
  return (
    statusStyles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  )
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function Appointments() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState(null)

  const canManageAppointments = useMemo(
    () => user?.role === 'receptionist' || user?.role === 'admin',
    [user?.role]
  )

  const fetchAppointments = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/appointments')
      setAppointments(data.appointments || [])
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to load appointments.'
      setError(typeof msg === 'string' ? msg : 'Failed to load appointments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'patient') {
      setLoading(false)
      return
    }
    fetchAppointments()
  }, [user?.role])

  const patchAppointmentAction = async (appointmentId, action) => {
    setActioningId(appointmentId)
    setError('')
    try {
      await api.patch(`/appointments/${appointmentId}/${action}`)
      await fetchAppointments()
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to update appointment.'
      setError(typeof msg === 'string' ? msg : 'Failed to update appointment.')
    } finally {
      setActioningId(null)
    }
  }

  if (user?.role === 'patient') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
        <p className="text-slate-600 mt-2">
          This page is available for clinic staff only.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
        <p className="text-slate-600 mt-1">Manage and review appointments.</p>
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
        ) : appointments.length === 0 ? (
          <div className="p-6 text-slate-600">No appointments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Patient</th>
                  <th className="text-left font-semibold px-4 py-3">Doctor</th>
                  <th className="text-left font-semibold px-4 py-3">
                    Date &amp; Time
                  </th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  {canManageAppointments && (
                    <th className="text-left font-semibold px-4 py-3">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3 text-slate-800">
                      {appointment.patient?.name ||
                        appointment.patient_name ||
                        `Patient #${appointment.patient_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {appointment.doctor?.name ||
                        appointment.doctor_name ||
                        `Doctor #${appointment.doctor_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(appointment.scheduled_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                    {canManageAppointments && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {appointment.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  patchAppointmentAction(
                                    appointment.id,
                                    'confirm'
                                  )
                                }
                                disabled={actioningId === appointment.id}
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  patchAppointmentAction(
                                    appointment.id,
                                    'cancel'
                                  )
                                }
                                disabled={actioningId === appointment.id}
                                className="rounded-md bg-red-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {appointment.status === 'confirmed' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  patchAppointmentAction(
                                    appointment.id,
                                    'complete'
                                  )
                                }
                                disabled={actioningId === appointment.id}
                                className="rounded-md bg-green-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  patchAppointmentAction(
                                    appointment.id,
                                    'cancel'
                                  )
                                }
                                disabled={actioningId === appointment.id}
                                className="rounded-md bg-red-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
