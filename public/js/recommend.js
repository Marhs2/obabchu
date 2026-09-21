let state = {
  mode: 'random',
  category: '전체',
  budget: 10000,
  radius: 5000,
  loc: null,
  lastResult: null,
};

let leafletMap = null;

function renderCategories(categories) {
  const chips = document.getElementById('catChips');
  const opts = state.mode === 'random' ? ['전체', ...categories] : categories;
  if (state.mode === 'menu' && state.category === '전체') state.category = categories[0];
  chips.innerHTML = opts
    .map((c) => `<button class="chip ${state.category === c ? 'active' : ''}" data-cat="${c}">${c}</button>`)
    .join('');
  chips.querySelectorAll('.chip').forEach((el) => {
    el.addEventListener('click', () => {
      state.category = el.dataset.cat;
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      el.classList.add('active');
    });
  });
}

function setMode(mode, categories) {
  state.mode = mode;
  document.querySelectorAll('#modeToggle button').forEach((b) =>
    b.classList.toggle('active', b.dataset.mode === mode)
  );
  document.getElementById('budgetField').style.display = mode === 'menu' ? 'block' : 'none';
  document.getElementById('catHint').textContent = mode === 'menu' ? '(필수)' : '(선택)';
  renderCategories(categories);
}

function setLocStatus(loc) {
  const box = document.getElementById('locStatus');
  const txt = document.getElementById('locText');
  if (loc.precise) {
    box.className = 'loc-status ok';
    txt.textContent = `현재 위치 기준 (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`;
  } else {
    box.className = 'loc-status warn';
    txt.textContent = '위치 권한 없음 — 용산 일대 기준으로 추천';
  }
}

function menuHtml(menu) {
  if (!menu || !menu.length) {
    return '<div class="menu-list"><h4>메뉴</h4><p style="color:var(--text-mute)">등록된 메뉴 정보가 없어요.</p></div>';
  }
  const items = menu
    .slice(0, 8)
    .map((m) => `<div class="menu-item"><span>${escapeHtml(m.name)}</span><span class="price">${escapeHtml(m.priceLabel || (m.price ? m.price.toLocaleString() + '원' : ''))}</span></div>`)
    .join('');
  return `<div class="menu-list"><h4>메뉴 ${menu.length > 8 ? '(상위 8개)' : ''}</h4>${items}</div>`;
}

function renderResult(data) {
  const r = data.restaurant;
  state.lastResult = data;
  const distTxt = r.distance != null ? `${(r.distance / 1000).toFixed(2)}km` : '거리 정보 없음';
  const ratingTxt = r.rating != null ? `<span class="stars">${starHtml(r.rating)}</span> ${r.rating.toFixed(1)}` : '평점 없음';
  const area = document.getElementById('resultArea');
  area.innerHTML = `
    <div class="reco-card">
      <div class="reco-photo">
        <span class="reco-badge">${data.mode === 'random' ? '🎲 랜덤 추천' : '🍽️ 맞춤 추천'}</span>
        <img src="${r.categoryImage}" alt="${escapeHtml(r.category)}" onerror="this.style.display='none'" />
      </div>
      <div class="reco-body">
        <div class="rname">${escapeHtml(r.name)}</div>
        <div class="rmeta">
          <span class="tag">${escapeHtml(r.category)}</span>
          <span>${ratingTxt}</span>
          <span>📍 ${distTxt}</span>
        </div>
        <div class="rmeta">
          <span>🏠 ${escapeHtml(r.address || '주소 정보 없음')}</span>
        </div>
        <div class="rmeta">
          <span>📞 ${escapeHtml(r.phone || '전화번호 없음')}</span>
        </div>
        ${menuHtml(data.menu)}
        <div class="reco-actions">
          ${r.kakaoUrl ? `<a class="btn btn-ghost" href="${r.kakaoUrl}" target="_blank" rel="noopener">🔗 카카오맵에서 보기</a>` : ''}
          <button class="btn btn-primary" id="againBtn">🎲 다시 추천</button>
          ${OB.user ? '<button class="btn btn-ghost" id="saveBtn">⭐ 기록에 저장</button>' : ''}
        </div>
        ${OB.user ? '' : '<p style="color:var(--text-mute);font-size:0.85rem;margin-top:10px">로그인하면 추천 기록이 저장돼요.</p>'}
      </div>
    </div>`;

  document.getElementById('againBtn').addEventListener('click', runRecommend);
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.addEventListener('click', () => saveHistory(data, true));

  renderMap(r);
  if (OB.user) saveHistory(data, false);
}

