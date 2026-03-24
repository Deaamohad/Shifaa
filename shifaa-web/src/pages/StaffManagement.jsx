import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

export default function StaffManagement() {
  const { user } = useAuth()
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [role, setRole] = useState('receptionist')
  const [phone, setPhone] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [bio, setBio] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/staff')
      setStaff(data.staff || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load staff.'
      setError(typeof msg === 'string' ? msg : 'Failed to load staff.')
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const onCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
        role,
        phone: phone.trim() || null,
      }
      if (role === 'doctor') {
        payload.specialization = specialization.trim()
        payload.bio = bio.trim() || null
        payload.consultation_fee = Number(consultationFee)
        if (
          Number.isNaN(payload.consultation_fee) ||
          payload.consultation_fee < 0
        ) {
          setFormError('Enter a valid consultation fee.')
          setSubmitting(false)
          return
        }
      }
      await api.post('/staff', payload)
      setName('')
      setEmail('')
      setPassword('')
      setPasswordConfirmation('')
      setPhone('')
      setSpecialization('')
      setBio('')
      setConsultationFee('')
      setRole('receptionist')
      await fetchStaff()
    } catch (err) {
      const data = err.response?.data
      const msg =
        data?.message ||
        (data?.errors && Object.values(data.errors).flat().join(' ')) ||
        'Could not create staff.'
      setFormError(typeof msg === 'string' ? msg : 'Could not create staff.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (member) => {
    setTogglingId(member.id)
    setError('')
    try {
      await api.put(`/staff/${member.id}`, {
        is_active: !member.is_active,
      })
      await fetchStaff()
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Could not update staff member.'
      setError(typeof msg === 'string' ? msg : 'Update failed.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Staff management</h1>
        <p className="text-slate-600 mt-1">
          Create doctor and receptionist accounts and manage active status.
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

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold text-slate-800">Add staff member</h2>
        {formError && (
          <div
            className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2"
            role="alert"
          >
            {formError}
          </div>
        )}
        <form onSubmit={onCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm password
              </label>
              <input
                required
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone (optional)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            {role === 'doctor' && (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Specialization
                  </label>
                  <input
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Consultation fee
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bio (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-800 px-5 pt-5 pb-2">
          Staff directory
        </h2>
        {loading ? (
          <p className="p-6 text-slate-600 text-sm">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="p-6 text-slate-600 text-sm">No staff accounts yet.</p>
        ) : (
          <div className="overflow-x-auto pb-4">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Name
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Email
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Role
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Phone
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Status
                  </th>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.email}</td>
                    <td className="px-4 py-3 text-slate-700 capitalize">
                      {s.role}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.phone || '—'}</td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        disabled={togglingId === s.id}
                        className="rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {togglingId === s.id
                          ? '…'
                          : s.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                      </button>
                    </td>
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
