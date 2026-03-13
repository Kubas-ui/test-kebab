import { useState } from 'react'
import Customizer from './Customizer.jsx'

export default function Menu({ menuData, onAddToCart, onGoToCart, cartCount }) {
  const [selected, setSelected] = useState(null)
  const [cartPopup, setCartPopup] = useState(null) // { name }

  if (!menuData) return null

  const { menu, customizations } = menuData

  function handleAdd(item, customization, itemTotal, cartKey) {
    onAddToCart({ ...item, customization, itemTotal, cartKey })
    setSelected(null)
    setCartPopup({ name: item.name })
  }

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '80px 0 64px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(201,168,76,0.08) 0%, transparent 70%)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="badge badge-gold animate-fade-up" style={{ marginBottom: 20, animationDelay: '0s' }}>
            ✦ Premium Kebab Istanbul
          </div>
          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(48px, 8vw, 88px)',
            fontWeight: 300,
            letterSpacing: '-0.01em',
            color: 'var(--text-1)',
            lineHeight: 1.05,
            animation: 'fadeUp 0.6s 0.1s ease both',
          }}>
            Sztuka<br />
            <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>prawdziwego</em> kebaba
          </h1>
          <p style={{
            marginTop: 20,
            fontSize: 18,
            color: 'var(--text-2)',
            maxWidth: 460,
            margin: '20px auto 0',
            animation: 'fadeUp 0.6s 0.2s ease both',
          }}>
            Każdy kebab tworzony na zamówienie, z najlepszych składników.
          </p>
        </div>

        {/* decorative line */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 1, height: 40, background: 'linear-gradient(to bottom, transparent, var(--border))',
        }} />
      </div>

      {/* ── Menu grid ─────────────────────────────────── */}
      <div className="container" style={{ padding: '48px 24px 80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {menu.map((item, i) => (
            <MenuCard
              key={item.id}
              item={item}
              delay={i * 0.06}
              onCustomize={() => setSelected(item)}
            />
          ))}
        </div>
      </div>

      {/* ── Customizer modal ────────────────────────── */}
      {selected && (
        <Customizer
          item={selected}
          customizations={customizations}
          onClose={() => setSelected(null)}
          onAdd={handleAdd}
        />
      )}

      {cartPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setCartPopup(null)}>
          <div style={{
            background: 'var(--bg-1)', border: '1px solid var(--gold)',
            borderRadius: 16, padding: '32px 36px', maxWidth: 340, width: '90%',
            textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🥙</div>
            <p style={{ fontSize: 16, color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>
              {cartPopup.name}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
              dodany do koszyka
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setCartPopup(null)}
                style={{ flex: 1, padding: '12px' }}>
                Kontynuuj zakupy
              </button>
              <button className="btn-primary" onClick={() => { setCartPopup(null); onGoToCart() }}
                style={{ flex: 1, padding: '12px' }}>
                🛒 Przejdź do koszyka
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuCard({ item, delay, onCustomize }) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        cursor: 'pointer',
        animation: `fadeUp 0.5s ${delay}s ease both`,
        overflow: 'hidden',
      }}
      onClick={onCustomize}
    >
      {/* Color band */}
      <div style={{
        height: 4,
        background: item.spicy
          ? 'linear-gradient(90deg, var(--fire), #ff4500)'
          : item.category === 'premium'
          ? 'linear-gradient(90deg, var(--gold), var(--gold-light))'
          : 'linear-gradient(90deg, var(--bg-3), var(--border))',
      }} />

      <div style={{ padding: '24px 24px 20px' }}>
        {/* Emoji + badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <span style={{ fontSize: 42, lineHeight: 1 }}>{item.emoji}</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {item.popular && <span className="badge badge-gold">⭐ Hit</span>}
            {item.spicy && <span className="badge badge-fire">🌶 Ostry</span>}
            {item.category === 'premium' && <span className="badge badge-gold">👑 Premium</span>}
          </div>
        </div>

        <h3 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 26,
          fontWeight: 600,
          color: 'var(--text-1)',
          marginBottom: 8,
        }}>
          {item.name}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 20 }}>
          {item.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 26, fontWeight: 600, color: 'var(--gold)' }}>
              {item.price}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 4 }}>zł</span>
          </div>
          <button
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: 13 }}
            onClick={(e) => { e.stopPropagation(); onCustomize() }}
          >
            Zamów
          </button>
        </div>
      </div>
    </div>
  )
}