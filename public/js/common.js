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
  try { data = await res.json(); } catch { /* empty body on some auth routes */ }
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

function toast(msg, type = '') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    wrap.setAttribute('role', 'status');
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

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('obabchu-theme', theme);
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.setAttribute('aria-label', theme === 'dark' ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기');
  }
}

async function renderHeader(active) {
  await loadUser();
  const links = [
    { href: '/', label: '홈', key: 'home' },
    { href: '/recommend.html', label: '추천', key: 'recommend' },
    { href: '/history.html', label: '기록', key: 'history' },
  ];
  const navLinks = links
    .map((l) => {
      const current = active === l.key ? ' aria-current="page"' : '';
      return `<a href="${l.href}"${current}>${l.label}</a>`;
    })
    .join('');

  const userArea = OB.user
    ? `<span class="who"><b>${escapeHtml(OB.user.username)}</b></span>
       <button type="button" class="btn btn-ghost" id="logoutBtn">로그아웃</button>`
    : `<a href="/login.html" class="btn btn-ghost">로그인</a>
       <a href="/register.html" class="btn btn-primary">회원가입</a>`;

  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container nav">
      <a href="/" class="brand">
        <span class="stamp" aria-hidden="true">밥</span>
        <span class="brand-text">오밥추</span>
      </a>
      <nav class="nav-links" aria-label="주요 메뉴">${navLinks}</nav>
      <div class="nav-tools">
        <button type="button" class="icon-btn" id="themeBtn" aria-pressed="false" aria-label="어두운 화면으로 바꾸기">
          <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3a8 8 0 1 0 6 13 7 7 0 0 1-6-13z"/></svg>
          <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>
        </button>
        ${userArea}
      </div>
    </div>`;
  document.body.prepend(header);

  const dock = document.createElement('nav');
  dock.className = 'dock';
  dock.setAttribute('aria-label', '하단 메뉴');
  dock.innerHTML = navLinks;
  document.body.appendChild(dock);

  setTheme(currentTheme());

  document.getElementById('themeBtn').addEventListener('click', () => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      toast('로그아웃했습니다.', 'ok');
      setTimeout(() => (location.href = '/'), 500);
    });
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

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
    else if (i - r <= 0.5) out += '☆';
    else out += '<span class="empty">★</span>';
  }
  return out;
}
