// Shared helpers for 오밥추 frontend.
const OB = {
  config: null,
  user: null,
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `요청 실패 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function loadConfig() {
  if (!OB.config) OB.config = await api('/api/config');
  return OB.config;
}

async function loadUser() {
  try {
    const { user } = await api('/api/auth/me');
    OB.user = user;
  } catch {
    OB.user = null;
  }
  return OB.user;
}

// ---- Toast ----
function toast(msg, type = '') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

// ---- Header / nav ----
async function renderHeader(active) {
  await loadUser();
  const links = [
    { href: '/', label: '홈', key: 'home' },
    { href: '/recommend.html', label: '추천받기', key: 'recommend' },
    { href: '/history.html', label: '추천기록', key: 'history' },
  ];
  const navLinks = links
    .map((l) => `<a href="${l.href}" class="${active === l.key ? 'active' : ''}">${l.label}</a>`)
    .join('');

  const userArea = OB.user
    ? `<span class="who">👋 <b>${escapeHtml(OB.user.username)}</b></span>
       <button class="btn btn-ghost" id="logoutBtn">로그아웃</button>`
    : `<a href="/login.html" class="btn btn-ghost">로그인</a>
       <a href="/register.html" class="btn btn-primary">회원가입</a>`;

  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container nav">
      <a href="/" class="brand">
        <span class="logo-dot">🍚</span>
        <span class="brand-text">오밥추 <b></b></span>
      </a>
      <nav class="nav-links">${navLinks}</nav>
      <div class="nav-user">${userArea}</div>
    </div>`;
  document.body.prepend(header);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      toast('로그아웃되었습니다.', 'ok');
      setTimeout(() => (location.href = '/'), 500);
    });
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ---- Geolocation (falls back to dataset centroid) ----
function getLocation() {
  return new Promise(async (resolve) => {
    const cfg = await loadConfig();
    const fallback = { ...cfg.centroid, precise: false };
    if (!navigator.geolocation) return resolve(fallback);
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(fallback); } }, 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precise: true });
      },
      () => { if (!done) { done = true; clearTimeout(timer); resolve(fallback); } },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  });
}

function starHtml(rating) {
  const r = Number(rating) || 0;
  let out = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(r)) out += '★';
    else if (i - r <= 0.5) out += '⯪';
    else out += '<span class="empty">★</span>';
  }
  return out;
}
