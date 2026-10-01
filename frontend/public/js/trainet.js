/* ── DASHBOARD: Sidebar toggle (móvil) ── */
document.addEventListener('click', function (e) {

  // Click en botón hamburguesa
  if (e.target.closest('#sidebar-toggle')) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    } else {
      sidebar.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  // Click en overlay para cerrar sidebar
  if (e.target.closest('#sidebar-overlay')) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

});


/* ── LOGIN: Mostrar / ocultar contraseña ── */
function togglePw(id, btn) {
  const input = document.getElementById(id);
  const icon  = btn.querySelector('i');
  if (!input) return;

  if (input.type === 'password') {
    input.type     = 'text';
    icon.className = 'bi bi-eye-slash';
  } else {
    input.type     = 'password';
    icon.className = 'bi bi-eye';
  }
}


/* ── LOGIN: Scroll móvil entre pantallas ── */
function scrollToRegister(e) {
  e.preventDefault();
  const container = document.getElementById('mobile-scroll');
  if (container) container.scrollTo({ top: container.clientHeight, behavior: 'smooth' });
}

function scrollToLogin(e) {
  e.preventDefault();
  const container = document.getElementById('mobile-scroll');
  if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
}