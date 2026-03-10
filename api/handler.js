const { pool, ensureDB, rowToMenuItem, rowToCustomization, generateOrderNumber, VALID_CATEGORIES } = require('./_db');

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  req.body = await parseBody(req);
  try { await ensureDB(); } catch(e) { return send(res, 500, { error: 'DB init: ' + e.message }); }

  const rawUrl = req.url || '/';
const parts = rawUrl.split('?')[0].replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const method = req.method;
  const qs = { ...req.query }; delete qs.params;

  if (parts[0]==='menu' && parts.length===1 && method==='GET') {
    const { rows: mr } = await pool.query('SELECT * FROM menu_items WHERE available=true ORDER BY id');
    const { rows: cr } = await pool.query('SELECT * FROM customization_items WHERE available=true ORDER BY id');
    const c = { bread:[], sauce:[], veggies:[], extras:[] };
    for (const r of cr) if (c[r.category]) c[r.category].push(rowToCustomization(r));
    return send(res, 200, { menu: mr.map(rowToMenuItem), customizations: c });
  }

  if (parts[0]==='menu' && parts[1]==='items' && !parts[2] && method==='GET') {
    const { rows } = await pool.query('SELECT * FROM menu_items ORDER BY id');
    return send(res, 200, rows.map(rowToMenuItem));
  }

  if (parts[0]==='menu' && parts[1]==='items' && !parts[2] && method==='POST') {
    const { name, description, price, category, emoji, spicy, popular, available } = req.body;
    if (!name||!description||!price) return send(res, 400, { error: 'Brakuje wymaganych pol' });
    const { rows } = await pool.query(
      `INSERT INTO menu_items (name,description,price,category,emoji,spicy,popular,available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name,description,price,category||'classic',emoji||'🥙',spicy||false,popular||false,available!==false]
    );
    return send(res, 201, rowToMenuItem(rows[0]));
  }

  if (parts[0]==='menu' && parts[1]==='items' && parts[2] && method==='PUT') {
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

  if (parts[0]==='menu' && parts[1]==='items' && parts[2] && method==='DELETE') {
    const { rowCount } = await pool.query('DELETE FROM menu_items WHERE id=$1', [parts[2]]);
    if (!rowCount) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, { success: true });
  }

  if (parts[0]==='customizations' && parts[1] && !parts[2] && method==='GET') {
    const cat = parts[1];
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zla kategoria' });
    const { rows } = await pool.query('SELECT * FROM customization_items WHERE category=$1 ORDER BY id', [cat]);
    return send(res, 200, rows.map(rowToCustomization));
  }

  if (parts[0]==='customizations' && parts[1] && !parts[2] && method==='POST') {
    const cat = parts[1];
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zla kategoria' });
    const { label, price, available } = req.body;
    if (!label) return send(res, 400, { error: 'label wymagany' });
    const id = label.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')+'_'+Date.now();
    const { rows } = await pool.query(
      `INSERT INTO customization_items (id,category,label,price,available) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id,cat,label,Number(price)||0,available!==false]
    );
    return send(res, 201, rowToCustomization(rows[0]));
  }

  if (parts[0]==='customizations' && parts[1] && parts[2] && method==='PUT') {
    const [,cat,id] = parts;
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zla kategoria' });
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

  if (parts[0]==='customizations' && parts[1] && parts[2] && method==='DELETE') {
    const [,cat,id] = parts;
    if (!VALID_CATEGORIES.includes(cat)) return send(res, 400, { error: 'Zla kategoria' });
    const { rowCount } = await pool.query('DELETE FROM customization_items WHERE id=$1 AND category=$2', [id,cat]);
    if (!rowCount) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, { success: true });
  }

  if (parts[0]==='orders' && !parts[1] && method==='GET') {
    const { status } = qs;
    const q = status ? 'SELECT * FROM orders WHERE order_status=$1 ORDER BY created_at DESC LIMIT 50'
                     : 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 50';
    const { rows } = await pool.query(q, status?[status]:[]);
    return send(res, 200, rows.map(r=>({...r,total:parseFloat(r.total)})));
  }

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
    return send(res, 201, { id:rows[0].id, order_number:rows[0].order_number, message:'Zamowienie przyjete' });
  }

  if (parts[0]==='orders' && parts[1] && !parts[2] && method==='GET') {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [parts[1]]);
    if (!rows.length) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, {...rows[0], total:parseFloat(rows[0].total)});
  }

  if (parts[0]==='orders' && parts[1] && parts[2]==='status' && method==='PATCH') {
    const { status } = req.body;
    const valid = ['new','confirmed','preparing','ready','delivered','cancelled'];
    if (!valid.includes(status)) return send(res, 400, { error: 'Zly status' });
    const { rowCount } = await pool.query('UPDATE orders SET order_status=$1 WHERE id=$2', [status,parts[1]]);
    if (!rowCount) return send(res, 404, { error: 'Nie znaleziono' });
    return send(res, 200, { success:true, status });
  }

  if (parts[0]==='payments' && parts[1]==='blik' && method==='POST') {
    const { code, orderId } = req.body;
    if (!code||code.length!==6||!/^\d{6}$/.test(code))
      return send(res, 400, { success:false, error:'Nieprawidlowy BLIK' });
    await new Promise(r=>setTimeout(r,2000));
    await pool.query("UPDATE orders SET payment_status='paid',order_status='confirmed' WHERE id=$1",[orderId]);
    return send(res, 200, { success:true, message:'Platnosc BLIK zatwierdzona', transactionId:`BLIK-${Date.now()}` });
  }

  if (parts[0]==='payments' && parts[1]==='card' && method==='POST') {
    const { cardNumber, expiry, cvv, cardHolder, orderId } = req.body;
    if (!cardNumber||!expiry||!cvv||!cardHolder)
      return send(res, 400, { success:false, error:'Uzupelnij dane karty' });
    await new Promise(r=>setTimeout(r,3000));
    await pool.query("UPDATE orders SET payment_status='paid',order_status='confirmed' WHERE id=$1",[orderId]);
    return send(res, 200, { success:true, message:'Platnosc karta zatwierdzona',
      transactionId:`CARD-${Date.now()}`, last4:cardNumber.replace(/\s/g,'').slice(-4) });
  }

  if (parts[0]==='stats' && method==='GET') {
    const today = new Date().toISOString().slice(0,10);
    const [t,td,r,rd,p] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM orders WHERE created_at::date=$1',[today]),
      pool.query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'"),
      pool.query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND created_at::date=$1",[today]),
      pool.query("SELECT COUNT(*) FROM orders WHERE order_status IN ('new','confirmed','preparing')"),
    ]);
    return send(res, 200, {
      totalOrders:parseInt(t.rows[0].count), todayOrders:parseInt(td.rows[0].count),
      totalRevenue:parseFloat(r.rows[0].coalesce), todayRevenue:parseFloat(rd.rows[0].coalesce),
      pendingOrders:parseInt(p.rows[0].count),
    });
  }

  return send(res, 404, { error:'Not found' });
};
