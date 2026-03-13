const { pool, ensureDB, rowToMenuItem, rowToCustomization, generateOrderNumber,
  VALID_CATEGORIES, hashPassword, verifyPassword, createToken, verifyToken, getTokenFromReq } = require('./_db');

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

async function requireAuth(req, role) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  if (role && payload.role !== role) return null;
  // Verify password hash still matches DB - invalidates token after password change
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [payload.id]);
  if (!rows.length || rows[0].password_hash !== payload.passwordHash) return null;
  return payload;
}


// ── Helper: calculate total from DB prices ────────────────────────────────────
async function calcTotal(items) {
  try {
    let total = 0;
    for (const item of items) {
      const { rows } = await pool.query('SELECT price FROM menu_items WHERE name=$1 AND available=true', [item.name]);
      if (!rows.length) return null;
      let itemPrice = parseFloat(rows[0].price);
      if (item.customization) {
        for (const [cat, val] of Object.entries(item.customization)) {
          // bread/sauce są stringiem, veggies/extras są tablicą
          const ids = Array.isArray(val) ? val : (val ? [val] : []);
          for (const id of ids) {
            if (!id) continue;
            const { rows: cr } = await pool.query(
              'SELECT price FROM customization_items WHERE id=$1 AND category=$2 AND available=true', [id, cat]
            );
            if (cr.length) itemPrice += parseFloat(cr[0].price);
          }
        }
      }
      total += itemPrice * (item.qty || 1);
    }
    return Math.round(total * 100) / 100;
  } catch(e) { console.error('calcTotal error:', e); return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  req.body = await parseBody(req);
  try { await ensureDB(); } catch(e) { return send(res, 500, { error: 'DB init: ' + e.message }); }

  const rawUrl = req.url || '/';
  const parts = rawUrl.split('?')[0].replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const method = req.method;
  const qs = Object.fromEntries(new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : ''));

  // ── POST /api/auth/login ───────────────────────────────────────────────────
  if (parts[0]==='auth' && parts[1]==='login' && method==='POST') {
    const { username, password } = req.body;
    if (!username || !password) return send(res, 400, { error: 'Brakuje danych' });
    const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!rows.length) return send(res, 401, { error: 'Nieprawidłowy login lub hasło' });
    const user = rows[0];
    if (!verifyPassword(password, user.password_hash)) return send(res, 401, { error: 'Nieprawidłowy login lub hasło' });
    const token = createToken({ id: user.id, username: user.username, role: user.role, passwordHash: user.password_hash });
    return send(res, 200, { token, role: user.role, username: user.username, mustChangePass: user.must_change_pass });
  }

  // ── POST /api/auth/change-password ────────────────────────────────────────
  if (parts[0]==='auth' && parts[1]==='change-password' && method==='POST') {
    const user = await requireAuth(req);
    if (!user) return send(res, 401, { error: 'Brak autoryzacji' });
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return send(res, 400, { error: 'Hasło musi mieć min. 6 znaków' });
    await pool.query('UPDATE users SET password_hash=$1, must_change_pass=false WHERE id=$2',
      [hashPassword(newPassword), user.id]);
    return send(res, 200, { success: true });
  }

  // ── GET /api/users ─────────────────────────────────────────────────────────
  if (parts[0]==='users' && !parts[1] && method==='GET') {
    const user = await requireAuth(req, 'admin');
    if (!user) return send(res, 401, { error: 'Brak autoryzacji' });
    const { rows } = await pool.query('SELECT id,username,role,created_at FROM users ORDER BY id');
    return send(res, 200, rows);
  }

  // ── POST /api/users ────────────────────────────────────────────────────────
  if (parts[0]==='users' && !parts[1] && method==='POST') {
    const user = await requireAuth(req, 'admin');
    if (!user) return send(res, 401, { error: 'Brak autoryzacji' });
    const { username, password, role } = req.body;
    if (!username || !password) return send(res, 400, { error: 'Brakuje danych' });
    if (password.length < 6) return send(res, 400, { error: 'Hasło musi mieć min. 6 znaków' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (username, password_hash, role, must_change_pass) VALUES ($1,$2,$3,$4) RETURNING id,username,role`,
        [username, hashPassword(password), role||'worker', true]
      );
      return send(res, 201, rows[0]);
    } catch(e) {
      if (e.code === '23505') return send(res, 400, { error: 'Taki użytkownik już istnieje' });
      return send(res, 500, { error: e.message });
    }
  }

  // ── DELETE /api/users/:id ──────────────────────────────────────────────────
  if (parts[0]==='users' && parts[1] && method==='DELETE') {
    const user = await requireAuth(req, 'admin');
    if (!user) return send(res, 401, { error: 'Brak autoryzacji' });
    if (String(user.id) === parts[1]) return send(res, 400, { error: 'Nie możesz usunąć własnego konta' });
    const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [parts[1]]);
    if (!rowCount) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, { success: true });
  }

  // ── GET /api/menu ──────────────────────────────────────────────────────────
  if (parts[0]==='menu' && parts.length===1 && method==='GET') {
    const { rows: mr } = await pool.query('SELECT * FROM menu_items WHERE available=true ORDER BY id');
    const { rows: cr } = await pool.query('SELECT * FROM customization_items WHERE available=true ORDER BY id');
    const c = { bread:[], sauce:[], veggies:[], extras:[] };
    for (const r of cr) if (c[r.category]) c[r.category].push(rowToCustomization(r));
    return send(res, 200, { menu: mr.map(rowToMenuItem), customizations: c });
  }

  // ── GET /api/menu/items ────────────────────────────────────────────────────
  if (parts[0]==='menu' && parts[1]==='items' && !parts[2] && method==='GET') {
    if (!await requireAuth(req)) return send(res, 401, { error: 'Brak autoryzacji' });
    const { rows } = await pool.query('SELECT * FROM menu_items ORDER BY id');
    return send(res, 200, rows.map(rowToMenuItem));
  }

  // ── POST /api/menu/items ───────────────────────────────────────────────────
  if (parts[0]==='menu' && parts[1]==='items' && !parts[2] && method==='POST') {
    if (!await requireAuth(req, 'admin')) return send(res, 401, { error: 'Brak autoryzacji' });
    const { name, description, price, category, emoji, spicy, popular, available } = req.body;
    if (!name||!description||!price) return send(res, 400, { error: 'Brakuje wymaganych pól' });
    const { rows } = await pool.query(
      `INSERT INTO menu_items (name,description,price,category,emoji,spicy,popular,available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name,description,price,category||'classic',emoji||'🥙',spicy||false,popular||false,available!==false]
    );
    return send(res, 201, rowToMenuItem(rows[0]));
  }

  // ── PUT /api/menu/items/:id ────────────────────────────────────────────────
  if (parts[0]==='menu' && parts[1]==='items' && parts[2] && method==='PUT') {
    if (!await requireAuth(req, 'admin')) return send(res, 401, { error: 'Brak autoryzacji' });
    const id = parts[2];
    const { name, description, price, category, emoji, spicy, popular, available, allowedCustomizations } = req.body;
    const { rows: ex } = await pool.query('SELECT * FROM menu_items WHERE id=$1', [id]);
    if (!ex.length) return send(res, 404, { error: 'Nie znaleziono' });
    const cur = ex[0];
    const { rows } = await pool.query(
      `UPDATE menu_items SET name=$1,description=$2,price=$3,category=$4,emoji=$5,spicy=$6,popular=$7,available=$8,allowed_customizations=$9 WHERE id=$10 RETURNING *`,
      [name??cur.name, description??cur.description,
       price!==undefined?Number(price):parseFloat(cur.price),
       category??cur.category, emoji??cur.emoji,
       spicy!==undefined?Boolean(spicy):cur.spicy,
       popular!==undefined?Boolean(popular):cur.popular,
       available!==undefined?Boolean(available):cur.available,
       allowedCustomizations!==undefined?JSON.stringify(allowedCustomizations):cur.allowed_customizations,
       id]
    );
    return send(res, 200, rowToMenuItem(rows[0]));
  }

  // ── DELETE /api/menu/items/:id ─────────────────────────────────────────────
  if (parts[0]==='menu' && parts[1]==='items' && parts[2] && method==='DELETE') {
    if (!await requireAuth(req, 'admin')) return send(res, 401, { error: 'Brak autoryzacji' });
    const { rowCount } = await pool.query('DELETE FROM menu_items WHERE id=$1', [parts[2]]);
    if (!rowCount) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, { success: true });
  }

  // ── GET /api/customizations/:category ─────────────────────────────────────
  if (parts[0]==='customizations' && parts[1] && !parts[2] && method==='GET') {
    if (!await requireAuth(req)) return send(res, 401, { error: 'Brak autoryzacji' });
    const cat = parts[1];
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zła kategoria' });
    const { rows } = await pool.query('SELECT * FROM customization_items WHERE category=$1 ORDER BY id', [cat]);
    return send(res, 200, rows.map(rowToCustomization));
  }

  // ── POST /api/customizations/:category ────────────────────────────────────
  if (parts[0]==='customizations' && parts[1] && !parts[2] && method==='POST') {
    if (!await requireAuth(req, 'admin')) return send(res, 401, { error: 'Brak autoryzacji' });
    const cat = parts[1];
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zła kategoria' });
    const { label, price, available } = req.body;
    if (!label) return send(res, 400, { error: 'label wymagany' });
    const id = label.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')+'_'+Date.now();
    const { rows } = await pool.query(
      `INSERT INTO customization_items (id,category,label,price,available) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id,cat,label,Number(price)||0,available!==false]
    );
    return send(res, 201, rowToCustomization(rows[0]));
  }

  // ── PUT /api/customizations/:category/:id ─────────────────────────────────
  if (parts[0]==='customizations' && parts[1] && parts[2] && method==='PUT') {
    if (!await requireAuth(req, 'admin')) return send(res, 401, { error: 'Brak autoryzacji' });
    const [,cat,id] = parts;
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zła kategoria' });
    const { label, price, available } = req.body;
    const { rows: ex } = await pool.query('SELECT * FROM customization_items WHERE id=$1 AND category=$2', [id,cat]);
    if (!ex.length) return send(res, 404, { error: 'Nie znaleziono' });
    const cur = ex[0];
    const { rows } = await pool.query(
      `UPDATE customization_items SET label=$1,price=$2,available=$3 WHERE id=$4 AND category=$5 RETURNING *`,
      [label??cur.label, price!==undefined?Number(price):parseFloat(cur.price),
       available!==undefined?Boolean(available):cur.available, id, cat]
    );
    return send(res, 200, rowToCustomization(rows[0]));
  }

  // ── DELETE /api/customizations/:category/:id ───────────────────────────────
  if (parts[0]==='customizations' && parts[1] && parts[2] && method==='DELETE') {
    if (!await requireAuth(req, 'admin')) return send(res, 401, { error: 'Brak autoryzacji' });
    const [,cat,id] = parts;
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zła kategoria' });
    const { rowCount } = await pool.query('DELETE FROM customization_items WHERE id=$1 AND category=$2', [id,cat]);
    if (!rowCount) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, { success: true });
  }

  // ── GET /api/orders ────────────────────────────────────────────────────────
  if (parts[0]==='orders' && !parts[1] && method==='GET') {
    if (!await requireAuth(req)) return send(res, 401, { error: 'Brak autoryzacji' });
    const { status } = qs;
    const q = status ? 'SELECT * FROM orders WHERE order_status=$1 ORDER BY created_at DESC LIMIT 50'
                     : 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 50';
    const { rows } = await pool.query(q, status?[status]:[]);
    return send(res, 200, rows.map(r=>({...r,total:parseFloat(r.total)})));
  }

  // ── POST /api/orders ───────────────────────────────────────────────────────
  if (parts[0]==='orders' && !parts[1] && method==='POST') {
    const { customer_name, customer_phone, delivery_address, items, total, payment_method, notes } = req.body;
    if (!customer_name||!customer_phone||!items||!total||!payment_method)
      return send(res, 400, { error: 'Brakuje danych' });
    const { rows } = await pool.query(
      `INSERT INTO orders (order_number,customer_name,customer_phone,delivery_address,items,total,payment_method,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,order_number`,
      [generateOrderNumber(),customer_name,customer_phone,
       delivery_address?JSON.stringify(delivery_address):null,
       JSON.stringify(items),total,payment_method,notes||null]
    );
    return send(res, 201, { id:rows[0].id, order_number:rows[0].order_number, message:'Zamówienie przyjęte' });
  }

  // ── GET /api/orders/:id ────────────────────────────────────────────────────
  if (parts[0]==='orders' && parts[1] && !parts[2] && method==='GET') {
    if (!await requireAuth(req)) return send(res, 401, { error: 'Brak autoryzacji' });
    const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [parts[1]]);
    if (!rows.length) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, {...rows[0], total:parseFloat(rows[0].total)});
  }

  // ── PATCH /api/orders/:id/status ──────────────────────────────────────────
  if (parts[0]==='orders' && parts[1] && parts[2]==='status' && method==='PATCH') {
    if (!await requireAuth(req)) return send(res, 401, { error: 'Brak autoryzacji' });
    const { status } = req.body;
    const valid = ['new','confirmed','delivered','cancelled'];
    if (!valid.includes(status)) return send(res, 400, { error: 'Zły status' });
    const { rowCount } = await pool.query('UPDATE orders SET order_status=$1 WHERE id=$2', [status,parts[1]]);
    if (!rowCount) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, { success:true, status });
  }

  // ── POST /api/payments/blik ────────────────────────────────────────────────
  if (parts[0]==='payments' && parts[1]==='blik' && method==='POST') {
    const { code, customer_name, customer_phone, items, delivery_address, notes } = req.body;
    if (!code||code.length!==6||!/^\d{6}$/.test(code))
      return send(res, 400, { success:false, error:'Nieprawidłowy kod BLIK' });
    if (!customer_name||!customer_phone||!items||!items.length)
      return send(res, 400, { success:false, error:'Brakuje danych zamówienia' });
    // Oblicz total po stronie serwera z cen w bazie
    const serverTotal = await calcTotal(items);
    if (serverTotal === null) return send(res, 400, { success:false, error:'Nieprawidłowe pozycje zamówienia' });
    await new Promise(r=>setTimeout(r,2000));
    const { rows } = await pool.query(
      `INSERT INTO orders (order_number,customer_name,customer_phone,delivery_address,items,total,payment_method,payment_status,order_status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'paid','new',$8) RETURNING id,order_number`,
      [generateOrderNumber(),customer_name,customer_phone,
       delivery_address?JSON.stringify(delivery_address):null,
       JSON.stringify(items),serverTotal,'BLIK',notes||null]
    );
    return send(res, 200, { success:true, id:rows[0].id, order_number:rows[0].order_number, message:'Płatność BLIK zatwierdzona ✓' });
  }

  // ── POST /api/payments/card ────────────────────────────────────────────────
  if (parts[0]==='payments' && parts[1]==='card' && method==='POST') {
    const { cardNumber, expiry, cvv, cardHolder, customer_name, customer_phone, items, delivery_address, notes } = req.body;
    if (!cardNumber||!expiry||!cvv||!cardHolder)
      return send(res, 400, { success:false, error:'Uzupełnij dane karty' });
    if (!customer_name||!customer_phone||!items||!items.length)
      return send(res, 400, { success:false, error:'Brakuje danych zamówienia' });
    // Oblicz total po stronie serwera z cen w bazie
    const serverTotal = await calcTotal(items);
    if (serverTotal === null) return send(res, 400, { success:false, error:'Nieprawidłowe pozycje zamówienia' });
    await new Promise(r=>setTimeout(r,3000));
    const { rows } = await pool.query(
      `INSERT INTO orders (order_number,customer_name,customer_phone,delivery_address,items,total,payment_method,payment_status,order_status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'paid','new',$8) RETURNING id,order_number`,
      [generateOrderNumber(),customer_name,customer_phone,
       delivery_address?JSON.stringify(delivery_address):null,
       JSON.stringify(items),serverTotal,'Karta',notes||null]
    );
    return send(res, 200, { success:true, id:rows[0].id, order_number:rows[0].order_number,
      message:'Płatność kartą zatwierdzona ✓', last4:cardNumber.replace(/\s/g,'').slice(-4) });
  }

  // ── GET /api/stats ─────────────────────────────────────────────────────────
  if (parts[0]==='stats' && method==='GET') {
    if (!await requireAuth(req)) return send(res, 401, { error: 'Brak autoryzacji' });
    const today = new Date().toISOString().slice(0,10);
    const [t,td,r,rd,p] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM orders WHERE created_at::date=$1',[today]),
      pool.query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'"),
      pool.query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND created_at::date=$1",[today]),
      pool.query("SELECT COUNT(*) FROM orders WHERE order_status IN ('new','confirmed')"),
    ]);
    return send(res, 200, {
      totalOrders:parseInt(t.rows[0].count), todayOrders:parseInt(td.rows[0].count),
      totalRevenue:parseFloat(r.rows[0].coalesce), todayRevenue:parseFloat(rd.rows[0].coalesce),
      pendingOrders:parseInt(p.rows[0].count),
    });
  }

  return send(res, 404, { error:'Not found' });
};