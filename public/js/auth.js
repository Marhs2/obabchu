async function initAuthPage(kind) {
  await loadUser();
  if (OB.user) { location.href = '/recommend.html'; return; }

  const form = document.getElementById(kind === 'login' ? 'loginForm' : 'registerForm');
  const btn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 처리 중…';
    try {
      const endpoint = kind === 'login' ? '/api/auth/login' : '/api/auth/register';
      await api(endpoint, { method: 'POST', body: JSON.stringify({ username, password }) });
      toast(kind === 'login' ? '로그인 성공!' : '회원가입 완료!', 'ok');
      setTimeout(() => (location.href = '/recommend.html'), 500);
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });
}
