import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

const LOADING_LABEL_DELAY_MS = 220

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [showLoadingLabel, setShowLoadingLabel] = useState(false)
  const loadingLabelTimerRef = useRef(null)
  const { login, token, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (ready && token) {
      navigate(from, { replace: true })
    }
  }, [ready, token, from, navigate])

  useEffect(() => {
    return () => {
      if (loadingLabelTimerRef.current) {
        clearTimeout(loadingLabelTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setPending(true)
    loadingLabelTimerRef.current = setTimeout(() => {
      setShowLoadingLabel(true)
    }, LOADING_LABEL_DELAY_MS)

    try {
      const { data } = await api.post('/login', { email, password })
      clearTimeout(loadingLabelTimerRef.current)
      loadingLabelTimerRef.current = null
      setShowLoadingLabel(false)
      login(data.user, data.token)
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        'Invalid email or password.'
      setError(typeof msg === 'string' ? msg : 'Login failed.')
    } finally {
      if (loadingLabelTimerRef.current) {
        clearTimeout(loadingLabelTimerRef.current)
        loadingLabelTimerRef.current = null
      }
      setShowLoadingLabel(false)
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-slate-200/50 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">
          شفاء Shifaa
        </h1>
        <p className="text-sm text-slate-500 text-center mb-8">
          Sign in to your account
        </p>
        {!ready ? (
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="w-full min-h-[2.75rem] rounded-lg bg-teal-700 text-white font-medium py-2.5 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            >
              {showLoadingLabel ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
