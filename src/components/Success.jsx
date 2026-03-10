import { useState, useEffect } from 'react'

export default function Success({ order, onNewOrder }) {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const timer = setInterval(() => setDots(d => d < 3 ? d + 1 : 1), 600)
    return () => clearInterval(timer)
  }, [])

  const statuses = [
    { label: 'Zamówienie przyjęte', done: true, icon: '✓' },
    { label: 'Płatność potwierdzona', done: true, icon: '✓' },
    { label: 'Przygotowanie kebaba', done: false, icon: '🥙', active: true },
    { label: 'Gotowe do odbioru', done: false, icon: '📦' },
  ]

  return (
    <div className="container" style={{ maxWidth: 520, padding: '64px 24px 80px', textAlign: 'center' }}>

      {/* Success icon */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(76,175,125,0.15) 0%, rgba(76,175,125,0.05) 70%)',
        border: '2px solid rgba(76,175,125,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 48, margin: '0 auto 28px',
        animation: 'fadeUp 0.5s ease',
      }}>
        🥙
      </div>

      <div className="badge badge-green" style={{ margin: '0 auto 20px' }}>
        ✓ Zamówienie potwierdzone
      </div>

      <h1 style={{
        fontFamily: 'Cormorant Garamond', fontSize: 52, fontWeight: 300,
        marginBottom: 12, animation: 'fadeUp 0.5s 0.1s ease both',
      }}>
        Dziękujemy!
      </h1>
      <p style={{ color: 'var(--text-2)', marginBottom: 8, animation: 'fadeUp 0.5s 0.15s ease both' }}>
        Twój kebab jest już w przygotowaniu{'.'.repeat(dots)}
      </p>

      {order && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 36, animation: 'fadeUp 0.5s 0.2s ease both' }}>
          Zamówienie #{order.id} · {order.payment_method} · {order.total?.toFixed(0)} zł
        </p>
      )}

      {/* Status tracker */}
      <div className="card" style={{ padding: '24px', textAlign: 'left', marginBottom: 28, animation: 'fadeUp 0.5s 0.25s ease both' }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, marginBottom: 20 }}>Status zamówienia</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {statuses.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: s.done ? 'rgba(76,175,125,0.15)' : s.active ? 'var(--gold-dim)' : 'var(--bg-3)',
                  border: `2px solid ${s.done ? 'var(--green)' : s.active ? 'var(--gold)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: s.done ? 14 : 16,
                  color: s.done ? 'var(--green)' : 'var(--text-2)',
                  animation: s.active ? 'pulse 1.5s infinite' : 'none',
                }}>
                  {s.icon}
                </div>
                {i < statuses.length - 1 && (
                  <div style={{
                    width: 2, height: 28,
                    background: s.done ? 'var(--green)' : 'var(--border)',
                    opacity: 0.4,
                  }} />
                )}
              </div>
              <div style={{ paddingTop: 6, paddingBottom: 20 }}>
                <p style={{
                  fontSize: 14, fontWeight: s.active ? 600 : 400,
                  color: s.done ? 'var(--green)' : s.active ? 'var(--gold)' : 'var(--text-3)',
                }}>
                  {s.label}
                  {s.active && <span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}> …</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '14px 20px',
        marginBottom: 28, animation: 'fadeUp 0.5s 0.3s ease both',
      }}>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          ⏱ Szacowany czas oczekiwania: <strong style={{ color: 'var(--text-1)' }}>25–35 minut</strong>
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          SMS z powiadomieniem zostanie wysłany na Twój numer
        </p>
      </div>

      <button
        className="btn-primary"
        onClick={onNewOrder}
        style={{ animation: 'fadeUp 0.5s 0.35s ease both' }}
      >
        + Złóż nowe zamówienie
      </button>
    </div>
  )
}
