import { useState } from 'react'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!username || !password) return setError('Wpisz login i hasło')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Błąd logowania')
      onLogin(data)
    } catch {
      setError('Błąd połączenia z serwerem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥙</div>
          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 32, fontWeight: 700,
            color: 'var(--gold)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 6,
          }}>Sultan</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Panel zarządzania</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Login
            </label>
            <input
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="admin"
              autoFocus
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Hasło
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(224,80,80,0.1)', border: '1px solid rgba(224,80,80,0.3)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: 'var(--red)',
            }}>{error}</div>
          )}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', marginTop: 4, padding: '14px' }}
          >
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, display: 'inline-block', marginRight: 8 }} />Logowanie...</> : 'Zaloguj się'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 24 }}>
          Domyślne hasło przy pierwszym logowaniu: <strong style={{ color: 'var(--text-2)' }}>admin123</strong>
        </p>
      </div>
    </div>
  )
}
