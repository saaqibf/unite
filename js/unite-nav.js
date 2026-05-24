/**
 * Injects the shared UNite navigation bar into any page that calls injectNav.
 * Logged-out: shows Sign In link (left of Join UNite button)
 * Logged-in:  shows profile dropdown, hides Sign In and Join UNite
 */
function injectNav(activePage) {
  const navHTML = `
    <nav id="unite-nav">
      <a href="/index.html" class="logo">U<span class="n">N</span>ite</a>
      <div class="nav-links">
        <a href="/features/marketplace.html" class="${activePage === 'marketplace' ? 'active' : ''}">Marketplace</a>
        <a href="/features/course-compass.html" class="${activePage === 'compass' ? 'active' : ''}">Course Compass</a>
        <a href="/features/community.html" class="${activePage === 'community' ? 'active' : ''}">Community</a>
        <a href="/features/onboarding.html" class="signin-link ${activePage === 'onboarding' ? 'active' : ''}" id="nav-signin-link">Sign In</a>
      </div>
      <div class="nav-right-inner" id="nav-right-inner">
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

  // Show profile dropdown for logged-in users, or keep Sign In / Join UNite for guests
  updateNavForLoggedInUser();

  // Darken nav on scroll
  const nav = document.getElementById('unite-nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Mobile hamburger
  const ham = document.getElementById('nav-ham');
  const mob = document.getElementById('nav-mob-menu');
  ham.addEventListener('click', () => {
    ham.classList.toggle('open');
    mob.classList.toggle('open');
  });
}

/**
 * Checks localStorage for a logged-in user and swaps nav to profile dropdown,
 * or shows Sign In / Join UNite for guests.
 */
function updateNavForLoggedInUser() {
  const token = localStorage.getItem('unite_token');
  const user = JSON.parse(localStorage.getItem('unite_user') || '{}');
  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');

  if (!token) return; // guest — keep default nav

  const firstName = profile.name || user.first_name || 'Student';
  const program = profile.program || '';
  // profile.year is already stored as "Year 3" / "Year 1" etc — don't prepend "Year" again
  const rawYear = profile.year || '';
  const year = rawYear.startsWith('Year') ? rawYear : (rawYear ? `Year ${rawYear}` : '');
  const avatarLetter = (user.initials ? user.initials.charAt(0) : firstName.charAt(0) || 'S').toUpperCase();

  // Hide Sign In link and Join button
  const signinLink = document.getElementById('nav-signin-link');
  const ctaBtn = document.getElementById('nav-cta-btn');
  if (signinLink) signinLink.style.display = 'none';
  if (ctaBtn) ctaBtn.style.display = 'none';

  const navRight = document.getElementById('nav-right-inner');
  if (!navRight) return;

  const displayName = user.display_name || firstName;
  const programTag = program ? `<span style="display:inline-block;font-size:11px;font-weight:600;background:#FFCD00;color:#000;padding:2px 10px;border-radius:999px;margin-top:4px;">${program}${year ? ` · ${year}` : ''}</span>` : '';

  navRight.innerHTML = `
    <div id="profile-menu-wrapper" style="position:relative;">
      <button onclick="toggleProfileMenu(event)" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:5px 14px 5px 5px;cursor:pointer;color:white;font-family:inherit;font-size:14px;font-weight:600;line-height:1.2;">
        <div style="width:28px;height:28px;border-radius:50%;background:#CC0033;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${avatarLetter}</div>
        <span>${firstName}</span>
        <span style="font-size:10px;opacity:0.65;">▾</span>
      </button>
      <div id="profile-dropdown" style="display:none;position:absolute;top:calc(100% + 10px);right:0;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);min-width:260px;z-index:500;overflow:hidden;border:1px solid #f0f0f0;">
        <div style="display:flex;align-items:center;gap:12px;padding:16px;background:#f8f8f8;">
          <div style="width:44px;height:44px;border-radius:50%;background:#CC0033;color:white;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;">${avatarLetter}</div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <strong style="font-size:15px;color:#0a0a0a;">${displayName}</strong>
            ${programTag}
          </div>
        </div>
        <div style="height:1px;background:#f0f0f0;"></div>
        <a href="/features/course-compass.html" style="display:flex;align-items:center;gap:10px;padding:13px 16px;font-size:14px;color:#0a0a0a;text-decoration:none;">🧭 Course Compass</a>
        <a href="/features/marketplace.html"    style="display:flex;align-items:center;gap:10px;padding:13px 16px;font-size:14px;color:#0a0a0a;text-decoration:none;">🛒 Marketplace</a>
        <a href="/features/community.html"      style="display:flex;align-items:center;gap:10px;padding:13px 16px;font-size:14px;color:#0a0a0a;text-decoration:none;">🤝 Community</a>
        <div style="height:1px;background:#f0f0f0;"></div>
        <button onclick="openProfileSettings()" style="display:flex;align-items:center;gap:10px;padding:13px 16px;font-size:14px;color:#0a0a0a;background:none;border:none;width:100%;text-align:left;cursor:pointer;">⚙️ Edit Profile &amp; Preferences</button>
        <button onclick="signOut()"             style="display:flex;align-items:center;gap:10px;padding:13px 16px;font-size:14px;color:#CC0033;background:none;border:none;width:100%;text-align:left;cursor:pointer;">🚪 Sign Out</button>
      </div>
    </div>`;

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#profile-menu-wrapper')) {
      const dd = document.getElementById('profile-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });
}

function toggleProfileMenu(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('profile-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function openProfileSettings() {
  const dd = document.getElementById('profile-dropdown');
  if (dd) dd.style.display = 'none';

  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  const sel = (val, opt) => val === opt ? 'selected' : '';

  const modal = document.createElement('div');
  modal.className = 'profile-modal-overlay';
  modal.innerHTML = `
    <div class="profile-modal">
      <div class="profile-modal-header">
        <h2>Your Profile</h2>
        <button onclick="this.closest('.profile-modal-overlay').remove()">✕</button>
      </div>
      <div class="profile-modal-body">
        <div class="profile-field">
          <label>Program</label>
          <select id="edit-program">
            <option value="Computer Science" ${sel(profile.program,'Computer Science')}>Computer Science</option>
            <option value="Software Engineering" ${sel(profile.program,'Software Engineering')}>Software Engineering</option>
            <option value="Electrical Engineering" ${sel(profile.program,'Electrical Engineering')}>Electrical Engineering</option>
            <option value="Business" ${sel(profile.program,'Business')}>Business (Haskayne)</option>
            <option value="Kinesiology" ${sel(profile.program,'Kinesiology')}>Kinesiology</option>
            <option value="Psychology" ${sel(profile.program,'Psychology')}>Psychology</option>
            <option value="Nursing" ${sel(profile.program,'Nursing')}>Nursing</option>
            <option value="Biological Sciences" ${sel(profile.program,'Biological Sciences')}>Biological Sciences</option>
          </select>
        </div>
        <div class="profile-field">
          <label>Year</label>
          <select id="edit-year">
            ${['1','2','3','4','5+','Graduate'].map(y =>
              `<option value="${y}" ${sel(profile.year,y)}>${y === 'Graduate' ? 'Graduate Student' : `Year ${y}`}</option>`
            ).join('')}
          </select>
        </div>
        <div class="profile-field">
          <label>Do you have a car?</label>
          <div class="toggle-group">
            <button class="toggle-btn ${profile.has_car ? 'active' : ''}" onclick="setCarStatus(true, this)">Yes</button>
            <button class="toggle-btn ${!profile.has_car ? 'active' : ''}" onclick="setCarStatus(false, this)">No</button>
          </div>
        </div>
        <div class="profile-field">
          <label>Housing</label>
          <select id="edit-housing">
            ${['On campus','Off campus','Commuter'].map(h =>
              `<option value="${h}" ${sel(profile.housing,h)}>${h}</option>`
            ).join('')}
          </select>
        </div>
        <div class="profile-field">
          <label>Interests</label>
          <div class="interests-chips" id="edit-interests">
            ${['Sports','Music','Gaming','Study Groups','Outdoors','Arts','Tech','Food','Other'].map(i =>
              `<button class="interest-chip ${(profile.interests||[]).includes(i)?'active':''}" onclick="toggleInterest('${i}',this)">${i}</button>`
            ).join('')}
          </div>
        </div>
      </div>
      <div class="profile-modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.profile-modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveProfileSettings()">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function saveProfileSettings() {
  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  profile.program = document.getElementById('edit-program')?.value || profile.program;
  profile.year = document.getElementById('edit-year')?.value || profile.year;
  profile.housing = document.getElementById('edit-housing')?.value || profile.housing;
  const activeInterests = [...document.querySelectorAll('.interest-chip.active')].map(b => b.textContent.trim());
  if (activeInterests.length > 0) profile.interests = activeInterests;
  localStorage.setItem('unite_profile', JSON.stringify(profile));

  const token = localStorage.getItem('unite_token');
  if (token) {
    fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(profile)
    }).catch(() => {});
  }

  document.querySelector('.profile-modal-overlay')?.remove();

  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.textContent = '✅ Profile updated successfully';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);

  // Refresh nav to show updated name
  const nameEl = document.querySelector('.profile-name');
  if (nameEl) nameEl.textContent = profile.name || profile.program || 'Student';
}

function setCarStatus(val, btn) {
  btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  profile.has_car = val;
  localStorage.setItem('unite_profile', JSON.stringify(profile));
}

function toggleInterest(interest, btn) {
  btn.classList.toggle('active');
}

function signOut() {
  localStorage.removeItem('unite_token');
  localStorage.removeItem('unite_user');
  localStorage.removeItem('unite_profile');
  localStorage.removeItem('unite_user_id');
  window.location.href = '/index.html';
}
