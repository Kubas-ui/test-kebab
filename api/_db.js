const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  // Support old SHA-256 format (no colon separator with 16-char hex salt)
  if (!stored.includes(':')) return false;
  const [salt] = stored.split(':');
  const check = hashPassword(password, salt);
  return check === stored;
}

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`CREATE TABLE IF NOT EXISTS orders (
      id               SERIAL PRIMARY KEY,
      order_number     TEXT NOT NULL,
      customer_name    TEXT NOT NULL,
      customer_phone   TEXT NOT NULL,
      delivery_address JSONB,
      items            JSONB NOT NULL,
      total            NUMERIC(10,2) NOT NULL,
      payment_method   TEXT NOT NULL,
      payment_status   TEXT NOT NULL DEFAULT 'pending',
      order_status     TEXT NOT NULL DEFAULT 'new',
      notes            TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS menu_items (
      id                     SERIAL PRIMARY KEY,
      name                   TEXT NOT NULL,
      description            TEXT NOT NULL,
      price                  NUMERIC(10,2) NOT NULL,
      category               TEXT NOT NULL DEFAULT 'classic',
      emoji                  TEXT NOT NULL DEFAULT '🥙',
      spicy                  BOOLEAN NOT NULL DEFAULT false,
      popular                BOOLEAN NOT NULL DEFAULT false,
      available              BOOLEAN NOT NULL DEFAULT true,
      allowed_customizations JSONB
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS customization_items (
      id        TEXT NOT NULL,
      category  TEXT NOT NULL,
      label     TEXT NOT NULL,
      price     NUMERIC(10,2) NOT NULL DEFAULT 0,
      available BOOLEAN NOT NULL DEFAULT true,
      PRIMARY KEY (id, category)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id                SERIAL PRIMARY KEY,
      username          TEXT NOT NULL UNIQUE,
      password_hash     TEXT NOT NULL,
      role              TEXT NOT NULL DEFAULT 'worker',
      must_change_pass  BOOLEAN NOT NULL DEFAULT false,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )`);
    // Migrate column if needed (old installations)
    await client.query(`ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT`).catch(()=>{});

    // Seed menu
    const { rows: m } = await client.query('SELECT COUNT(*) FROM menu_items');
    if (parseInt(m[0].count) === 0) {
      const ms = [
        ['Kebab Klasyczny','Soczysty doner wołowy z grilla, chrupiące warzywa, sos czosnkowy',24,'classic','🥙',false,true],
        ['Kebab Ostry','Doner wołowy z ostrą papryką, jalapeño i pikantnym sosem harissa',26,'spicy','🌶️',true,true],
        ['Kebab Kurczak','Marynowany kurczak z cytryną i ziołami, lekki sos jogurtowy',24,'chicken','🍗',false,false],
        ['Kebab Mix','Mieszanka wołowiny i kurczaka, podwójna porcja mięsa, dwa sosy',30,'mix','🔥',false,true],
        ['Durum Wrap','Cienka tortilla z kurczakiem, rukolą, pomidorkami i tzatziki',26,'wrap','🌯',false,false],
        ['Kebab Vege','Złocisty falafel, halloumi, świeże warzywa, sos tahini',24,'vege','🥗',false,false],
        ['Kebab Royal','Ekskluzywna wołowina wagyu, trufle, sos z granatów, premium bułka',45,'premium','👑',false,false],
      ];
      for (const [name,desc,price,cat,emoji,spicy,popular] of ms) {
        await client.query(
          `INSERT INTO menu_items (name,description,price,category,emoji,spicy,popular) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [name,desc,price,cat,emoji,spicy,popular]
        );
      }
    }

    // Seed customizations
    const { rows: c } = await client.query('SELECT COUNT(*) FROM customization_items');
    if (parseInt(c[0].count) === 0) {
      const cs = [
        ['bun','bread','Bułka pita',0],['durum','bread','Durum (tortilla)',0],
        ['plate','bread','Talerz (bez pieczywa)',0],['bread','bread','Chleb turecki',1],
        ['garlic','sauce','Czosnkowy',0],['spicy','sauce','Ostry',0],
        ['mild','sauce','Łagodny',0],['tzatziki','sauce','Tzatziki',0],
        ['bbq','sauce','BBQ',0],['harissa','sauce','Harissa',1],
        ['lettuce','veggies','Sałata',0],['tomato','veggies','Pomidor',0],
        ['cucumber','veggies','Ogórek',0],['onion','veggies','Cebula',0],
        ['pepper','veggies','Papryka',0],['cabbage','veggies','Kapusta',0],
        ['corn','veggies','Kukurydza',0],['cheese','extras','Ser żółty',3],
        ['jalapeno','extras','Jalapeño',2],['extra_meat','extras','Podwójne mięso',8],
        ['egg','extras','Jajko sadzone',3],['avocado','extras','Awokado',5],
      ];
      for (const [id,cat,label,price] of cs) {
        await client.query(`INSERT INTO customization_items (id,category,label,price) VALUES ($1,$2,$3,$4)`,
          [id,cat,label,price]);
      }
    }

    // Seed/sync admin password from env
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) throw new Error('Brak zmiennej środowiskowej ADMIN_PASSWORD — ustaw ją w Vercel przed deployem');
    const { rows: u } = await client.query('SELECT * FROM users WHERE username=$1', ['admin']);
    if (u.length === 0) {
      // Nowa instalacja — twórz admina z hasłem z env
      await client.query(
        `INSERT INTO users (username, password_hash, role, must_change_pass) VALUES ($1,$2,$3,$4)`,
        ['admin', hashPassword(adminPassword), 'admin', true]
      );
    } else {
      // Migracja starych haseł SHA-256 (bez dwukropka) na PBKDF2
      if (!u[0].password_hash.includes(':')) {
        await client.query(
          `UPDATE users SET password_hash=$1, must_change_pass=true WHERE username='admin'`,
          [hashPassword(adminPassword)]
        );
      } else if (u[0].must_change_pass) {
        // Admin jeszcze nie zmienił hasła — aktualizuj z env
        await client.query(
          `UPDATE users SET password_hash=$1 WHERE username='admin'`,
          [hashPassword(adminPassword)]
        );
      }
    }
    // Migracja wszystkich innych użytkowników ze starym hashem
    const { rows: oldUsers } = await client.query(
      `SELECT id FROM users WHERE username!='admin' AND password_hash NOT LIKE '%:%'`
    );
    for (const ou of oldUsers) {
      // Reset hasła do tymczasowego — muszą zmienić przy następnym logowaniu
      await client.query(
        `UPDATE users SET password_hash=$1, must_change_pass=true WHERE id=$2`,
        [hashPassword('zmien_haslo_' + ou.id), ou.id]
      );
    }

    await client.query('COMMIT');
  } catch(e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function rowToMenuItem(r) {
  return { id:r.id, name:r.name, description:r.description, price:parseFloat(r.price),
    category:r.category, emoji:r.emoji, spicy:r.spicy, popular:r.popular,
    available:r.available, allowedCustomizations:r.allowed_customizations||null };
}
function rowToCustomization(r) {
  return { id:r.id, label:r.label, price:parseFloat(r.price), available:r.available };
}
function generateOrderNumber() {
  return `KB-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9000)+1000}`;
}

// Simple JWT using built-in crypto
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('[SULTAN] Brak JWT_SECRET w env - ustaw zmienną w Vercel!');
  return 'sultan_default_jwt_' + require('crypto').randomBytes(8).toString('hex');
})();

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24*60*60*1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function getTokenFromReq(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

const VALID_CATEGORIES = ['bread','sauce','veggies','extras'];
let dbReady = false;
async function ensureDB() {
  if (!dbReady) { await initDB(); dbReady = true; }
}

module.exports = { pool, ensureDB, rowToMenuItem, rowToCustomization, generateOrderNumber,
  VALID_CATEGORIES, hashPassword, verifyPassword, createToken, verifyToken, getTokenFromReq };