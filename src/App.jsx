import { useState, useEffect } from 'react'
import Menu from './components/Menu.jsx'
import Cart from './components/Cart.jsx'
import Payment from './components/Payment.jsx'
import Success from './components/Success.jsx'
import Admin from './components/Admin.jsx'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function App() {
  const [page, setPage] = useState('menu')         // menu | cart | payment | success | admin
  const [cart, setCart] = useState([])
  const [order, setOrder] = useState(null)          // { id, order_number, total }
  const [menuData, setMenuData] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Fetch menu on mount
  useEffect(() => {
    fetch(`${API}/menu`)
      .then(r => r.json())
      .then(data => { setMenuData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // ── Cart helpers
  function addToCart(item) {
    setCart(prev => {
      const key = item.cartKey
      const existing = prev.find(i => i.cartKey === key)
      if (existing) {
        return prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function updateQty(cartKey, delta) {
    setCart(prev =>
      prev
        .map(i => i.cartKey === cartKey ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    )
  }

  function clearCart() { setCart([]) }

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)
  const cartTotal = cart.reduce((sum, i) => sum + i.itemTotal * i.qty, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🥙</div>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(7,7,7,0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <button
            onClick={() => setPage('menu')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span style={{ fontSize: 28 }}>🥙</span>
            <span style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
            }}>Sultan</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {page === 'admin' ? (
              <button className="btn-ghost" onClick={() => setPage('menu')} style={{ fontSize: 13 }}>
                ← Menu
              </button>
            ) : (
              <>
                <button
                  className="btn-ghost"
                  onClick={() => setPage('admin')}
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  Panel admina
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setPage('cart')}
                  style={{ padding: '10px 20px', position: 'relative' }}
                  disabled={cartCount === 0}
                >
                  🛒 Koszyk
                  {cartCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -8, right: -8,
                      background: 'var(--fire)', color: '#fff',
                      width: 20, height: 20, borderRadius: '50%',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{cartCount}</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Pages */}
      {page === 'menu' && (
        <Menu
          menuData={menuData}
          onAddToCart={addToCart}
          onGoToCart={() => setPage('cart')}
          cartCount={cartCount}
        />
      )}
      {page === 'cart' && (
        <Cart
          cart={cart}
          onUpdateQty={updateQty}
          onBack={() => setPage('menu')}
          onCheckout={() => setPage('payment')}
          cartTotal={cartTotal}
          customizations={menuData?.customizations}
        />
      )}
      {page === 'payment' && (
        <Payment
          cart={cart}
          cartTotal={cartTotal}
          onBack={() => setPage('cart')}
          onSuccess={(orderData) => {
            setOrder(orderData)
            clearCart()
            setPage('success')
          }}
        />
      )}
      {page === 'success' && (
        <Success
          order={order}
          onNewOrder={() => { setOrder(null); setPage('menu') }}
        />
      )}
      {page === 'admin' && (
        <Admin />
      )}
    </div>
  )
}
