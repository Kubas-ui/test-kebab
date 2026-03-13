import { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  new:        { label: 'Nowe',        color: 'var(--blue)',   bg: 'rgba(76,143,232,0.1)', icon: '🔔' },
  confirmed:  { label: 'Potwierdzone',color: 'var(--gold)',   bg: 'var(--gold-dim)',       icon: '✓'  },
  delivered:  { label: 'Wydane',      color: 'var(--green)',  bg: 'rgba(76,175,125,0.1)', icon: '📦' },
  cancelled:  { label: 'Anulowane',   color: 'var(--red)',    bg: 'rgba(224,80,80,0.08)', icon: '✕'  },
}
const NEXT_STATUS = { new: 'confirmed', confirmed: 'delivered' }
const NEXT_LABEL  = { new: 'Potwierdź zamówienie', confirmed: 'Wydaj zamówienie' }

const MENU_CATEGORIES = [
  { id: 'classic', label: 'Klasyczny' }, { id: 'spicy',   label: 'Ostry' },
  { id: 'chicken', label: 'Kurczak' },   { id: 'mix',     label: 'Mix' },
  { id: 'wrap',    label: 'Wrap' },      { id: 'vege',    label: 'Wege' },
  { id: 'premium', label: 'Premium' },
]
const EMOJI_OPTIONS = ['🥙','🌶️','🍗','🔥','🌯','🥗','👑','🍖','🧆','🥪','🌮','🫔','🍽️','⭐']

const CMS_SECTIONS = [
  { id: 'menu',    label: '🥙 Kebaby',  desc: 'Pozycje w menu' },
  { id: 'bread',   label: '🫓 Pieczywo', desc: 'Rodzaje pieczywa' },
  { id: 'sauce',   label: '🥣 Sosy',    desc: 'Dostępne sosy' },
  { id: 'veggies', label: '🥬 Warzywa', desc: 'Dodatki warzywne' },
  { id: 'extras',  label: '✨ Dodatki', desc: 'Płatne dodatki' },
]

// ─── Root Admin ───────────────────────────────────────────────────────────────

export default function Admin({ auth, onLogout }) {
  const [tab, setTab] = useState('orders')
  const [newOrderPopup, setNewOrderPopup] = useState(null)
  const lastOrderIdRef = useRef(null)
  const authRef = useRef(auth)
  const isAdmin = auth?.role === 'admin'

  // Keep authRef current
  useEffect(() => { authRef.current = auth }, [auth])

  // Poll for new orders every 15s
  useEffect(() => {
    function playSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        // 3 loud beeps
        ;[0, 0.35, 0.7].forEach(delay => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(1100, ctx.currentTime + delay)
          gain.gain.setValueAtTime(0.8, ctx.currentTime + delay)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25)
          osc.start(ctx.currentTime + delay)
          osc.stop(ctx.currentTime + delay + 0.25)
        })
      } catch {}
    }

    async function checkNewOrders() {
      const token = authRef.current?.token
      if (!token) return
      try {
        const res = await fetch(`${API}/orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) return
        const orders = await res.json()
        if (!orders.length) return
        const newest = orders[0]
        if (lastOrderIdRef.current === null) {
          lastOrderIdRef.current = newest.id
          return
        }
        if (newest.id > lastOrderIdRef.current) {
          lastOrderIdRef.current = newest.id
          if (newest.order_status === 'new') {
            setNewOrderPopup(newest)
            playSound()
          }
        }
      } catch {}
    }

    // Initial check after 2s (żeby nie blokować ładowania)
    const init = setTimeout(checkNewOrders, 2000)
    const interval = setInterval(checkNewOrders, 15000)
    return () => { clearTimeout(init); clearInterval(interval) }
  }, [])

  const tabs = [
    { id: 'orders', label: '📋 Zamówienia' },
    ...(isAdmin ? [
      { id: 'cms',   label: '✏️ Zarządzaj treścią' },
      { id: 'users', label: '👥 Użytkownicy' },
    ] : []),
  ]

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* New order popup */}
      {newOrderPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-1)', border: '2px solid var(--gold)',
            borderRadius: 16, padding: '36px 40px', maxWidth: 380, width: '90%',
            textAlign: 'center', animation: 'fadeUp 0.3s ease',
            boxShadow: '0 0 60px rgba(201,168,76,0.3)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🔔</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, color: 'var(--gold)', marginBottom: 8 }}>
              Nowe zamówienie!
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 4 }}>
              #{newOrderPopup.order_number}
            </p>
            <p style={{ color: 'var(--text-1)', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              {newOrderPopup.customer_name}
            </p>
            <p style={{ color: 'var(--gold)', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
              {parseFloat(newOrderPopup.total).toFixed(0)} zł
            </p>
            <button
              className="btn-primary"
              onClick={() => { setNewOrderPopup(null); setTab('orders') }}
              style={{ width: '100%', padding: 14 }}
            >
              Zobacz zamówienie
            </button>
          </div>
        </div>
      )}

      <div style={{
        borderBottom: '1px solid var(--border)', background: 'var(--bg-1)',
        padding: '0 28px', display: 'flex', gap: 2,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 20px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? 'var(--gold)' : 'transparent'}`,
            color: tab === t.id ? 'var(--gold)' : 'var(--text-2)',
            fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'orders' && <OrdersPanel auth={auth} onLogout={onLogout} />}
      {tab === 'cms'    && isAdmin && <CMSPanel auth={auth} onLogout={onLogout} />}
      {tab === 'users'  && isAdmin && <UsersPanel auth={auth} />}
    </div>
  )
}

