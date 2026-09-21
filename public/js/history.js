function timeAgo(iso) {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString('ko-KR');
}

function cardHtml(h) {
  const modeLabel = h.mode === 'menu' ? '맞춤' : '랜덤';
  const menu = (h.picked_menu || []).slice(0, 3)
    .map((m) => escapeHtml(m.name)).join(', ');
  return `
    <article class="h-card" data-id="${h.id}">
      <div class="h-photo">
        <span class="mode">${modeLabel}</span>
        ${h.category_image ? `<img src="${h.category_image}" alt="" onerror="this.style.display='none'" />` : ''}
      </div>
      <div class="h-body">
        <div class="hn">${escapeHtml(h.restaurant_name)}</div>
        <div class="hc">${escapeHtml(h.category || '')}${h.rating ? ' · 평점 ' + h.rating.toFixed(1) : ''}</div>
        ${menu ? `<div class="hm">${menu}</div>` : ''}
        <div class="ht">${timeAgo(h.created_at)}</div>
      </div>
      <div class="h-actions">
        ${h.kakao_url ? `<a class="btn btn-ghost" style="flex:1" href="${h.kakao_url}" target="_blank" rel="noopener">카카오맵</a>` : ''}
        <button type="button" class="btn btn-danger del-btn" data-id="${h.id}">삭제</button>
      </div>
    </article>`;
}

function renderEmpty(area, loggedOut) {
  if (loggedOut) {
    area.innerHTML = `<div class="state"><div><h3>로그인이 필요합니다</h3><p>추천 기록은 계정에 저장됩니다.</p><a class="btn btn-primary" href="/login.html">로그인</a></div></div>`;
  } else {
    area.innerHTML = `<div class="state"><div><h3>아직 기록이 없습니다</h3><p>추천을 받으면 여기에 쌓입니다.</p><a class="btn btn-primary" href="/recommend.html">근처에서 고르기</a></div></div>`;
  }
}

function renderError(area, message) {
  area.innerHTML = `<div class="state"><div><h3>기록을 불러오지 못했습니다</h3><p>${escapeHtml(message)}</p><button type="button" class="btn btn-primary" id="histRetry">다시 시도</button></div></div>`;
  const retry = document.getElementById('histRetry');
  if (retry) retry.addEventListener('click', load);
}

async function load() {
  const area = document.getElementById('historyArea');
  const clearBtn = document.getElementById('clearBtn');
  area.innerHTML = `<div class="state"><div><h3>기록을 불러오는 중</h3><p>잠시만 기다리세요.</p></div></div>`;
  try {
    const { history } = await api('/api/history');
    if (!history.length) { renderEmpty(area, false); clearBtn.hidden = true; return; }
    clearBtn.hidden = false;
    area.innerHTML = `<div class="history-list">${history.map(cardHtml).join('')}</div>`;
    area.querySelectorAll('.del-btn').forEach((b) =>
      b.addEventListener('click', async () => {
        await api('/api/history/' + b.dataset.id, { method: 'DELETE' });
        toast('삭제했습니다.', 'ok');
        load();
      })
    );
  } catch (e) {
    clearBtn.hidden = true;
    if (e.status === 401) renderEmpty(area, true);
    else renderError(area, e.message);
  }
}

(async function init() {
  await renderHeader('history');
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!confirm('추천 기록을 모두 삭제할까요?')) return;
    await api('/api/history', { method: 'DELETE' });
    toast('기록을 모두 지웠습니다.', 'ok');
    load();
  });
  load();
})();
