async function initAuthPage(kind) {
  await loadUser();
  if (OB.user) { location.href = '/recommend.html'; return; }

  const form = document.getElementById(kind === 'login' ? 'loginForm' : 'registerForm');
  const btn = document.getElementById('submitBtn');
  const errBox = document.getElementById('formError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> 확인 중';
    if (errBox) {
      errBox.textContent = '';
      errBox.classList.remove('show');
    }
    try {
      const endpoint = kind === 'login' ? '/api/auth/login' : '/api/auth/register';
      await api(endpoint, { method: 'POST', body: JSON.stringify({ username, password }) });
      toast(kind === 'login' ? '로그인했습니다.' : '계정을 만들었습니다.', 'ok');
      setTimeout(() => (location.href = '/recommend.html'), 500);
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.classList.add('show');
      } else {
        toast(err.message, 'err');
      }
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });
}