// ─── CMS Panel ────────────────────────────────────────────────────────────────

function CMSPanel({ auth, onLogout }) {
  const [section, setSection] = useState('menu')

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 112px)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 200, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        padding: '20px 12px',
        background: 'var(--bg-1)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px 10px' }}>
          Kategorie
        </p>
        {CMS_SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: section === s.id ? 'var(--gold-dim)' : 'transparent',
            color: section === s.id ? 'var(--gold)' : 'var(--text-2)',
            fontSize: 13, fontWeight: section === s.id ? 600 : 400,
            textAlign: 'left', transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span>{s.label}</span>
            <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>{s.desc}</span>
          </button>
        ))}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {section === 'menu'    && <MenuEditor />}
        {section !== 'menu'    && <CustomizationEditor category={section} key={section} />}
      </main>
    </div>
  )
}

// ─── Menu Editor (Kebaby) ─────────────────────────────────────────────────────

const EMPTY_MENU_FORM = { name: '', description: '', price: '', category: 'classic', emoji: '🥙', spicy: false, popular: false, available: true }

function MenuEditor() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [addForm, setAddForm] = useState(EMPTY_MENU_FORM)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const [allCustomizations, setAllCustomizations] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/menu/items`, { headers: { 'Authorization': `Bearer ${auth?.token}` } }).then(r => r.json()),
      fetch(`${API}/menu`).then(r => r.json()),
    ]).then(([menuData, menuPublic]) => {
      setItems(menuData)
      setAllCustomizations(menuPublic.customizations)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function startEdit(item) { setEditingId(item.id); setEditForm({ ...item }); setShowAdd(false) }
  function cancelEdit() { setEditingId(null); setEditForm({}) }

  async function saveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`${API}/menu/items/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, price: Number(editForm.price) }),
      })
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === editingId ? updated : i))
      setEditingId(null)
      showToast('✓ Zapisano zmiany')
    } catch { showToast('❌ Błąd zapisu') }
    finally { setSaving(false) }
  }

  async function deleteItem(id) {
    if (!window.confirm('Usunąć tę pozycję z menu?')) return
    setDeleting(id)
    try {
      await fetch(`${API}/menu/items/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${auth?.token}` } })
      setItems(prev => prev.filter(i => i.id !== id))
      if (editingId === id) cancelEdit()
      showToast('✓ Usunięto pozycję')
    } catch { showToast('❌ Błąd usuwania') }
    finally { setDeleting(null) }
  }

  async function addItem() {
    if (!addForm.name || !addForm.description || !addForm.price) return showToast('⚠ Wypełnij wymagane pola')
    setSaving(true)
    try {
      const res = await fetch(`${API}/menu/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, price: Number(addForm.price) }),
      })
      const newItem = await res.json()
      setItems(prev => [...prev, newItem])
      setAddForm(EMPTY_MENU_FORM); setShowAdd(false)
      showToast('✓ Dodano nową pozycję')
    } catch { showToast('❌ Błąd dodawania') }
    finally { setSaving(false) }
  }

  async function toggleAvailable(item) {
    try {
      const res = await fetch(`${API}/menu/items/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !item.available }),
      })
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      showToast(updated.available ? '✓ Widoczny w menu' : '✓ Ukryty w menu')
    } catch { showToast('❌ Błąd') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ padding: '24px 28px' }}>
      <SectionHeader
        title="Kebaby"
        count={items.length}
        visibleCount={items.filter(i => i.available).length}
        onAdd={() => { setShowAdd(true); setEditingId(null) }}
      />

      {showAdd && (
        <FormCard title="Nowa pozycja" onClose={() => setShowAdd(false)}>
          <MenuItemForm form={addForm} onChange={setAddForm} allCustomizations={allCustomizations} />
          <FormActions onSave={addItem} onCancel={() => setShowAdd(false)} saving={saving} saveLabel="+ Dodaj do menu" />
        </FormCard>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ animation: `fadeUp 0.3s ${i * 0.03}s ease both` }}>
            {editingId === item.id ? (
              <FormCard title={`Edytujesz: ${item.name}`} onClose={cancelEdit}>
                <MenuItemForm form={editForm} onChange={setEditForm} allCustomizations={allCustomizations} />
                <FormActions onSave={saveEdit} onCancel={cancelEdit} saving={saving} saveLabel="✓ Zapisz zmiany" />
              </FormCard>
            ) : (
              <div className="card" style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                opacity: item.available ? 1 : 0.5, transition: 'opacity 0.2s',
              }}>
                <span style={{ fontSize: 34, flexShrink: 0 }}>{item.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</span>
                    {item.popular  && <span className="badge badge-gold" style={{ fontSize: 10 }}>⭐ Hit</span>}
                    {item.spicy    && <span className="badge badge-fire" style={{ fontSize: 10 }}>🌶 Ostry</span>}
                    {!item.available && <HiddenBadge />}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{MENU_CATEGORIES.find(c => c.id === item.category)?.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                    {item.description}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 56 }}>
                  <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--gold)' }}>{item.price}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}> zł</span>
                </div>
                <ItemActions
                  available={item.available}
                  onToggle={() => toggleAvailable(item)}
                  onEdit={() => startEdit(item)}
                  onDelete={() => deleteItem(item.id)}
                  deleting={deleting === item.id}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ─── Customization Editor (Pieczywo / Sosy / Warzywa / Dodatki) ───────────────

