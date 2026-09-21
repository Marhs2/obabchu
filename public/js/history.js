function timeAgo(iso) {
  // stored as UTC "YYYY-MM-DD HH:MM:SS"
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString('ko-KR');
}

function cardHtml(h) {
  const modeLabel = h.mode === 'menu' ? '🍽️ 맞춤' : '🎲 랜덤';
  const menu = (h.picked_menu || []).slice(0, 3)
    .map((m) => escapeHtml(m.name)).join(', ');
  return `
    <div class="h-card" data-id="${h.id}">
      <div class="h-photo">
        <span class="mode">${modeLabel}</span>
        ${h.category_image ? `<img src="${h.category_image}" alt="" onerror="this.style.display='none'" />` : ''}
      </div>
      <div class="h-body">
        <div class="hn">${escapeHtml(h.restaurant_name)}</div>
        <div class="hc">${escapeHtml(h.category || '')}${h.rating ? ' · ★ ' + h.rating.toFixed(1) : ''}</div>
        ${menu ? `<div style="color:var(--text-dim);font-size:0.85rem">🍴 ${menu}</div>` : ''}
        <div class="ht">${timeAgo(h.created_at)}</div>
      </div>
      <div class="h-actions">
        ${h.kakao_url ? `<a class="btn btn-ghost" style="flex:1" href="${h.kakao_url}" target="_blank" rel="noopener">지도</a>` : ''}
        <button class="btn btn-danger del-btn" data-id="${h.id}">삭제</button>
      </div>
    </div>`;
}

function renderEmpty(area, loggedOut) {
  if (loggedOut) {
    area.innerHTML = `<div class="empty-state"><div class="big">🔒</div><p>추천 기록은 로그인 후 확인할 수 있어요.</p><p style="margin-top:10px"><a href="/login.html">로그인</a> 또는 <a href="/register.html">회원가입</a></p></div>`;
  } else {
    area.innerHTML = `<div class="empty-state"><div class="big">🍽️</div><p>아직 추천 기록이 없어요.</p><p style="margin-top:10px"><a href="/recommend.html">지금 추천받으러 가기 →</a></p></div>`;
  }
}

async function load() {
  const area = document.getElementById('historyArea');
  const clearBtn = document.getElementById('clearBtn');
  try {
    const { history } = await api('/api/history');
    if (!history.length) { renderEmpty(area, false); clearBtn.style.display = 'none'; return; }
    clearBtn.style.display = 'inline-flex';
    area.innerHTML = `<div class="history-grid">${history.map(cardHtml).join('')}</div>`;
    area.querySelectorAll('.del-btn').forEach((b) =>
      b.addEventListener('click', async () => {
        await api('/api/history/' + b.dataset.id, { method: 'DELETE' });
        toast('삭제했어요.', 'ok');
        load();
      })
    );
  } catch (e) {
    if (e.status === 401) { renderEmpty(area, true); clearBtn.style.display = 'none'; }
    else toast(e.message, 'err');
  }
}

(async function init() {
  await renderHeader('history');
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!confirm('추천 기록을 모두 삭제할까요?')) return;
    await api('/api/history', { method: 'DELETE' });
    toast('전체 삭제 완료', 'ok');
    load();
  });
  load();
})();
