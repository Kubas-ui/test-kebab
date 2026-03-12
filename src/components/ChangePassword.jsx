import { useState } from 'react'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function ChangePassword({ token, username, onDone }) {
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!newPass || !confirm) return setError('Wypełnij oba pola')
    if (newPass.length < 6) return setError('Hasło musi mieć min. 6 znaków')
    if (newPass !== confirm) return setError('Hasła nie są identyczne')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newPassword: newPass }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Błąd zmiany hasła')
      // Re-login to get fresh token with new password hash
      const loginRes = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: newPass }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) return setError('Hasło zmienione, zaloguj się ponownie')
      onDone(loginData)
    } catch {
      setError('Błąd połączenia')
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
        border: '1px solid var(--gold)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, color: 'var(--gold)', marginBottom: 8 }}>
            Zmiana hasła
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            To jest Twoje pierwsze logowanie.<br />Ustaw własne hasło aby kontynuować.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Nowe hasło
            </label>
            <input
              className="input"
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Min. 6 znaków"
              style={{ width: '100%' }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Potwierdź hasło
            </label>
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Powtórz hasło"
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(224,80,80,0.1)', border: '1px solid rgba(224,80,80,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)',
            }}>{error}</div>
          )}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', marginTop: 4, padding: '14px' }}
          >
            {loading ? 'Zapisywanie...' : 'Ustaw nowe hasło'}
          </button>
        </div>
      </div>
    </div>
  )
}