function renderMap(r) {
  const mapArea = document.getElementById('mapArea');
  if (r.lat == null || r.lng == null) { mapArea.innerHTML = ''; leafletMap = null; return; }

  if (!window.L) {
    mapArea.innerHTML = `<div id="map"><div class="map-fallback">🗺️ 지도를 불러올 수 없어요.<br />${r.kakaoUrl ? `<a class="btn btn-ghost" style="margin-top:12px" href="${r.kakaoUrl}" target="_blank" rel="noopener">카카오맵에서 위치 보기</a>` : ''}</div></div>`;
    return;
  }

  // Re-create the map container each time to avoid Leaflet re-init issues.
  mapArea.innerHTML = '<div id="map"></div>';
  leafletMap = L.map('map', { scrollWheelZoom: false }).setView([r.lat, r.lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(leafletMap);
  const popup = `<b>${escapeHtml(r.name)}</b><br />${escapeHtml(r.category)}${
    r.kakaoUrl ? `<br /><a href="${r.kakaoUrl}" target="_blank" rel="noopener">카카오맵에서 보기 →</a>` : ''
  }`;
  L.marker([r.lat, r.lng]).addTo(leafletMap).bindPopup(popup).openPopup();
  // Ensure tiles render correctly after layout settles.
  setTimeout(() => leafletMap && leafletMap.invalidateSize(), 200);
}

async function saveHistory(data, notify) {
  const r = data.restaurant;
  try {
    await api('/api/history', {
      method: 'POST',
      body: JSON.stringify({
        restaurant_id: r.id,
        restaurant_name: r.name,
        category: r.category,
        address: r.address,
        rating: r.rating,
        lat: r.lat,
        lng: r.lng,
        kakao_url: r.kakaoUrl,
        category_image: r.categoryImage,
        mode: data.mode,
        picked_menu: (data.menu || []).slice(0, 5),
      }),
    });
    if (notify) toast('추천 기록에 저장했어요! ⭐', 'ok');
  } catch (e) {
    if (notify) toast(e.message, 'err');
  }
}

async function runRecommend() {
  const btn = document.getElementById('recoBtn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 추천 중…';
  try {
    const params = new URLSearchParams();
    params.set('mode', state.mode);
    params.set('lat', state.loc.lat);
    params.set('lng', state.loc.lng);
    params.set('radius', state.radius);
    if (state.mode === 'menu') {
      params.set('category', state.category);
      params.set('maxPrice', state.budget);
    } else if (state.category && state.category !== '전체') {
      params.set('category', state.category);
    }
    const data = await api('/api/recommend?' + params.toString());
    renderResult(data);
  } catch (e) {
    document.getElementById('resultArea').innerHTML =
      `<div class="result-empty"><div><div class="big">😢</div><p>${escapeHtml(e.message)}</p></div></div>`;
    document.getElementById('mapArea').innerHTML = '';
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

(async function init() {
  await renderHeader('recommend');
  const cfg = await loadConfig();

  setMode('random', cfg.categories);

  document.querySelectorAll('#modeToggle button').forEach((b) =>
    b.addEventListener('click', () => setMode(b.dataset.mode, cfg.categories))
  );

  const range = document.getElementById('budgetRange');
  const val = document.getElementById('budgetVal');
  range.addEventListener('input', () => {
    state.budget = parseInt(range.value, 10);
    val.textContent = state.budget.toLocaleString() + '원';
  });

  document.getElementById('radiusSel').addEventListener('change', (e) => {
    state.radius = parseInt(e.target.value, 10);
  });

  document.getElementById('recoBtn').addEventListener('click', runRecommend);

  state.loc = await getLocation();
  setLocStatus(state.loc);
})();