const CATEGORY_META = {
  bread:   { title: 'Pieczywo',  emoji: '🫓', hint: 'Rodzaje pieczywa do wyboru', hasPrice: true,  pricePlaceholder: 'Dopłata' },
  sauce:   { title: 'Sosy',      emoji: '🥣', hint: 'Dostępne sosy',             hasPrice: true,  pricePlaceholder: 'Dopłata' },
  veggies: { title: 'Warzywa',   emoji: '🥬', hint: 'Warzywa do wyboru',          hasPrice: false, pricePlaceholder: '' },
  extras:  { title: 'Dodatki',   emoji: '✨', hint: 'Płatne dodatki',             hasPrice: true,  pricePlaceholder: 'Cena' },
}

const EMPTY_CUSTOM_FORM = { label: '', price: '0', available: true }

function CustomizationEditor({ category }) {
  const meta = CATEGORY_META[category]
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [addForm, setAddForm] = useState(EMPTY_CUSTOM_FORM)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/customizations/${category}`, { headers: { 'Authorization': `Bearer ${auth?.token}` } })
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category])

  function startEdit(item) { setEditingId(item.id); setEditForm({ ...item, price: String(item.price) }); setShowAdd(false) }
  function cancelEdit() { setEditingId(null); setEditForm({}) }

  async function saveEdit() {
    if (!editForm.label) return showToast('⚠ Nazwa jest wymagana')
    setSaving(true)
    try {
      const res = await fetch(`${API}/customizations/${category}/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editForm.label, price: Number(editForm.price) || 0, available: editForm.available }),
      })
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === editingId ? updated : i))
      setEditingId(null)
      showToast('✓ Zapisano zmiany')
    } catch { showToast('❌ Błąd zapisu') }
    finally { setSaving(false) }
  }

  async function deleteItem(id) {
    if (!window.confirm('Usunąć tę pozycję?')) return
    setDeleting(id)
    try {
      await fetch(`${API}/customizations/${category}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${auth?.token}` } })
      setItems(prev => prev.filter(i => i.id !== id))
      if (editingId === id) cancelEdit()
      showToast('✓ Usunięto')
    } catch { showToast('❌ Błąd usuwania') }
    finally { setDeleting(null) }
  }

  async function addItem() {
    if (!addForm.label) return showToast('⚠ Wpisz nazwę')
    setSaving(true)
    try {
      const res = await fetch(`${API}/customizations/${category}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: addForm.label, price: Number(addForm.price) || 0, available: addForm.available }),
      })
      const newItem = await res.json()
      setItems(prev => [...prev, newItem])
      setAddForm(EMPTY_CUSTOM_FORM); setShowAdd(false)
      showToast('✓ Dodano')
    } catch { showToast('❌ Błąd dodawania') }
    finally { setSaving(false) }
  }

  async function toggleAvailable(item) {
    try {
      const res = await fetch(`${API}/customizations/${category}/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !item.available }),
      })
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      showToast(updated.available ? '✓ Widoczny' : '✓ Ukryty')
    } catch { showToast('❌ Błąd') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ padding: '24px 28px' }}>
      <SectionHeader
        title={`${meta.emoji} ${meta.title}`}
        subtitle={meta.hint}
        count={items.length}
        visibleCount={items.filter(i => i.available).length}
        onAdd={() => { setShowAdd(true); setEditingId(null) }}
      />

      {showAdd && (
        <FormCard title={`Nowa pozycja — ${meta.title}`} onClose={() => setShowAdd(false)}>
          <CustomForm form={addForm} onChange={setAddForm} hasPrice={meta.hasPrice} pricePlaceholder={meta.pricePlaceholder} />
          <FormActions onSave={addItem} onCancel={() => setShowAdd(false)} saving={saving} saveLabel="+ Dodaj" />
        </FormCard>
      )}

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ animation: `fadeUp 0.3s ${i * 0.04}s ease both` }}>
            {editingId === item.id ? (
              <FormCard title={`Edytujesz: ${item.label}`} onClose={cancelEdit}>
                <CustomForm form={editForm} onChange={setEditForm} hasPrice={meta.hasPrice} pricePlaceholder={meta.pricePlaceholder} />
                <FormActions onSave={saveEdit} onCancel={cancelEdit} saving={saving} saveLabel="✓ Zapisz" />
              </FormCard>
            ) : (
              <div className="card" style={{
                padding: '14px 16px',
                opacity: item.available ? 1 : 0.45,
                transition: 'opacity 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {!item.available && <HiddenBadge />}
                  </div>
                  {meta.hasPrice && item.price > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>+{item.price} zł</span>
                  )}
                  {meta.hasPrice && item.price === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>gratis</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => toggleAvailable(item)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                      background: item.available ? 'rgba(76,175,125,0.1)' : 'var(--bg-3)',
                      border: `1px solid ${item.available ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`,
                      color: item.available ? 'var(--green)' : 'var(--text-3)', transition: 'all 0.15s',
                    }}
                  >{item.available ? '👁 Widoczny' : '🚫 Ukryty'}</button>
                  <button onClick={() => startEdit(item)} style={{
                    padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                    background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)',
                  }}>✏️</button>
                  <button onClick={() => deleteItem(item.id)} disabled={deleting === item.id} style={{
                    padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                    background: 'rgba(224,80,80,0.07)', border: '1px solid rgba(224,80,80,0.2)', color: 'var(--red)',
                  }}>
                    {deleting === item.id ? <div className="spinner" style={{ width: 11, height: 11 }} /> : '🗑'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{meta.emoji}</div>
          <p>Brak pozycji — dodaj pierwszą!</p>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ─── Shared form components ───────────────────────────────────────────────────

function MenuItemForm({ form, onChange, allCustomizations }) {
  function set(key, val) { onChange(prev => ({ ...prev, [key]: val })) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12 }}>
        <div>
          <p className="input-label">Emoji</p>
          <EmojiPicker value={form.emoji} onChange={v => set('emoji', v)} />
        </div>
        <div>
          <p className="input-label">Nazwa *</p>
          <input className="input" placeholder="Kebab Klasyczny" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
      </div>
      <div>
        <p className="input-label">Opis *</p>
        <textarea className="input" placeholder="Soczysty doner wołowy..." value={form.description}
          onChange={e => set('description', e.target.value)} rows={2}
          style={{ resize: 'vertical', fontFamily: 'Outfit, sans-serif' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <p className="input-label">Cena (zł) *</p>
          <input className="input" type="number" placeholder="24" min={1} value={form.price} onChange={e => set('price', e.target.value)} />
        </div>
        <div>
          <p className="input-label">Kategoria</p>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
            {MENU_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Toggle label="🌶 Ostry"    checked={form.spicy}     onChange={v => set('spicy', v)} />
        <Toggle label="⭐ Hit"      checked={form.popular}   onChange={v => set('popular', v)} />
        <Toggle label="👁 Widoczny" checked={form.available} onChange={v => set('available', v)} />
      </div>

      {allCustomizations && (
        <AllowedCustomizationsEditor
          value={form.allowedCustomizations || null}
          allCustomizations={allCustomizations}
          onChange={v => set('allowedCustomizations', v)}
        />
      )}
    </div>
  )
}

const CUST_LABELS = {
  bread:   { label: '🫓 Pieczywo',  desc: 'Jakie rodzaje pieczywa są dostępne?' },
  sauce:   { label: '🥣 Sosy',      desc: 'Jakie sosy można wybrać?' },
  veggies: { label: '🥬 Warzywa',   desc: 'Jakie warzywa wchodzą w skład?' },
  extras:  { label: '✨ Dodatki',   desc: 'Jakie dodatki można domówić?' },
}

function AllowedCustomizationsEditor({ value, allCustomizations, onChange }) {
  // value: null = all allowed, or { bread: [...ids], sauce: [...ids], ... }
  // When null, all checkboxes are checked

  function isAllowed(cat, id) {
    if (!value || !value[cat]) return true   // null = all
    return value[cat].includes(id)
  }

  function toggle(cat, id) {
    // Build current state for this category
    const allIds = allCustomizations[cat].map(i => i.id)
    const currentIds = (!value || !value[cat]) ? allIds : value[cat]
    const newIds = currentIds.includes(id)
      ? currentIds.filter(i => i !== id)
      : [...currentIds, id]

    // If all selected → store null for this category (means "all")
    const newCatValue = newIds.length === allIds.length ? null : newIds

    const newValue = {
      bread:   value?.bread   ?? null,
      sauce:   value?.sauce   ?? null,
      veggies: value?.veggies ?? null,
      extras:  value?.extras  ?? null,
      [cat]: newCatValue,
    }
    // If all categories are null → store null overall
    const allNull = Object.values(newValue).every(v => v === null)
    onChange(allNull ? null : newValue)
  }

  function toggleAll(cat) {
    const allIds = allCustomizations[cat].map(i => i.id)
    const currentIds = (!value || !value[cat]) ? allIds : value[cat]
    const allSelected = currentIds.length === allIds.length

    const newValue = {
      bread:   value?.bread   ?? null,
      sauce:   value?.sauce   ?? null,
      veggies: value?.veggies ?? null,
      extras:  value?.extras  ?? null,
      [cat]: allSelected ? [] : null,  // null = all, [] = none
    }
    onChange(newValue)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />
      <p className="input-label" style={{ marginBottom: 14 }}>Konfiguracja składników tego kebaba</p>

      {['bread', 'sauce', 'veggies', 'extras'].map(cat => {
        const items = allCustomizations[cat] || []
        const allIds = items.map(i => i.id)
        const currentIds = (!value || !value[cat]) ? allIds : value[cat]
        const allSelected = currentIds.length === allIds.length
        const meta = CUST_LABELS[cat]

        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{meta.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{meta.desc}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleAll(cat)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 100, cursor: 'pointer',
                  background: allSelected ? 'var(--gold-dim)' : 'var(--bg-3)',
                  border: `1px solid ${allSelected ? 'var(--gold)' : 'var(--border)'}`,
                  color: allSelected ? 'var(--gold)' : 'var(--text-3)',
                }}
              >
                {allSelected ? '✓ Wszystkie' : `${currentIds.length}/${allIds.length}`}
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {items.map(item => {
                const checked = isAllowed(cat, item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(cat, item.id)}
                    style={{
                      padding: '6px 13px', borderRadius: 100, cursor: 'pointer', fontSize: 12,
                      background: checked ? 'var(--gold-dim)' : 'var(--bg-3)',
                      border: `1px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                      color: checked ? 'var(--gold)' : 'var(--text-3)',
                      fontWeight: checked ? 600 : 400,
                      transition: 'all 0.12s',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    {checked && <span style={{ fontSize: 10 }}>✓</span>}
                    {item.label}
                    {item.price > 0 && <span style={{ opacity: 0.6, fontSize: 10 }}>+{item.price}zł</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CustomForm({ form, onChange, hasPrice, pricePlaceholder }) {
  function set(key, val) { onChange(prev => ({ ...prev, [key]: val })) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p className="input-label">Nazwa *</p>
        <input className="input" placeholder="np. Czosnkowy" value={form.label} onChange={e => set('label', e.target.value)} autoFocus />
      </div>
      {hasPrice && (
        <div>
          <p className="input-label">{pricePlaceholder} (zł)</p>
          <input className="input" type="number" placeholder="0" min={0} step={0.5} value={form.price} onChange={e => set('price', e.target.value)} />
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Wpisz 0 jeśli bez dopłaty</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Toggle label="👁 Widoczny" checked={form.available} onChange={v => set('available', v)} />
      </div>
    </div>
  )
}

// ─── Reusable small components ────────────────────────────────────────────────

function SectionHeader({ title, subtitle, count, visibleCount, onAdd }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 34, fontWeight: 300 }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 2 }}>{subtitle}</p>}
        <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>
          {visibleCount} widocznych · {count - visibleCount} ukrytych · {count} łącznie
        </p>
      </div>
      <button className="btn-primary" onClick={onAdd}>+ Dodaj nową</button>
    </div>
  )
}

function FormCard({ title, onClose, children }) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border-hover)',
      borderRadius: 'var(--radius-lg)', padding: 22, marginBottom: 16,
      animation: 'fadeUp 0.2s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>
      {children}
    </div>
  )
}

function FormActions({ onSave, onCancel, saving, saveLabel }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
      <button className="btn-primary" onClick={onSave} disabled={saving}>
        {saving ? <><div className="spinner" /> Zapisywanie...</> : saveLabel}
      </button>
      <button className="btn-ghost" onClick={onCancel}>Anuluj</button>
    </div>
  )
}

function ItemActions({ available, onToggle, onEdit, onDelete, deleting }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      <button onClick={onToggle} style={{
        padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
        background: available ? 'rgba(76,175,125,0.1)' : 'var(--bg-3)',
        border: `1px solid ${available ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`,
        color: available ? 'var(--green)' : 'var(--text-3)', transition: 'all 0.15s',
      }}>{available ? '👁 Widoczny' : '🚫 Ukryty'}</button>
      <button onClick={onEdit} style={{
        padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
        background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)',
      }}>✏️ Edytuj</button>
      <button onClick={onDelete} disabled={deleting} style={{
        padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
        background: 'rgba(224,80,80,0.07)', border: '1px solid rgba(224,80,80,0.2)', color: 'var(--red)',
      }}>{deleting ? <div className="spinner" style={{ width: 12, height: 12 }} /> : '🗑'}</button>
    </div>
  )
}

function HiddenBadge() {
  return (
    <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)', fontSize: 10 }}>
      Ukryty
    </span>
  )
}

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: 54, height: 44, fontSize: 24,
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{value}</button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 50,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 10,
          display: 'flex', flexWrap: 'wrap', gap: 6, width: 200,
          boxShadow: 'var(--shadow)',
        }}>
          {EMOJI_OPTIONS.map(e => (
            <button key={e} type="button" onClick={() => { onChange(e); setOpen(false) }} style={{
              fontSize: 22, width: 36, height: 36,
              background: value === e ? 'var(--gold-dim)' : 'transparent',
              border: `1px solid ${value === e ? 'var(--gold)' : 'transparent'}`,
              borderRadius: 6, cursor: 'pointer',
            }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      padding: '7px 16px', borderRadius: 100, cursor: 'pointer', fontSize: 13,
      background: checked ? 'var(--gold-dim)' : 'var(--bg-2)',
      border: `1px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
      color: checked ? 'var(--gold)' : 'var(--text-2)',
      fontWeight: checked ? 600 : 400, transition: 'all 0.15s',
    }}>{label}</button>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
}

// ─── Orders Panel (unchanged) ─────────────────────────────────────────────────

function OrdersPanel({ auth, onLogout }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    try {
      const headers = { 'Authorization': `Bearer ${auth?.token}` }
      const [oRes, sRes] = await Promise.all([
        fetch(`${API}/orders`, { headers }),
        fetch(`${API}/stats`, { headers })
      ])
      if (oRes.status === 401) { onLogout?.(); return }
      const [oData, sData] = await Promise.all([oRes.json(), sRes.json()])
      if (!Array.isArray(oData)) { onLogout?.(); return }
      setOrders(oData); setStats(sData); setLastRefresh(new Date())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 15000); return () => clearInterval(iv) }, [fetchData])

  async function updateStatus(orderId, newStatus) {
    setUpdating(orderId)
    try {
      await fetch(`${API}/orders/${orderId}/status`, {
        headers: { 'Authorization': `Bearer ${auth?.token}` },
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o))
      if (selected?.id === orderId) setSelected(prev => ({ ...prev, order_status: newStatus }))
    } catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.order_status === filter)

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 112px)' }}>
      <aside style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '20px 14px', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stats && (
          <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatBox label="Dziś" value={stats.todayOrders} sub="zamówień" />
              <StatBox label="Przychód" value={`${stats.todayRevenue?.toFixed(0)}zł`} sub="dziś" />
              <StatBox label="Łącznie" value={stats.totalOrders} sub="zamówień" />
              <StatBox label="Aktywne" value={stats.pendingOrders} sub="w toku" accent />
            </div>
          </div>
        )}
        <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px 6px' }}>Filtruj</p>
        {[
          { id: 'all', label: 'Wszystkie', count: orders.length },
          ...Object.entries(STATUS_CONFIG).map(([id, cfg]) => ({ id, label: cfg.label, count: orders.filter(o => o.order_status === id).length }))
        ].map(item => (
          <button key={item.id} onClick={() => setFilter(item.id)} style={{
            padding: '9px 10px', borderRadius: 8,
            background: filter === item.id ? 'var(--gold-dim)' : 'transparent',
            border: `1px solid ${filter === item.id ? 'rgba(201,168,76,0.25)' : 'transparent'}`,
            color: filter === item.id ? 'var(--gold)' : 'var(--text-2)',
            cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{item.id !== 'all' && STATUS_CONFIG[item.id]?.icon + ' '}{item.label}</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{item.count}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', paddingTop: 10 }}>
          {lastRefresh.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </aside>

      <main style={{ flex: 1, padding: '20px 24px', overflow: 'auto' }}>
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div><p>Brak zamówień</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(order => (
              <OrderRow key={order.id} order={order}
                isSelected={selected?.id === order.id} isUpdating={updating === order.id}
                onClick={() => setSelected(selected?.id === order.id ? null : order)}
                onStatusUpdate={updateStatus} />
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--border)', padding: '20px 18px', background: 'var(--bg-1)', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22 }}>#{selected.id}</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <StatusBadge status={selected.order_status} />
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
          <DetailSection title="Klient">
            <p style={{ fontSize: 14, fontWeight: 500 }}>{selected.customer_name}</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>📞 {selected.customer_phone}</p>
          </DetailSection>
          {selected.delivery_address && (
            <DetailSection title="Adres dostawy">
              <p style={{ fontSize: 13, color: 'var(--text-1)' }}>
                📍 {selected.delivery_address.street} {selected.delivery_address.number}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{selected.delivery_address.city}</p>
            </DetailSection>
          )}
          <DetailSection title="Zamówienie">
            {selected.items.map((item, i) => (
              <div key={i} style={{
                marginBottom: 10, paddingBottom: 10,
                borderBottom: i < selected.items.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.qty}× {item.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>{(item.price * item.qty).toFixed(0)} zł</span>
                </div>
                {item.customization && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {item.customization.bread && (
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>🫓 {item.customization.bread}</p>
                    )}
                    {item.customization.sauce && (
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>🥣 {item.customization.sauce}</p>
                    )}
                    {item.customization.veggies?.length > 0 && (
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>🥬 {item.customization.veggies.join(', ')}</p>
                    )}
                    {item.customization.extras?.length > 0 && (
                      <p style={{ fontSize: 11, color: 'var(--gold)' }}>✨ {item.customization.extras.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </DetailSection>
          <DetailSection title="Płatność">
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Metoda: <strong style={{ color: 'var(--text-1)' }}>{selected.payment_method}</strong></p>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Status: <strong style={{ color: selected.payment_status === 'paid' ? 'var(--green)' : 'var(--gold)' }}>{selected.payment_status === 'paid' ? '✓ Opłacone' : '⏳ Oczekuje'}</strong></p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gold)', marginTop: 6 }}>Łącznie: {selected.total.toFixed(0)} zł</p>
          </DetailSection>
          {selected.notes && <DetailSection title="Uwagi"><p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>"{selected.notes}"</p></DetailSection>}
          {NEXT_STATUS[selected.order_status] && (
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }}
              onClick={() => updateStatus(selected.id, NEXT_STATUS[selected.order_status])} disabled={updating === selected.id}>
              {updating === selected.id ? <><div className="spinner" /> Aktualizacja...</> : NEXT_LABEL[selected.order_status]}
            </button>
          )}
          {!['cancelled', 'delivered'].includes(selected.order_status) && (
            <button className="btn-ghost" style={{ width: '100%', marginTop: 8, color: 'var(--red)', borderColor: 'rgba(224,80,80,0.2)' }}
              onClick={() => updateStatus(selected.id, 'cancelled')}>Anuluj zamówienie</button>
          )}
        </div>
      )}
    </div>
  )
}

function OrderRow({ order, isSelected, isUpdating, onClick, onStatusUpdate }) {
  const cfg = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.new
  const time = new Date(order.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  const next = NEXT_STATUS[order.order_status]
  return (
    <div onClick={onClick} style={{
      background: isSelected ? 'var(--bg-2)' : 'var(--bg-1)',
      border: `1px solid ${isSelected ? 'var(--border-hover)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)', padding: '12px 16px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s',
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cfg.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>#{order.id}</span>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{order.customer_name}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{order.items.length} poz. · {order.total.toFixed(0)} zł · {time}</div>
      </div>
      <StatusBadge status={order.order_status} small />
      {next && (
        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); onStatusUpdate(order.id, next) }} disabled={isUpdating}>
          {isUpdating ? <div className="spinner" style={{ width: 13, height: 13 }} /> : `→ ${STATUS_CONFIG[next].label}`}
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status, small }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '3px 10px' : '5px 12px',
      borderRadius: 100, fontSize: small ? 11 : 12, fontWeight: 600, letterSpacing: '0.04em',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  )
}

function StatBox({ label, value, sub, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: accent ? 'var(--gold)' : 'var(--text-1)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', opacity: 0.6 }}>{sub}</div>
    </div>
  )
}

function DetailSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{title}</p>
      {children}
    </div>
  )
}

// ─── Users Panel ──────────────────────────────────────────────────────────────

function UsersPanel({ auth }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('worker')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const headers = { 'Authorization': `Bearer ${auth?.token}`, 'Content-Type': 'application/json' }

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users`, { headers })
      const data = await res.json()
      if (res.ok) setUsers(data)
      else setError(data.error || 'Błąd ładowania')
    } catch { setError('Błąd połączenia') }
    finally { setLoading(false) }
  }

  async function handleAdd() {
    setFormError('')
    if (!newUsername.trim()) return setFormError('Wpisz login')
    if (!newPassword.trim() || newPassword.length < 6) return setFormError('Hasło musi mieć min. 6 znaków')
    setSaving(true)
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST', headers,
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) return setFormError(data.error || 'Błąd dodawania')
      setUsers(prev => [...prev, data])
      setNewUsername(''); setNewPassword(''); setNewRole('worker')
      setShowForm(false)
    } catch { setFormError('Błąd połączenia') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, username) {
    if (!confirm(`Usunąć użytkownika "${username}"?`)) return
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers })
      if (res.ok) setUsers(prev => prev.filter(u => u.id !== id))
    } catch {}
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48, maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, color: 'var(--gold)' }}>Użytkownicy</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Zarządzaj kontami pracowników</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: '10px 18px' }}>
          {showForm ? 'Anuluj' : '+ Dodaj użytkownika'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--gold)',
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 16, color: 'var(--text-1)', marginBottom: 18 }}>Nowy użytkownik</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Login</label>
              <input className="input" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="np. kasjer1" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Hasło startowe</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 znaków" style={{ width: '100%' }} />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Pracownik będzie musiał je zmienić przy pierwszym logowaniu</p>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Rola</label>
              <select className="input" value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%' }}>
                <option value="worker">Pracownik (tylko zamówienia)</option>
                <option value="admin">Admin (pełny dostęp)</option>
              </select>
            </div>
            {formError && (
              <div style={{ background: 'rgba(224,80,80,0.1)', border: '1px solid rgba(224,80,80,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>{formError}</div>
            )}
            <button className="btn-primary" onClick={handleAdd} disabled={saving} style={{ padding: '12px', alignSelf: 'flex-start' }}>
              {saving ? 'Dodawanie...' : 'Dodaj użytkownika'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : error ? (
        <div style={{ color: 'var(--red)', padding: 20 }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(user => (
            <div key={user.id} style={{
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: user.role === 'admin' ? 'var(--gold-dim)' : 'var(--bg-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {user.role === 'admin' ? '👑' : '👤'}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{user.username}</p>
                  <p style={{ fontSize: 12, color: user.role === 'admin' ? 'var(--gold)' : 'var(--text-3)', marginTop: 2 }}>
                    {user.role === 'admin' ? 'Administrator' : 'Pracownik'}
                  </p>
                </div>
              </div>
              {user.username !== auth?.username && (
                <button
                  onClick={() => handleDelete(user.id, user.username)}
                  style={{
                    background: 'none', border: '1px solid rgba(224,80,80,0.3)',
                    color: 'var(--red)', borderRadius: 6, padding: '6px 12px',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Usuń
                </button>
              )}
              {user.username === auth?.username && (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Twoje konto</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}