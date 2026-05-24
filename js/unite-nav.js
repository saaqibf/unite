/**
 * Injects the shared UNite navigation bar into any page that calls injectNav.
 */
function injectNav(activePage) {
  const navHTML = `
    <nav id="unite-nav">
      <a href="/index.html" class="logo">U<span class="n">N</span>ite</a>
      <div class="nav-links">
        <a href="/features/marketplace.html" class="${activePage === 'marketplace' ? 'active' : ''}">Marketplace</a>
        <a href="/features/course-compass.html" class="${activePage === 'compass' ? 'active' : ''}">Course Compass</a>
        <a href="/features/community.html" class="${activePage === 'community' ? 'active' : ''}">Community</a>
      </div>
      <div class="nav-right-inner">
        <div class="nav-user" id="nav-user-display"></div>
        <a href="/features/onboarding.html" class="nav-cta" id="nav-cta-btn">Join UNite →</a>
      </div>
      <button class="hamburger" id="nav-ham" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </nav>
    <div class="mobile-menu" id="nav-mob-menu">
      <a href="/features/marketplace.html">Marketplace</a>
      <a href="/features/course-compass.html">Course Compass</a>
      <a href="/features/community.html">Community</a>
      <a href="/features/onboarding.html" style="color:var(--red)">Join UNite →</a>
    </div>
  `;
  document.body.insertAdjacentHTML('afterbegin', navHTML);

  /**
   * Shows student name in nav if they already completed onboarding.
   */
  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  // Prefer first_name extracted from email; fall back to whatever name we have
  const greetingName = profile.first_name || (profile.name ? profile.name.split(' ')[0] : '');
  if (greetingName) {
    document.getElementById('nav-user-display').textContent = 'Hi, ' + greetingName + ' \uD83D\uDC4B';
    document.getElementById('nav-cta-btn').style.display = 'none';
  }

  /**
   * Makes nav background go dark when user scrolls down the page.
   */
  const nav = document.getElementById('unite-nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /**
   * Opens and closes the mobile hamburger menu.
   */
  const ham = document.getElementById('nav-ham');
  const mob = document.getElementById('nav-mob-menu');
  ham.addEventListener('click', () => {
    ham.classList.toggle('open');
    mob.classList.toggle('open');
  });
}
