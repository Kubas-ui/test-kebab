import { useState } from 'react'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function Payment({ cart, cartTotal, onBack, onSuccess }) {
  const [method, setMethod] = useState('blik') // blik | card
  const [step, setStep] = useState('info')      // info | payment | processing
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryStreet, setDeliveryStreet] = useState('')
  const [deliveryNumber, setDeliveryNumber] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  // BLIK state
  const [blikCode, setBlikCode] = useState('')

  // Card state
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')

  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // ── Format helpers
  function formatCard(val) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }
  function formatExpiry(val) {
    const clean = val.replace(/\D/g, '').slice(0, 4)
    if (clean.length >= 3) return clean.slice(0, 2) + '/' + clean.slice(2)
    return clean
  }
  function formatBlik(val) {
    return val.replace(/\D/g, '').slice(0, 6)
  }
  function formatPhone(val) {
    return val.replace(/\D/g, '').slice(0, 9)
  }

  // ── Step 1: submit customer info & create order
  async function handlePlaceOrder() {
    setError('')
    if (!customerName.trim()) return setError('Podaj imię i nazwisko')
    if (!customerPhone.trim() || customerPhone.length < 9) return setError('Podaj prawidłowy numer telefonu')
    if (!deliveryStreet.trim()) return setError('Podaj ulicę dostawy')
    if (!deliveryNumber.trim()) return setError('Podaj numer domu/mieszkania')
    if (!deliveryCity.trim()) return setError('Podaj miasto')
    if (!termsAccepted) return setError('Zaakceptuj regulamin i politykę prywatności')

    // Walidacja OK - przechodzimy do płatności bez tworzenia zamówienia
    setStep('payment')
  }

  // ── Step 2a: BLIK payment
  async function handleBlikPay() {
    if (blikCode.length !== 6) return setError('Wprowadź 6-cyfrowy kod BLIK')
    setError('')
    setStep('processing')
    try {
      const res = await fetch(`${API}/payments/blik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: blikCode,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: cart.map(i => ({ name: i.name, qty: i.qty, customization: i.customization, price: i.itemTotal })),
          total: cartTotal,
          delivery_address: { street: deliveryStreet.trim(), number: deliveryNumber.trim(), city: deliveryCity.trim() },
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setStep('payment'); return setError(data.error) }
      onSuccess({ id: data.id, order_number: data.order_number, total: cartTotal, payment_method: 'BLIK' })
    } catch (e) {
      setStep('payment'); setError('Błąd płatności')
    }
  }

  // ── Step 2b: Card payment
  async function handleCardPay() {
    if (!cardNumber || !cardHolder || !expiry || !cvv) return setError('Uzupełnij wszystkie pola karty')
    setError('')
    setStep('processing')
    try {
      const res = await fetch(`${API}/payments/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber, cardHolder, expiry, cvv,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: cart.map(i => ({ name: i.name, qty: i.qty, customization: i.customization, price: i.itemTotal })),
          total: cartTotal,
          delivery_address: { street: deliveryStreet.trim(), number: deliveryNumber.trim(), city: deliveryCity.trim() },
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setStep('payment'); return setError(data.error) }
      onSuccess({ id: data.id, order_number: data.order_number, total: cartTotal, payment_method: 'Karta' })
    } catch (e) {
      setStep('payment'); setError('Błąd płatności')
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560, padding: '48px 24px 80px' }}>
      <button onClick={onBack} className="btn-ghost" style={{ marginBottom: 32, fontSize: 13 }}>
        ← Wróć do koszyka
      </button>

      {/* Processing overlay */}
      {step === 'processing' && <ProcessingScreen method={method} />}

      {/* Step: customer info */}
      {step === 'info' && (
        <div className="animate-fade-up">
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 48, fontWeight: 300, marginBottom: 8 }}>
            Zamówienie
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 40 }}>Uzupełnij dane kontaktowe</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Imię i nazwisko">
              <input
                className="input"
                placeholder="Jan Kowalski"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </Field>
            <Field label="Numer telefonu">
              <input
                className="input"
                placeholder="500 100 200"
                value={customerPhone}
                onChange={e => setCustomerPhone(formatPhone(e.target.value))}
                type="tel"
              />
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <p className="input-label" style={{ marginBottom: 10 }}>Adres dostawy</p>
              <div style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                  <input
                    className="input"
                    placeholder="Ulica"
                    value={deliveryStreet}
                    onChange={e => setDeliveryStreet(e.target.value)}
                    style={{ flex: 1, border: 'none', borderRadius: 0, background: 'transparent' }}
                  />
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <input
                    className="input"
                    placeholder="Nr domu/mieszkania"
                    value={deliveryNumber}
                    onChange={e => setDeliveryNumber(e.target.value)}
                    style={{ width: 160, border: 'none', borderRadius: 0, background: 'transparent' }}
                  />
                </div>
                <input
                  className="input"
                  placeholder="Miasto"
                  value={deliveryCity}
                  onChange={e => setDeliveryCity(e.target.value)}
                  style={{ border: 'none', borderRadius: 0, background: 'transparent' }}
                />
              </div>
            </div>

            <Field label="Uwagi do zamówienia (opcjonalnie)">
              <input
                className="input"
                placeholder="np. bez cebuli, poproszę ekstra pieczywo..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </Field>

            {/* Payment method */}
            <div>
              <p className="input-label" style={{ marginBottom: 12 }}>Metoda płatności</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <PayMethodBtn
                  label="BLIK"
                  icon="📱"
                  desc="Szybko i bezpiecznie"
                  selected={method === 'blik'}
                  onClick={() => setMethod('blik')}
                />
                <PayMethodBtn
                  label="Karta"
                  icon="💳"
                  desc="Visa / Mastercard"
                  selected={method === 'card'}
                  onClick={() => setMethod('card')}
                />
              </div>
            </div>

            {/* Order total */}
            <div style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: 'var(--text-2)', fontSize: 14 }}>Do zapłaty</span>
              <span style={{ fontSize: 26, fontWeight: 600, color: 'var(--gold)' }}>{cartTotal.toFixed(0)} zł</span>
            </div>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              cursor: 'pointer', padding: '14px 16px',
              background: termsAccepted ? 'rgba(201,168,76,0.06)' : 'var(--bg-2)',
              border: `1px solid ${termsAccepted ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)', transition: 'all 0.2s',
            }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Zapoznałem/am się z{' '}
                <span style={{ color: 'var(--gold)', textDecoration: 'underline' }}>regulaminem</span>
                {' '}i{' '}
                <span style={{ color: 'var(--gold)', textDecoration: 'underline' }}>polityką prywatności</span>
                {' '}i akceptuję warunki składania zamówień.
              </span>
            </label>

            {error && <ErrorMsg msg={error} />}

            <button className="btn-primary" onClick={handlePlaceOrder} disabled={loading || !termsAccepted} style={{ padding: 16, fontSize: 16, opacity: termsAccepted ? 1 : 0.5 }}>
              {loading ? <><div className="spinner" /> Przetwarzanie...</> : `Dalej → Płatność ${method === 'blik' ? 'BLIK' : 'kartą'}`}
            </button>
          </div>
        </div>
      )}

      {/* Step: payment */}
      {step === 'payment' && method === 'blik' && (
        <BlikScreen
          code={blikCode}
          onChange={val => setBlikCode(formatBlik(val))}
          onPay={handleBlikPay}
          total={cartTotal}
          error={error}
          loading={loading}
        />
      )}
      {step === 'payment' && method === 'card' && (
        <CardScreen
          cardNumber={cardNumber} setCardNumber={val => setCardNumber(formatCard(val))}
          cardHolder={cardHolder} setCardHolder={setCardHolder}
          expiry={expiry} setExpiry={val => setExpiry(formatExpiry(val))}
          cvv={cvv} setCvv={val => setCvv(val.replace(/\D/g, '').slice(0, 3))}
          onPay={handleCardPay}
          total={cartTotal}
          error={error}
        />
      )}
    </div>
  )
}

function BlikScreen({ code, onChange, onPay, total, error, loading }) {
  return (
    <div className="animate-fade-up" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📱</div>
      <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 40, fontWeight: 300, marginBottom: 8 }}>
        Płatność BLIK
      </h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 40 }}>
        Otwórz aplikację bankową i wygeneruj kod BLIK
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 48, height: 64,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-2)',
              border: `2px solid ${code[i] ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 12,
              fontSize: 28, fontWeight: 700,
              color: 'var(--gold)',
              transition: 'border-color 0.15s',
            }}
          >
            {code[i] || ''}
          </div>
        ))}
      </div>

      <input
        className="input"
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.3em', marginBottom: 24 }}
        placeholder="------"
        value={code}
        onChange={e => onChange(e.target.value)}
        maxLength={6}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoFocus
      />

      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', marginBottom: 24,
      }}>
        <span style={{ color: 'var(--text-2)', fontSize: 14 }}>Kwota</span>
        <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{total.toFixed(0)} zł</span>
      </div>

      {error && <ErrorMsg msg={error} />}

      <button
        className="btn-primary"
        onClick={onPay}
        disabled={code.length !== 6 || loading}
        style={{ width: '100%', padding: 16, fontSize: 16 }}
      >
        {loading ? <><div className="spinner" /> Weryfikacja...</> : 'Zatwierdź płatność BLIK'}
      </button>
    </div>
  )
}

