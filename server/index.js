'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const db = require('./db');
const restaurants = require('./restaurants');
const { router: authRouter, requireAuth, optionalAuth } = require('./auth');

restaurants.loadSeed();

const app = express();
const PORT = process.env.PORT || 3000;

// Public JavaScript key for the Kakao Maps SDK (client-side map rendering only).
const KAKAO_JS_KEY = process.env.KAKAO_JS_KEY || 'd5d7efa1ad41628743fc4719d62b9b2b';

app.use(express.json());
app.use(cookieParser());

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

app.get('/api/config', (_req, res) => {
  res.json({
    kakaoJsKey: KAKAO_JS_KEY,
    kakaoLive: restaurants.kakaoEnabled(),
    categories: restaurants.getCategories(),
    centroid: restaurants.getCentroid(),
  });
});

app.get('/api/restaurants', async (req, res) => {
  try {
    const list = await restaurants.queryRestaurants({
      lat: num(req.query.lat),
      lng: num(req.query.lng),
      category: req.query.category,
      maxPrice: num(req.query.maxPrice),
      radius: num(req.query.radius) ?? 3000,
      limit: num(req.query.limit) ?? 60,
    });
    res.json({ count: list.length, restaurants: list, live: restaurants.kakaoEnabled() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '식당 정보를 불러오지 못했습니다.' });
  }
});

app.get('/api/recommend', async (req, res) => {
  try {
    const mode = req.query.mode === 'menu' ? 'menu' : 'random';
    const maxPrice = num(req.query.maxPrice);
    const category = req.query.category;

    if (mode === 'menu') {
      if (!category || category === '전체') {
        return res.status(400).json({ error: '카테고리를 선택해주세요.' });
      }
      if (!Number.isFinite(maxPrice)) {
        return res.status(400).json({ error: '예산을 입력해주세요.' });
      }
    }

    const list = await restaurants.queryRestaurants({
      lat: num(req.query.lat),
      lng: num(req.query.lng),
      category: mode === 'menu' ? category : category && category !== '전체' ? category : undefined,
      maxPrice: mode === 'menu' ? maxPrice : undefined,
      radius: num(req.query.radius) ?? 5000,
      limit: 120,
    });

    if (!list.length) {
      return res.status(404).json({ error: '조건에 맞는 식당을 찾지 못했습니다. 조건을 바꿔보세요.' });
    }

    // For random mode, prefer restaurants that have menu data for a richer result.
    let pool = list;
    if (mode === 'random') {
      const withMenu = list.filter((r) => r.menuItems.length > 0);
      if (withMenu.length) pool = withMenu;
    }

    const restaurant = pool[Math.floor(Math.random() * pool.length)];
    const menu = mode === 'menu' ? restaurants.affordableMenu(restaurant, maxPrice) : restaurant.menuItems;

    res.json({ mode, restaurant, menu, live: restaurants.kakaoEnabled() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '추천에 실패했습니다.' });
  }
});

app.use('/api/auth', authRouter);

// ---- History (requires login) ----
const insertHistory = db.prepare(`
  INSERT INTO history
    (user_id, restaurant_id, restaurant_name, category, address, rating, lat, lng, kakao_url, category_image, mode, picked_menu)
  VALUES
    (@user_id, @restaurant_id, @restaurant_name, @category, @address, @rating, @lat, @lng, @kakao_url, @category_image, @mode, @picked_menu)
`);
const listHistory = db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100');
const deleteHistoryItem = db.prepare('DELETE FROM history WHERE id = ? AND user_id = ?');
const clearHistory = db.prepare('DELETE FROM history WHERE user_id = ?');

app.post('/api/history', requireAuth, (req, res) => {
  const r = req.body || {};
  if (!r.restaurant_name) {
    return res.status(400).json({ error: '저장할 식당 정보가 없습니다.' });
  }
  const info = insertHistory.run({
    user_id: req.user.id,
    restaurant_id: r.restaurant_id || null,
    restaurant_name: r.restaurant_name,
    category: r.category || null,
    address: r.address || null,
    rating: Number.isFinite(r.rating) ? r.rating : null,
    lat: Number.isFinite(r.lat) ? r.lat : null,
    lng: Number.isFinite(r.lng) ? r.lng : null,
    kakao_url: r.kakao_url || null,
    category_image: r.category_image || null,
    mode: r.mode || null,
    picked_menu: r.picked_menu ? JSON.stringify(r.picked_menu) : null,
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get('/api/history', requireAuth, (req, res) => {
  const rows = listHistory.all(req.user.id).map((row) => ({
    ...row,
    picked_menu: row.picked_menu ? JSON.parse(row.picked_menu) : [],
  }));
  res.json({ history: rows });
});

app.delete('/api/history/:id', requireAuth, (req, res) => {
  deleteHistoryItem.run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/history', requireAuth, (req, res) => {
  clearHistory.run(req.user.id);
  res.json({ ok: true });
});

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`오밥추 server running on http://localhost:${PORT}`);
  console.log(`  seeded restaurants: ${restaurants.getCategories().length} categories`);
  console.log(`  Kakao live search: ${restaurants.kakaoEnabled() ? 'ON' : 'OFF (using local dataset)'}`);
});

module.exports = app;
