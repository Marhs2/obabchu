'use strict';

const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'data', 'restaurants.seed.json');

const CATEGORY_IMAGES = {
  '한식': '/images/categories/한식.webp',
  '중식': '/images/categories/중식.jpg',
  '일식': '/images/categories/일식.jpg',
  '양식': '/images/categories/양식.jpg',
  '분식': '/images/categories/분식.webp',
  '주점': '/images/categories/주점.jpg',
  '카페/디저트': '/images/categories/카페.jpg',
  '치킨': '/images/categories/치킨.jpg',
};

const DEFAULT_IMAGE = '/images/categories/양식.jpg';

function categoryImage(category) {
  return CATEGORY_IMAGES[category] || DEFAULT_IMAGE;
}

// Kakao category_group_code -> our category label (used when the live Kakao provider is enabled)
const KAKAO_GROUP_BY_CATEGORY = {
  '카페/디저트': 'CE7',
};

function parsePrice(raw) {
  if (raw == null) return null;
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance in meters
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function normalizeSeedRecord(r) {
  const lat = parseFloat(r.location && r.location.latitude);
  const lng = parseFloat(r.location && r.location.longitude);
  const menuItems = Array.isArray(r.menu_items)
    ? r.menu_items
        .map((m) => ({
          name: m.name,
          priceLabel: m.price,
          price: parsePrice(m.price),
        }))
        .filter((m) => m.name)
    : [];
  const prices = menuItems.map((m) => m.price).filter((p) => Number.isFinite(p));
  return {
    id: String(r.place_id),
    name: r.restaurant_name,
    category: r.category,
    address: r.address,
    phone: r.phone_number || null,
    rating: r.overall_rating ? parseFloat(r.overall_rating) : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    menuItems,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    kakaoUrl: r.kakao_map_url || (r.place_id ? `https://place.map.kakao.com/${r.place_id}` : null),
    categoryImage: categoryImage(r.category),
    source: 'local',
  };
}

let SEED = [];
let CENTROID = { lat: 37.5326, lng: 126.9906 }; // Yongsan fallback
let CATEGORIES = [];

function loadSeed() {
  const raw = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  SEED = raw.map(normalizeSeedRecord).filter((r) => r.lat != null && r.lng != null);

  const withCoords = SEED.filter((r) => r.lat && r.lng);
  if (withCoords.length) {
    CENTROID = {
      lat: withCoords.reduce((s, r) => s + r.lat, 0) / withCoords.length,
      lng: withCoords.reduce((s, r) => s + r.lng, 0) / withCoords.length,
    };
  }
  CATEGORIES = [...new Set(SEED.map((r) => r.category))].sort();
  return SEED;
}

function getCentroid() {
  return CENTROID;
}

function getCategories() {
  return CATEGORIES;
}

function kakaoEnabled() {
  return Boolean(process.env.KAKAO_REST_API_KEY);
}

// Live Kakao Local API provider. Returns normalized restaurants (without menu/price data,
// which Kakao's category API does not expose).
async function fetchKakao({ lat, lng, category, radius }) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return [];
  const group = KAKAO_GROUP_BY_CATEGORY[category] || 'FD6'; // FD6 = 음식점
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
  url.searchParams.set('category_group_code', group);
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', String(Math.min(radius || 2000, 20000)));
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', '15');

  const results = [];
  try {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (!res.ok) {
      console.warn(`[kakao] request failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    for (const doc of data.documents || []) {
      const klat = parseFloat(doc.y);
      const klng = parseFloat(doc.x);
      results.push({
        id: `kakao:${doc.id}`,
        name: doc.place_name,
        category: (doc.category_name || '').split('>').pop().trim() || category || '음식점',
        address: doc.road_address_name || doc.address_name,
        phone: doc.phone || null,
        rating: null,
        lat: klat,
        lng: klng,
        menuItems: [],
        minPrice: null,
        maxPrice: null,
        kakaoUrl: doc.place_url,
        categoryImage: categoryImage(category),
        source: 'kakao',
      });
    }
  } catch (err) {
    console.warn('[kakao] fetch error:', err.message);
  }
  return results;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const key = `${r.name}@${r.lat && r.lat.toFixed(4)},${r.lng && r.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Real-time restaurant query. Distance is computed per request against the caller's
 * live coordinates. When a Kakao REST key is configured, live Kakao places are merged in.
 */
async function queryRestaurants(opts = {}) {
  const {
    lat: rawLat,
    lng: rawLng,
    category,
    maxPrice,
    radius = 3000,
    limit = 60,
    liveOnly = false,
  } = opts;

  const lat = Number.isFinite(rawLat) ? rawLat : CENTROID.lat;
  const lng = Number.isFinite(rawLng) ? rawLng : CENTROID.lng;

  let pool = liveOnly ? [] : SEED.slice();

  if (kakaoEnabled()) {
    const live = await fetchKakao({ lat, lng, category, radius });
    pool = dedupe([...live, ...pool]);
  }

  let list = pool.map((r) => ({
    ...r,
    distance: r.lat != null && r.lng != null ? distanceMeters(lat, lng, r.lat, r.lng) : null,
  }));

  if (category && category !== '전체') {
    list = list.filter((r) => r.category === category);
  }

  if (Number.isFinite(radius)) {
    list = list.filter((r) => r.distance == null || r.distance <= radius);
  }

  if (Number.isFinite(maxPrice)) {
    // Keep restaurants that have at least one affordable priced menu item.
    // Live results without menu data are kept only when no budget is enforced.
    list = list.filter(
      (r) => r.minPrice != null && r.menuItems.some((m) => Number.isFinite(m.price) && m.price <= maxPrice)
    );
  }

  list.sort((a, b) => {
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  });

  return list.slice(0, limit);
}

function affordableMenu(restaurant, maxPrice) {
  if (!Number.isFinite(maxPrice)) return restaurant.menuItems;
  return restaurant.menuItems.filter((m) => Number.isFinite(m.price) && m.price <= maxPrice);
}

module.exports = {
  loadSeed,
  getCentroid,
  getCategories,
  queryRestaurants,
  affordableMenu,
  distanceMeters,
  categoryImage,
  kakaoEnabled,
};