function CardScreen({ cardNumber, setCardNumber, cardHolder, setCardHolder, expiry, setExpiry, cvv, setCvv, onPay, total, error }) {
  return (
    <div className="animate-fade-up">
      <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 40, fontWeight: 300, marginBottom: 8 }}>
        Płatność kartą
      </h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 36 }}>Twoje dane są bezpieczne i szyfrowane</p>

      {/* Card preview */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1508 0%, #2a2010 50%, #1a1508 100%)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 16, padding: '28px 28px 24px',
        marginBottom: 28,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(201,168,76,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(201,168,76,0.03)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 28, marginBottom: 24 }}>💳</div>
          <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, letterSpacing: '0.15em', marginBottom: 20, color: 'var(--text-1)' }}>
            {cardNumber || '•••• •••• •••• ••••'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Właściciel</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{cardHolder || 'IMIĘ NAZWISKO'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ważna do</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{expiry || 'MM/RR'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Numer karty">
          <input
            className="input"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={e => setCardNumber(e.target.value)}
            type="tel"
            inputMode="numeric"
          />
        </Field>
        <Field label="Imię i nazwisko na karcie">
          <input
            className="input"
            placeholder="Jan Kowalski"
            value={cardHolder}
            onChange={e => setCardHolder(e.target.value.toUpperCase())}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Data ważności">
            <input
              className="input"
              placeholder="MM/RR"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              maxLength={5}
              type="tel"
            />
          </Field>
          <Field label="CVV">
            <input
              className="input"
              placeholder="•••"
              value={cvv}
              onChange={e => setCvv(e.target.value)}
              maxLength={3}
              type="tel"
            />
          </Field>
        </div>

        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '14px 20px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ color: 'var(--text-2)', fontSize: 14 }}>Do zapłaty</span>
          <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{total.toFixed(0)} zł</span>
        </div>

        {error && <ErrorMsg msg={error} />}

        <button className="btn-primary" onClick={onPay} style={{ padding: 16, fontSize: 16 }}>
          🔒 Zapłać {total.toFixed(0)} zł
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
          Szyfrowanie SSL 256-bit · Dane karty nie są przechowywane
        </p>
      </div>
    </div>
  )
}

function ProcessingScreen({ method }) {
  return (
    <div className="modal-overlay" style={{ flexDirection: 'column', gap: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 60, animation: 'pulse 1.2s infinite' }}>
        {method === 'blik' ? '📱' : '💳'}
      </div>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 32 }}>Przetwarzanie płatności…</h2>
      <p style={{ color: 'var(--text-2)' }}>
        {method === 'blik' ? 'Oczekiwanie na potwierdzenie w aplikacji bankowej' : 'Weryfikacja danych karty'}
      </p>
    </div>
  )
}

function PayMethodBtn({ label, icon, desc, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: 'var(--radius)',
        background: selected ? 'var(--gold-dim)' : 'var(--bg-2)',
        border: `1.5px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: selected ? 'var(--gold)' : 'var(--text-1)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{desc}</div>
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="input-label">{label}</p>
      {children}
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div style={{
      background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.25)',
      borderRadius: 'var(--radius)', padding: '10px 16px',
      fontSize: 14, color: 'var(--red)',
    }}>
      ⚠ {msg}
    </div>
  )
}