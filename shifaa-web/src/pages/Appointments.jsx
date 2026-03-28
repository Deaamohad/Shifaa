import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const role = user?.role

  const [appointments, setAppointments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState(null)

  const [bookDoctorId, setBookDoctorId] = useState('')
  const [bookWhen, setBookWhen] = useState('')
  const [bookNotes, setBookNotes] = useState('')
  const [booking, setBooking] = useState(false)

  const [invoiceAppt, setInvoiceAppt] = useState(null)
  const [invDesc, setInvDesc] = useState('')
  const [invAmount, setInvAmount] = useState('')
  const [invoiceSaving, setInvoiceSaving] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')

  const canManageAppointments = useMemo(
    () => role === 'receptionist' || role === 'admin',
    [role]
  )

  const canCreateInvoice = role === 'receptionist'

  const appointmentHasInvoice = useMemo(() => {
    const set = new Set()
    for (const inv of invoices) {
      if (inv.appointment_id != null) set.add(inv.appointment_id)
    }
    return set
  }, [invoices])

  const fetchAppointments = useCallback(async () => {
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
  }, [])

  const fetchInvoicesForStaff = useCallback(async () => {
    if (!canManageAppointments) return
    try {
      const { data } = await api.get('/invoices')
      setInvoices(data.invoices || [])
    } catch {
      setInvoices([])
    }
  }, [canManageAppointments])

  const fetchDoctors = useCallback(async () => {
    if (role !== 'patient') return
    try {
      const { data } = await api.get('/doctors')
      setDoctors(data.doctors || [])
    } catch {
      setDoctors([])
    }
  }, [role])

  useEffect(() => {
    if (!['patient', 'doctor', 'receptionist', 'admin'].includes(role)) {
      setLoading(false)
      return
    }
    fetchAppointments()
    fetchDoctors()
    fetchInvoicesForStaff()
  }, [role, fetchAppointments, fetchDoctors, fetchInvoicesForStaff])

  const patchAppointmentAction = async (appointmentId, action) => {
    setActioningId(appointmentId)
    setError('')
    try {
      await api.patch(`/appointments/${appointmentId}/${action}`)
      await fetchAppointments()
      await fetchInvoicesForStaff()
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to update appointment.'
      setError(typeof msg === 'string' ? msg : 'Failed to update appointment.')
    } finally {
      setActioningId(null)
    }
  }

  const onBook = async (e) => {
    e.preventDefault()
    setError('')
    if (!bookDoctorId || !bookWhen) {
      setError('Choose a doctor and date/time.')
      return
    }
    const scheduled = new Date(bookWhen)
    if (Number.isNaN(scheduled.getTime())) {
      setError('Invalid date/time.')
      return
    }
    setBooking(true)
    try {
      await api.post('/appointments', {
        doctor_id: Number(bookDoctorId),
        scheduled_at: scheduled.toISOString(),
        notes: bookNotes.trim() || undefined,
      })
      setBookWhen('')
      setBookNotes('')
      setBookDoctorId('')
      await fetchAppointments()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors &&
          Object.values(err.response.data.errors).flat().join(' ')) ||
        'Could not book appointment.'
      setError(typeof msg === 'string' ? msg : 'Could not book appointment.')
    } finally {
      setBooking(false)
    }
  }

  const openInvoice = (appt) => {
    setInvoiceAppt(appt)
    setInvDesc('')
    setInvAmount('')
    setInvoiceError('')
  }

  const submitInvoice = async (e) => {
    e.preventDefault()
    if (!invoiceAppt) return
    setInvoiceError('')
    const amount = Number(invAmount)
    if (!invDesc.trim()) {
      setInvoiceError('Service description is required.')
      return
    }
    if (Number.isNaN(amount) || amount < 0) {
      setInvoiceError('Enter a valid amount.')
      return
    }
    setInvoiceSaving(true)
    try {
      await api.post(`/appointments/${invoiceAppt.id}/invoices`, {
        service_description: invDesc.trim(),
        amount,
      })
      setInvoiceAppt(null)
      await fetchInvoicesForStaff()
      await fetchAppointments()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors &&
          Object.values(err.response.data.errors).flat().join(' ')) ||
        'Could not create invoice.'
      setInvoiceError(typeof msg === 'string' ? msg : 'Could not create invoice.')
    } finally {
      setInvoiceSaving(false)
    }
  }

  if (!['patient', 'doctor', 'receptionist', 'admin'].includes(role)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
        <p className="text-slate-600 mt-2">
          Appointments are not available for your role.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
        <p className="text-slate-600 mt-1">
          {role === 'patient' && 'Book visits and track your schedule.'}
          {role === 'doctor' && 'Your clinic schedule.'}
          {(role === 'receptionist' || role === 'admin') &&
            'Confirm visits, mark completed, and create invoices.'}
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

      {role === 'patient' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 max-w-xl">
          <h2 className="text-lg font-semibold text-slate-800">
            Book an appointment
          </h2>
          <form onSubmit={onBook} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Doctor
              </label>
              <select
                required
                value={bookDoctorId}
                onChange={(e) => setBookDoctorId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">Select a doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.doctor_profile?.specialization
                      ? ` · ${d.doctor_profile.specialization}`
                      : d.doctorProfile?.specialization
                        ? ` · ${d.doctorProfile.specialization}`
                        : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date &amp; time
              </label>
              <input
                required
                type="datetime-local"
                value={bookWhen}
                onChange={(e) => setBookWhen(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <button
              type="submit"
              disabled={booking}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60"
            >
              {booking ? 'Booking…' : 'Request appointment'}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-6 text-slate-600">No appointments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {role !== 'patient' && (
                    <th className="text-left font-semibold px-4 py-3">
                      Patient
                    </th>
                  )}
                  {role !== 'doctor' && (
                    <th className="text-left font-semibold px-4 py-3">
                      Doctor
                    </th>
                  )}
                  <th className="text-left font-semibold px-4 py-3">
                    Date &amp; Time
                  </th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-t border-slate-100"
                  >
                    {role !== 'patient' && (
                      <td className="px-4 py-3 text-slate-800">
                        {appointment.patient?.name ||
                          appointment.patient_name ||
                          `Patient #${appointment.patient_id}`}
                      </td>
                    )}
                    {role !== 'doctor' && (
                      <td className="px-4 py-3 text-slate-800">
                        {appointment.doctor?.name ||
                          appointment.doctor_name ||
                          `Doctor #${appointment.doctor_id}`}
                      </td>
                    )}
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
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canManageAppointments && (
                          <>
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
                          </>
                        )}
                        {canCreateInvoice &&
                          appointment.status === 'completed' &&
                          !appointmentHasInvoice.has(appointment.id) && (
                            <button
                              type="button"
                              onClick={() => openInvoice(appointment)}
                              className="rounded-md bg-slate-800 px-3 py-1.5 text-white text-xs font-medium hover:bg-slate-900"
                            >
                              Create invoice
                            </button>
                          )}
                        {(role === 'patient' || role === 'doctor') &&
                          (appointment.status === 'pending' ||
                            appointment.status === 'confirmed') && (
                            <button
                              type="button"
                              onClick={() =>
                                patchAppointmentAction(
                                  appointment.id,
                                  'cancel'
                                )
                              }
                              disabled={actioningId === appointment.id}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-red-800 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoiceAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inv-title"
          onClick={() => !invoiceSaving && setInvoiceAppt(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100">
              <h2
                id="inv-title"
                className="text-lg font-semibold text-slate-900"
              >
                Create invoice
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Visit #{invoiceAppt.id} ·{' '}
                {formatDateTime(invoiceAppt.scheduled_at)}
              </p>
            </div>
            <form onSubmit={submitInvoice} className="p-5 space-y-3">
              {invoiceError && (
                <div
                  className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2"
                  role="alert"
                >
                  {invoiceError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service description
                </label>
                <textarea
                  required
                  rows={3}
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (USD)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => !invoiceSaving && setInvoiceAppt(null)}
                  disabled={invoiceSaving}
                  className="rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium px-4 py-2 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceSaving}
                  className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60"
                >
                  {invoiceSaving ? 'Saving…' : 'Create invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
