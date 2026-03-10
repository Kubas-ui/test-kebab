import { useState, useMemo } from 'react'

export default function Customizer({ item, customizations, onClose, onAdd }) {
  const [bread, setBread]   = useState('bun')
  const [sauce, setSauce]   = useState('garlic')
  const [veggies, setVeggies] = useState(['lettuce', 'tomato', 'cucumber'])
  const [extras, setExtras]   = useState([])
  const [qty, setQty]         = useState(1)

  // Filter per item's allowedCustomizations (null = all allowed)
  const allowed    = item.allowedCustomizations || {}
  const breads     = customizations.bread.filter(i => !allowed.bread    || allowed.bread.includes(i.id))
  const sauces     = customizations.sauce.filter(i => !allowed.sauce    || allowed.sauce.includes(i.id))
  const vegList    = customizations.veggies.filter(i => !allowed.veggies || allowed.veggies.includes(i.id))
  const extrasList = customizations.extras.filter(i => !allowed.extras   || allowed.extras.includes(i.id))

  const extrasTotal = useMemo(() =>
    extrasList.filter(e => extras.includes(e.id)).reduce((s, e) => s + e.price, 0)
  , [extras, extrasList])

  const sauceExtra = sauces.find(s => s.id === sauce)?.price || 0
  const breadExtra = breads.find(b => b.id === bread)?.price || 0
  const itemTotal  = item.price + extrasTotal + sauceExtra + breadExtra

  function toggleVeggie(id) {
    setVeggies(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])
  }
  function toggleExtra(id) {
    setExtras(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }
  function handleAdd() {
    const customization = { bread, sauce, veggies, extras }
    const cartKey = `${item.id}-${bread}-${sauce}-${[...veggies].sort().join(',')}-${[...extras].sort().join(',')}`
    onAdd(item, customization, itemTotal, cartKey)
  }

  return (
    <div className="modal-overlay">
      {/* Wide modal — override max-width */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 860,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeUp 0.3s ease',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 36 }}>{item.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
              {item.name}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.description}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{itemTotal.toFixed(0)} zł</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>/ sztuka</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
          >✕</button>
        </div>

        {/* ── Body: 2-column layout ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}>
          {/* Left column: Pieczywo + Sosy */}
          <div style={{
            padding: '20px 24px',
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>
            <Section title="🫓 Pieczywo">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {breads.map(b => (
                  <OptionRow
                    key={b.id}
                    label={b.label}
                    extra={b.price}
                    selected={bread === b.id}
                    onClick={() => setBread(b.id)}
                    type="radio"
                  />
                ))}
              </div>
            </Section>

            <Section title="🥣 Sos">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sauces.map(s => (
                  <OptionChip
                    key={s.id}
                    label={s.label}
                    extra={s.price}
                    selected={sauce === s.id}
                    onClick={() => setSauce(s.id)}
                  />
                ))}
              </div>
            </Section>
          </div>

          {/* Right column: Warzywa + Dodatki */}
          <div style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>
            <Section title="🥬 Warzywa" hint="Wielokrotny wybór">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {vegList.map(v => (
                  <ToggleChip
                    key={v.id}
                    label={v.label}
                    selected={veggies.includes(v.id)}
                    onClick={() => toggleVeggie(v.id)}
                  />
                ))}
              </div>
            </Section>

            {extrasList.length > 0 && (
              <Section title="✨ Dodatki" hint="Opcjonalne">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {extrasList.map(e => (
                    <OptionRow
                      key={e.id}
                      label={e.label}
                      extra={e.price}
                      selected={extras.includes(e.id)}
                      onClick={() => toggleExtra(e.id)}
                      type="checkbox"
                    />
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* ── Footer: qty + add ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--bg-2)',
        }}>
          {/* Qty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ilość</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QtyBtn onClick={() => setQty(q => Math.max(1, q - 1))}>−</QtyBtn>
              <span style={{ fontSize: 18, fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{qty}</span>
              <QtyBtn onClick={() => setQty(q => q + 1)}>+</QtyBtn>
            </div>
          </div>

          {/* Summary + add */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {qty > 1 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{qty} × {itemTotal.toFixed(0)} zł</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>{(itemTotal * qty).toFixed(0)} zł</div>
              </div>
            )}
            <button className="btn-primary" onClick={handleAdd} style={{ padding: '12px 28px', fontSize: 15 }}>
              Dodaj do koszyka
              {qty === 1 && <span style={{ opacity: 0.7, fontSize: 13, marginLeft: 8 }}>{itemTotal.toFixed(0)} zł</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          {title}
        </span>
        {hint && <span style={{ fontSize: 10, color: 'var(--text-3)', opacity: 0.6 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// Row-style option (radio or checkbox feel)
function OptionRow({ label, extra, selected, onClick, type }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 14px',
        borderRadius: 9,
        background: selected ? 'var(--gold-dim)' : 'var(--bg-2)',
        border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        color: selected ? 'var(--gold)' : 'var(--text-2)',
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.12s',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {/* indicator */}
        <div style={{
          width: 14, height: 14, flexShrink: 0,
          borderRadius: type === 'radio' ? '50%' : 3,
          border: `2px solid ${selected ? 'var(--gold)' : 'var(--text-3)'}`,
          background: selected ? 'var(--gold)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && type === 'checkbox' && <span style={{ fontSize: 9, color: '#000', fontWeight: 900 }}>✓</span>}
        </div>
        <span>{label}</span>
      </div>
      {extra > 0 && <span style={{ fontSize: 11, opacity: 0.75, marginLeft: 8 }}>+{extra} zł</span>}
    </button>
  )
}

// Chip-style option (for sauces)
function OptionChip({ label, extra, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 13px',
        borderRadius: 100,
        background: selected ? 'var(--gold-dim)' : 'var(--bg-2)',
        border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        color: selected ? 'var(--gold)' : 'var(--text-2)',
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.12s',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {selected && <span style={{ fontSize: 10 }}>✓</span>}
      {label}
      {extra > 0 && <span style={{ fontSize: 11, opacity: 0.7 }}>+{extra}zł</span>}
    </button>
  )
}

function ToggleChip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 12px',
        borderRadius: 100,
        background: selected ? 'var(--gold-dim)' : 'var(--bg-2)',
        border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        color: selected ? 'var(--gold)' : 'var(--text-2)',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.12s',
        fontWeight: selected ? 600 : 400,
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {selected && <span style={{ fontSize: 10 }}>✓</span>}
      {label}
    </button>
  )
}

function QtyBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--bg-3)', border: '1px solid var(--border)',
        color: 'var(--text-1)', fontSize: 18, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{children}</button>
  )
}
