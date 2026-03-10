import { useState } from 'react'

// Fallback static labels in case customizations aren't loaded yet
const BREAD_LABELS = { bun: 'Bułka pita', durum: 'Durum', plate: 'Talerz', bread: 'Chleb turecki' }
const SAUCE_LABELS = { garlic: 'Czosnkowy', spicy: 'Ostry', mild: 'Łagodny', tzatziki: 'Tzatziki', bbq: 'BBQ', harissa: 'Harissa' }
const VEGGIE_LABELS = { lettuce: 'Sałata', tomato: 'Pomidor', cucumber: 'Ogórek', onion: 'Cebula', pepper: 'Papryka', cabbage: 'Kapusta', corn: 'Kukurydza' }
const EXTRA_LABELS = { cheese: 'Ser żółty', jalapeno: 'Jalapeño', extra_meat: 'Podwójne mięso', egg: 'Jajko sadzone', avocado: 'Awokado' }

function resolveLabel(id, list, fallback) {
  return list?.find(i => i.id === id)?.label || fallback[id] || id
}

export default function Cart({ cart, onUpdateQty, onBack, onCheckout, cartTotal, customizations }) {
  const [confirmRemove, setConfirmRemove] = useState(null) // cartKey of item to remove

  function handleRemoveRequest(cartKey) {
    setConfirmRemove(cartKey)
  }

  function handleRemoveConfirm() {
    const item = cart.find(i => i.cartKey === confirmRemove)
    if (item) onUpdateQty(confirmRemove, -item.qty)
    setConfirmRemove(null)
  }

  if (cart.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <span style={{ fontSize: 64 }}>🛒</span>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 32, color: 'var(--text-2)' }}>Koszyk jest pusty</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 15 }}>Dodaj coś pysznego z menu!</p>
        <button className="btn-primary" onClick={onBack} style={{ marginTop: 8 }}>← Wróć do menu</button>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 720, padding: '48px 24px 80px' }}>
      <button onClick={onBack} className="btn-ghost" style={{ marginBottom: 32, fontSize: 13 }}>
        ← Wróć do menu
      </button>

      <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 48, fontWeight: 300, marginBottom: 32, animation: 'fadeUp 0.4s ease' }}>
        Twój koszyk
      </h1>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {cart.map((item, i) => (
          <CartItem
            key={item.cartKey}
            item={item}
            onUpdateQty={onUpdateQty}
            onRemoveRequest={handleRemoveRequest}
            delay={i * 0.05}
            customizations={customizations}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {cart.map(item => (
            <div key={item.cartKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-2)' }}>
              <span>{item.qty}× {item.name}</span>
              <span>{(item.itemTotal * item.qty).toFixed(0)} zł</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 600 }}>Łącznie</span>
            <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--gold)' }}>{cartTotal.toFixed(0)} zł</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Dostawa w 30–45 minut · Płatność przy odbiorze lub online</p>
        </div>
        <button className="btn-primary" onClick={onCheckout} style={{ width: '100%', fontSize: 16, padding: '16px' }}>
          Przejdź do płatności →
        </button>
      </div>

      {/* ── Confirm remove modal ── */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px 28px',
              maxWidth: 360,
              width: '100%',
              animation: 'fadeUp 0.25s ease',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 600, marginBottom: 8 }}>
              Usunąć z koszyka?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
              <strong style={{ color: 'var(--text-1)' }}>
                {cart.find(i => i.cartKey === confirmRemove)?.name}
              </strong>
              {' '}zostanie usunięty z zamówienia.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-ghost"
                onClick={() => setConfirmRemove(null)}
                style={{ flex: 1 }}
              >
                Zostaw
              </button>
              <button
                onClick={handleRemoveConfirm}
                style={{
                  flex: 1, padding: '12px', borderRadius: 'var(--radius)',
                  background: 'rgba(224,80,80,0.12)',
                  border: '1px solid rgba(224,80,80,0.3)',
                  color: 'var(--red)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CartItem({ item, onUpdateQty, onRemoveRequest, delay, customizations }) {
  const c = item.customization || {}

  // Resolve labels from live customizations or fallback to static maps
  const breadLabel = resolveLabel(c.bread, customizations?.bread, BREAD_LABELS)
  const sauceLabel = resolveLabel(c.sauce, customizations?.sauce, SAUCE_LABELS)
  const veggieLabels = (c.veggies || []).map(id => resolveLabel(id, customizations?.veggies, VEGGIE_LABELS))
  const extraLabels  = (c.extras  || []).map(id => resolveLabel(id, customizations?.extras,  EXTRA_LABELS))

  return (
    <div className="card" style={{ padding: '18px 20px', animation: `fadeUp 0.4s ${delay}s ease both` }}>
      {/* Top row: emoji + name + price */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 32, flexShrink: 0 }}>{item.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 600 }}>{item.name}</h3>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--gold)', flexShrink: 0, marginLeft: 12 }}>
              {(item.itemTotal * item.qty).toFixed(0)} zł
            </span>
          </div>
        </div>
      </div>

      {/* Ingredients breakdown */}
      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <IngredientRow icon="🫓" label="Pieczywo" value={breadLabel} />
        <IngredientRow icon="🥣" label="Sos" value={sauceLabel} />
        {veggieLabels.length > 0 && (
          <IngredientRow icon="🥬" label="Warzywa" value={veggieLabels.join(', ')} />
        )}
        {extraLabels.length > 0 && (
          <IngredientRow icon="✨" label="Dodatki" value={extraLabels.join(', ')} accent />
        )}
      </div>

      {/* Bottom row: price/szt + qty controls + remove */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.itemTotal.toFixed(0)} zł / szt.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => item.qty === 1 ? onRemoveRequest(item.cartKey) : onUpdateQty(item.cartKey, -1)}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              color: item.qty === 1 ? 'var(--red)' : 'var(--text-1)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s',
            }}
          >−</button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
          <button
            onClick={() => onUpdateQty(item.cartKey, 1)}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              color: 'var(--text-1)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >+</button>
          <button
            onClick={() => onRemoveRequest(item.cartKey)}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.2)',
              color: 'var(--red)', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Usuń z koszyka"
          >✕</button>
        </div>
      </div>
    </div>
  )
}

function IngredientRow({ icon, label, value, accent }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, minWidth: 52, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: accent ? 'var(--gold)' : 'var(--text-2)', fontWeight: accent ? 500 : 400 }}>
        {value}
      </span>
    </div>
  )
}
