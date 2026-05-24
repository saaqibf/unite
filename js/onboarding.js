(function () {
  'use strict';

  var TOTAL_QUESTIONS = 8;
  var PROFILE_KEY = 'unite_profile';
  var INTENT_KEY = 'unite_intent';

  var root = document.getElementById('onboarding-root');
  var progressWrap = document.getElementById('progress-wrap');
  var progressFill = document.getElementById('progress-fill');
  var progressText = document.getElementById('progress-text');
  var progressTrack = document.querySelector('.onboarding__progress-track');

  var currentScreen = 0;

  var profile = {
    name: '',
    email: '',
    program: '',
    year: '',
    has_car: null,
    housing: '',
    challenge: '',
    personality: '',
    interests: [],
    primary_intent: localStorage.getItem(INTENT_KEY) || '',
    needed_courses: []
  };

  var programs = [
    'Computer Science',
    'Software Engineering',
    'Electrical Engineering',
    'Business',
    'Kinesiology',
    'Psychology',
    'Nursing',
    'Biological Sciences',
    'Other'
  ];

  var years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5+', 'Graduate'];

  var challenges = [
    'Making friends',
    'Planning my degree',
    'Finding stuff I need',
    'Finding things to do'
  ];

  var personalities = ['Introvert', 'Extrovert', 'Depends'];

  var housingOptions = ['On campus', 'Off campus', 'Commuter'];

  var interestOptions = [
    'Sports',
    'Music',
    'Gaming',
    'Study Groups',
    'Outdoors',
    'Arts',
    'Tech',
    'Food',
    'Other'
  ];

  /**
   * Checks whether an email belongs to a UCalgary student.
   */
  function isUcalgaryEmail(email) {
    return email.trim().toLowerCase().endsWith('@ucalgary.ca');
  }

  /**
   * Jumps to a specific onboarding screen by its 1-based screen number.
   */
  function showScreen(screenNumber) {
    currentScreen = screenNumber - 1;
    renderScreen();
  }

  /**
   * Shows an error message on the email sign-up screen.
   */
  function showError(message) {
    var errEl = document.getElementById('email-error');
    if (errEl) {
      errEl.textContent = message;
    }
  }

  /**
   * Registers the student with Saaqib's auth API, then moves to verification.
   */
  /**
   * Attempts fetch with a hard timeout; resolves with { ok, data } or rejects on network/timeout.
   */
  function fetchWithTimeout(url, options, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .then(function (res) {
        clearTimeout(timer);
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  /**
   * Saves a successful auth response to localStorage.
   */
  function saveAuthResult(data, email) {
    if (data.token) {
      localStorage.setItem('unite_token', data.token);
    }
    var user = data.user || {};

    // If the server returned structured name fields, prefer those over the locally-typed name
    var resolvedName = user.display_name || user.name || profile.name || '';
    var resolvedFirst = user.first_name || (resolvedName ? resolvedName.split(' ')[0] : '');

    localStorage.setItem('unite_profile', JSON.stringify(
      Object.assign(
        { email: email, primary_intent: profile.primary_intent, name: resolvedName },
        user,
        // Guarantee these keys are always present in the profile object
        { display_name: resolvedName, first_name: resolvedFirst }
      )
    ));

    // Also persist the raw user object separately so chat.js can read it
    localStorage.setItem('unite_user', JSON.stringify(user));

    if (data.userId) localStorage.setItem('unite_user_id', String(data.userId));
    if (user.id) localStorage.setItem('unite_user_id', String(user.id));
  }

  /**
   * Handles a successful registration response — saves session, pre-fills name from email,
   * then routes to the onboarding questions if the profile is not yet complete.
   */
  function handleRegistrationSuccess(data, email) {
    // Save token
    if (data.token) {
      localStorage.setItem('unite_token', data.token);
    }

    // Save structured user object
    var user = data.user || {};
    localStorage.setItem('unite_user', JSON.stringify({
      id: user.id || null,
      email: user.email || email,
      display_name: user.display_name || user.name || email.split('@')[0],
      first_name: user.first_name || email.split('@')[0].split('.')[0],
      last_name: user.last_name || '',
      initials: user.initials || email.charAt(0).toUpperCase()
    }));

    // Derive first name from email (e.g. saaqib.fagbenro@ucalgary.ca → "Saaqib")
    var emailLocal = email.split('@')[0];
    var parts = emailLocal.split('.');
    var firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
    if (!profile.name) profile.name = firstName;

    // Check if profile is already complete — if so, skip onboarding
    var existingProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    if (!existingProfile.program) {
      // Profile not complete — go to Q1 (name screen), pre-filling name from email
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        name: profile.name,
        email: email,
        primary_intent: profile.primary_intent
      }));
      showScreen(3); // screen 3 = Q1 "What is your name?"
    } else {
      redirectToFeature();
    }
  }

  // Stores the demo code from registration to show on verification screen
  var _pendingDemoCode = null;

  /**
   * Registers the student — on success shows 6-digit verification screen.
   */
  async function registerWithEmail(email, password) {
    try {
      var result = await fetchWithTimeout('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password, name: profile.name || '', primaryIntent: profile.primary_intent })
      }, 5000);

      if (result.ok) {
        if (result.data.needs_verification) {
          // Save demo code for display on verification screen
          _pendingDemoCode = result.data.demo_code || null;
          profile.email = email;
          showScreen(1); // Go to verification code screen
          return;
        }
        // DB was down — got token directly
        handleRegistrationSuccess(result.data, email);
        return;
      }

      if (result.status === 409) {
        await loginWithEmail(email, password);
        return;
      }

      showError(result.data.error || 'Registration failed. Try again.');
    } catch (err) {
      console.warn('Register unavailable, using demo mode');
      localStorage.setItem('unite_token', 'demo-' + Date.now());
      var emailLocal = email.split('@')[0];
      var parts = emailLocal.split('.');
      var firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
      if (!profile.name) profile.name = firstName;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(
        { email: email, primary_intent: profile.primary_intent, name: profile.name }
      ));
      showScreen(3);
    }
  }

  /**
   * Logs in an existing student — used as fallback when account already exists.
   */
  async function loginWithEmail(email, password) {
    try {
      var result = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      }, 5000);

      if (result.ok) {
        saveAuthResult(result.data, email);
        redirectToFeature();
        return;
      }

      showError(result.data.error || 'Login failed. Check your password and try again.');
    } catch (err) {
      localStorage.setItem('unite_token', 'demo-' + Date.now());
      localStorage.setItem('unite_profile', JSON.stringify(
        { email: email, primary_intent: profile.primary_intent, name: profile.name || '' }
      ));
      redirectToFeature();
    }
  }

  /**
   * Moves the user to the next onboarding screen.
   */
  function goNext() {
    currentScreen += 1;
    renderScreen();
  }

  /**
   * Updates the progress bar for question screens 3 through 10.
   */
  function updateProgress(questionIndex) {
    var step = questionIndex + 1;
    var percent = (step / TOTAL_QUESTIONS) * 100;

    progressWrap.hidden = false;
    progressText.textContent = 'Question ' + step + ' of ' + TOTAL_QUESTIONS;
    progressFill.style.width = percent + '%';

    if (progressTrack) {
      progressTrack.setAttribute('aria-valuenow', String(step));
    }
  }

  /**
   * Hides the progress bar on non-question screens.
   */
  function hideProgress() {
    progressWrap.hidden = true;
    progressFill.style.width = '0%';
  }

  /**
   * Saves the completed profile to localStorage as unite_profile.
   */
  function saveProfile() {
    var saved = {
      name: profile.name,
      email: profile.email,
      program: profile.program,
      year: profile.year,
      has_car: profile.has_car === true,
      housing: profile.housing,
      challenge: profile.challenge,
      personality: profile.personality,
      interests: profile.interests.slice(),
      primary_intent: profile.primary_intent,
      needed_courses: profile.needed_courses.slice()
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(saved));

    // Persist to DB and mark onboarding_complete = true
    var token = localStorage.getItem('unite_token');
    if (token) {
      fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(saved)
      }).catch(function() {});
    }
  }

  /**
   * Sends the user to the feature page that matches their primary intent.
   */
  function redirectToFeature() {
    var routes = {
      marketplace: '/features/marketplace.html',
      course_compass: '/features/course-compass.html',
      community: '/features/community.html'
    };

    var destination = routes[profile.primary_intent] || '/';
    window.location.href = destination;
  }

  /**
   * Builds three personalized recommendation cards for the welcome screen.
   */
  function buildWelcomeCards() {
    var cards = [];

    if (profile.primary_intent === 'marketplace') {
      cards.push({
        icon: '🎒',
        title: 'Campus Marketplace',
        desc: profile.has_car
          ? 'Browse listings from UCalgary students near you.'
          : 'We set campus pickup as your default — meet at TFDL, MacHall, or Science Theatres.'
      });
    } else if (profile.primary_intent === 'course_compass') {
      cards.push({
        icon: '🧭',
        title: 'Course Compass',
        desc: 'Map your ' + profile.program + ' degree and see exactly what to take in ' + profile.year + '.'
      });
    } else {
      cards.push({
        icon: '🤝',
        title: 'Community Hub',
        desc: 'Find events and people who match your vibe as a' +
          (profile.personality === 'Introvert' ? 'n introvert' : profile.personality === 'Extrovert' ? 'n extrovert' : ' student who goes with the flow') + '.'
      });
    }

    if (profile.challenge === 'Making friends') {
      cards.push({
        icon: '👋',
        title: 'Meet Your People',
        desc: 'Join clubs and events for ' + profile.program + ' students who share your interests.'
      });
    } else if (profile.challenge === 'Planning my degree') {
      cards.push({
        icon: '📋',
        title: 'Degree Roadmap',
        desc: 'Course Compass will track prerequisites and suggest your next semester.'
      });
    } else if (profile.challenge === 'Finding stuff I need') {
      cards.push({
        icon: '🛍️',
        title: 'Campus Deals',
        desc: 'Textbooks, furniture, and gear from students on campus — no car needed.'
      });
    } else {
      cards.push({
        icon: '📅',
        title: 'Things To Do',
        desc: 'Sports, clubs, and hangouts picked for your interests: ' + profile.interests.slice(0, 3).join(', ') + '.'
      });
    }

    if (profile.interests.length > 0) {
      cards.push({
        icon: '⭐',
        title: 'Based On Your Interests',
        desc: 'We will surface ' + profile.interests.join(', ') + ' content across UNite.'
      });
    } else {
      cards.push({
        icon: '⭐',
        title: 'Explore UNite',
        desc: 'Discover marketplace listings, degree tools, and community events tailored to you.'
      });
    }

    return cards.slice(0, 3);
  }

  /**
   * Renders the auth screen — detects ?mode=login from URL to start in login tab.
   */
  function renderEmailScreen() {
    hideProgress();
    var startLogin = new URLSearchParams(window.location.search).get('mode') === 'login';

    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<div class="onboarding__auth-tabs" role="tablist">' +
          '<button role="tab" type="button" id="tab-signup" class="onboarding__tab' + (startLogin ? '' : ' onboarding__tab--active') + '" aria-selected="' + (startLogin ? 'false' : 'true') + '">Sign Up</button>' +
          '<button role="tab" type="button" id="tab-login"  class="onboarding__tab' + (startLogin ? ' onboarding__tab--active' : '') + '" aria-selected="' + (startLogin ? 'true' : 'false') + '">Log In</button>' +
        '</div>' +
        '<div class="onboarding__body">' +
          '<p id="auth-subtitle" style="font-size:0.9375rem;color:var(--color-text-muted,#6b7280);margin-bottom:var(--space-md);">' +
            (startLogin ? 'Welcome back — use your UCalgary email.' : 'Create your account with your UCalgary email.') +
          '</p>' +
          '<label class="input-label" for="email-input">UCalgary email</label>' +
          '<div class="onboarding__email-wrap">' +
            '<input type="email" id="email-input" class="input-field" placeholder="you@ucalgary.ca" autocomplete="email">' +
            '<span id="email-check" class="onboarding__email-check" aria-hidden="true">✅</span>' +
          '</div>' +
          '<label class="input-label" for="password-input" style="margin-top:var(--space-md);">Password</label>' +
          '<input type="password" id="password-input" class="input-field"' +
            ' placeholder="' + (startLogin ? 'Your password' : 'At least 8 characters') + '"' +
            ' autocomplete="' + (startLogin ? 'current-password' : 'new-password') + '">' +
          '<div id="confirm-wrap" style="' + (startLogin ? 'display:none;' : '') + 'margin-top:var(--space-md);">' +
            '<label class="input-label" for="confirm-input">Confirm password</label>' +
            '<input type="password" id="confirm-input" class="input-field" placeholder="Re-enter your password" autocomplete="new-password">' +
          '</div>' +
          '<p id="email-error" class="onboarding__error" role="alert"></p>' +
        '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="email-continue" class="btn-primary btn-block" disabled>' +
            (startLogin ? 'Log In' : 'Create Account') +
          '</button>' +
          '<button type="button" id="demo-skip-btn" style="margin-top:10px;width:100%;background:transparent;border:1.5px solid var(--color-border,#e5e7eb);color:var(--color-text-muted,#6b7280);border-radius:8px;padding:10px;cursor:pointer;font-size:0.875rem;">' +
            '⚡ Skip for Demo →' +
          '</button>' +
        '</footer>' +
      '</section>';

    var emailInput   = document.getElementById('email-input');
    var emailCheck   = document.getElementById('email-check');
    var emailError   = document.getElementById('email-error');
    var passwordInput  = document.getElementById('password-input');
    var confirmInput   = document.getElementById('confirm-input');
    var confirmWrap    = document.getElementById('confirm-wrap');
    var continueBtn  = document.getElementById('email-continue');

    function validate() {
      var emailVal   = emailInput.value.trim();
      var emailOk    = isUcalgaryEmail(emailVal);
      var passVal    = passwordInput.value;
      var passOk     = passVal.length >= 8;
      var confirmVal = confirmInput ? confirmInput.value : '';
      var confirmOk  = isLoginMode || confirmVal === passVal;

      emailInput.classList.remove('input-field--valid', 'input-field--invalid');
      emailCheck.classList.remove('onboarding__email-check--visible');
      emailError.textContent = '';

      if (!emailVal) { continueBtn.disabled = true; return; }

      if (!emailOk) {
        emailInput.classList.add('input-field--invalid');
        emailError.textContent = 'UNite is for UCalgary students. Use your @ucalgary.ca email.';
        continueBtn.disabled = true;
        return;
      }

      emailInput.classList.add('input-field--valid');
      emailCheck.classList.add('onboarding__email-check--visible');

      if (!isLoginMode) {
        if (!passOk) {
          emailError.textContent = passVal.length > 0 ? 'Password must be at least 8 characters.' : '';
          continueBtn.disabled = true;
          return;
        }
        if (confirmVal && !confirmOk) {
          emailError.textContent = 'Passwords do not match.';
          continueBtn.disabled = true;
          return;
        }
        continueBtn.disabled = !passOk || !confirmOk || confirmVal === '';
      } else {
        continueBtn.disabled = !passOk;
      }
    }

    emailInput.addEventListener('input', validate);
    passwordInput.addEventListener('input', validate);
    if (confirmInput) confirmInput.addEventListener('input', validate);

    var isLoginMode = new URLSearchParams(window.location.search).get('mode') === 'login';

    function switchTab(toLogin) {
      isLoginMode = toLogin;
      var signupTab = document.getElementById('tab-signup');
      var loginTab  = document.getElementById('tab-login');
      var subtitle  = document.getElementById('auth-subtitle');

      signupTab.classList.toggle('onboarding__tab--active', !toLogin);
      signupTab.setAttribute('aria-selected', String(!toLogin));
      loginTab.classList.toggle('onboarding__tab--active', toLogin);
      loginTab.setAttribute('aria-selected', String(toLogin));

      subtitle.textContent = toLogin
        ? 'Welcome back — use your UCalgary email.'
        : 'Create your account with your UCalgary email.';
      passwordInput.placeholder = toLogin ? 'Your password' : 'At least 8 characters';
      passwordInput.setAttribute('autocomplete', toLogin ? 'current-password' : 'new-password');
      continueBtn.textContent = toLogin ? 'Log In' : 'Create Account';
      emailError.textContent = '';

      // Show confirm field only on sign-up tab
      if (confirmWrap) confirmWrap.style.display = toLogin ? 'none' : '';
      if (confirmInput) confirmInput.value = '';

      validate();
    }

    document.getElementById('tab-signup').addEventListener('click', function () { switchTab(false); });
    document.getElementById('tab-login').addEventListener('click',  function () { switchTab(true); });

    // Skip for Demo — sets a demo token and goes to Q1 so judges see the full onboarding flow
    document.getElementById('demo-skip-btn').addEventListener('click', function () {
      localStorage.setItem('unite_token', 'demo-' + Date.now());
      localStorage.setItem('unite_user', JSON.stringify({
        id: 'demo',
        email: 'demo@ucalgary.ca',
        display_name: 'Demo Student',
        first_name: 'Demo',
        last_name: 'Student',
        initials: 'DS'
      }));
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        name: 'Demo',
        email: 'demo@ucalgary.ca',
        primary_intent: profile.primary_intent || 'course_compass'
      }));
      showScreen(3); // Go to Q1 "What is your name?" — still shows full 8-question onboarding
    });

    continueBtn.addEventListener('click', function () {
      if (!isUcalgaryEmail(emailInput.value)) return;
      if (passwordInput.value.length < 6) return;
      profile.email = emailInput.value.trim().toLowerCase();
      continueBtn.disabled = true;
      continueBtn.textContent = isLoginMode ? 'Logging in…' : 'Creating account…';

      var action = isLoginMode
        ? loginWithEmail(profile.email, passwordInput.value)
        : registerWithEmail(profile.email, passwordInput.value);

      action.finally(function () {
        continueBtn.disabled = false;
        continueBtn.textContent = isLoginMode ? 'Log In' : 'Create Account';
      });
    });
  }

  /**
   * Renders the 6-digit code verification screen.
   */
  function renderVerificationScreen() {
    hideProgress();
    var demoBanner = _pendingDemoCode
      ? '<div style="background:#FFCD00;color:#000;border-radius:10px;padding:12px 16px;font-size:14px;font-weight:600;margin-bottom:20px;text-align:center;">Demo mode — your code is <span style="font-size:20px;letter-spacing:4px;">' + _pendingDemoCode + '</span></div>'
      : '';

    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<div class="onboarding__verify-icon" aria-hidden="true">📬</div>' +
        '<h1 class="onboarding__title">Check your inbox</h1>' +
        '<p class="onboarding__subtitle">We sent a 6-digit code to <strong>' + (profile.email || '') + '</strong></p>' +
        '<div class="onboarding__body">' +
          demoBanner +
          '<div id="code-inputs" style="display:flex;gap:10px;justify-content:center;margin:20px 0;">' +
            [0,1,2,3,4,5].map(function(i) {
              return '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" ' +
                'class="code-digit-input" data-idx="' + i + '" ' +
                'style="width:48px;height:56px;border:2px solid #e0e0e0;border-radius:12px;font-size:24px;font-weight:700;text-align:center;outline:none;transition:border-color 0.2s;" />';
            }).join('') +
          '</div>' +
          '<div id="verify-error" style="color:#CC0033;font-size:14px;text-align:center;min-height:20px;"></div>' +
          '<button type="button" id="resend-btn" style="background:none;border:none;color:#CC0033;font-size:14px;cursor:pointer;text-decoration:underline;width:100%;text-align:center;margin-top:8px;">Resend Code</button>' +
        '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="verify-btn" class="btn-primary btn-block">Verify</button>' +
          '<button type="button" id="skip-demo-verify" class="btn-secondary btn-block" style="margin-top:10px;">⚡ Skip for Demo →</button>' +
        '</footer>' +
      '</section>';

    // Code input auto-advance
    var inputs = document.querySelectorAll('.code-digit-input');
    inputs.forEach(function(inp, idx) {
      inp.addEventListener('input', function() {
        inp.value = inp.value.replace(/[^0-9]/g, '').slice(-1);
        if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx - 1].focus();
      });
      inp.addEventListener('focus', function() { inp.style.borderColor = '#CC0033'; });
      inp.addEventListener('blur', function() { inp.style.borderColor = inp.value ? '#0a0a0a' : '#e0e0e0'; });
    });

    // Auto-fill from demo code
    if (_pendingDemoCode) {
      _pendingDemoCode.split('').forEach(function(d, i) {
        if (inputs[i]) { inputs[i].value = d; inputs[i].style.borderColor = '#0a0a0a'; }
      });
    }

    // Resend button with 60-second cooldown
    var resendBtn = document.getElementById('resend-btn');
    var resendCooldown = 0;
    function startResendCooldown(secs) {
      resendCooldown = secs;
      resendBtn.disabled = true;
      resendBtn.style.opacity = '0.5';
      var iv = setInterval(function() {
        resendCooldown--;
        resendBtn.textContent = 'Resend Code (' + resendCooldown + 's)';
        if (resendCooldown <= 0) {
          clearInterval(iv);
          resendBtn.textContent = 'Resend Code';
          resendBtn.disabled = false;
          resendBtn.style.opacity = '1';
        }
      }, 1000);
    }
    resendBtn.addEventListener('click', async function() {
      startResendCooldown(60);
      try {
        var r = await fetchWithTimeout('/api/auth/resend-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: profile.email })
        }, 5000);
        if (r.ok && r.data.demo_code) {
          _pendingDemoCode = r.data.demo_code;
          document.getElementById('verify-error').textContent = '';
          // Update demo banner
          var existing = root.querySelector('[style*="FFCD00"]');
          if (existing) existing.querySelector('span').textContent = _pendingDemoCode;
          r.data.demo_code.split('').forEach(function(d, i) {
            if (inputs[i]) { inputs[i].value = d; inputs[i].style.borderColor = '#0a0a0a'; }
          });
        }
      } catch(e) { /* silent */ }
    });

    // Skip for demo
    document.getElementById('skip-demo-verify').addEventListener('click', function() {
      var emailLocal = (profile.email || 'student@ucalgary.ca').split('@')[0];
      var firstName = emailLocal.split('.')[0];
      firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
      localStorage.setItem('unite_token', 'demo-' + Date.now());
      localStorage.setItem('unite_user', JSON.stringify({ id: null, email: profile.email, first_name: firstName, display_name: firstName, initials: firstName.charAt(0) }));
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: firstName, email: profile.email, primary_intent: profile.primary_intent }));
      showScreen(3);
    });

    // Verify button
    document.getElementById('verify-btn').addEventListener('click', async function() {
      var code = Array.from(inputs).map(function(i) { return i.value; }).join('');
      if (code.length < 6) {
        document.getElementById('verify-error').textContent = 'Enter all 6 digits.';
        return;
      }
      var btn = document.getElementById('verify-btn');
      btn.disabled = true;
      btn.textContent = 'Verifying…';
      try {
        var r = await fetchWithTimeout('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: profile.email, code: code })
        }, 5000);
        if (r.ok) {
          handleRegistrationSuccess(r.data, profile.email);
        } else {
          document.getElementById('verify-error').textContent = (r.data && r.data.error) || 'Invalid code. Try again.';
          btn.disabled = false;
          btn.textContent = 'Verify';
        }
      } catch(e) {
        // Network error — proceed anyway (demo mode)
        var emailLocal2 = (profile.email || '').split('@')[0];
        var fn = emailLocal2.split('.')[0];
        fn = fn.charAt(0).toUpperCase() + fn.slice(1);
        handleRegistrationSuccess({ token: 'demo-' + Date.now(), user: { id: null, email: profile.email, first_name: fn, display_name: fn, initials: fn.charAt(0) } }, profile.email);
      }
    });
  }

  /**
   * Renders a single-choice question with clickable option buttons.
   */
  function renderChoiceQuestion(config) {
    updateProgress(config.questionIndex);

    var rowClass = config.row ? ' onboarding__choices--row' : '';
    var choicesHtml;
    choicesHtml = config.options.map(function (option) {
      var selected = config.currentValue === option ? ' onboarding__choice--selected' : '';
      return '<button type="button" class="onboarding__choice' + selected + '" data-value="' + option + '">' + option + '</button>';
    }).join('');

    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<h1 class="onboarding__title">' + config.title + '</h1>' +
        (config.subtitle ? '<p class="onboarding__subtitle">' + config.subtitle + '</p>' : '') +
        '<div class="onboarding__body">' +
          '<div class="onboarding__choices' + rowClass + '" id="choice-list">' + choicesHtml + '</div>' +
        '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="choice-continue" class="btn-primary btn-block"' +
            (config.currentValue ? '' : ' disabled') + '>Continue</button>' +
        '</footer>' +
      '</section>';

    var selectedValue = config.currentValue;
    var continueBtn = document.getElementById('choice-continue');

    document.getElementById('choice-list').addEventListener('click', function (event) {
      var btn = event.target.closest('.onboarding__choice');
      if (!btn) return;

      selectedValue = btn.dataset.value;
      document.querySelectorAll('.onboarding__choice').forEach(function (el) {
        el.classList.remove('onboarding__choice--selected');
      });
      btn.classList.add('onboarding__choice--selected');
      continueBtn.disabled = false;
    });

    continueBtn.addEventListener('click', function () {
      if (!selectedValue) return;
      config.onSelect(selectedValue);
      goNext();
    });
  }

  /**
   * Renders a text input question for the user's first name.
   */
  function renderNameScreen() {
    updateProgress(0);

    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<h1 class="onboarding__title">What is your name?</h1>' +
        '<p class="onboarding__subtitle">First name only — we will use this to greet you.</p>' +
        '<div class="onboarding__body">' +
          '<label class="input-label" for="name-input">First name</label>' +
          '<input type="text" id="name-input" class="input-field" placeholder="Your first name" autocomplete="given-name" value="' + profile.name + '">' +
        '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="name-continue" class="btn-primary btn-block"' +
            (profile.name ? '' : ' disabled') + '>Continue</button>' +
        '</footer>' +
      '</section>';

    var nameInput = document.getElementById('name-input');
    var continueBtn = document.getElementById('name-continue');

    nameInput.addEventListener('input', function () {
      continueBtn.disabled = nameInput.value.trim().length === 0;
    });

    continueBtn.addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) return;
      profile.name = name;
      goNext();
    });

    nameInput.focus();
  }

  /**
   * Renders a dropdown question for the user's program.
   */
  function renderProgramScreen() {
    updateProgress(1);

    var optionsHtml = programs.map(function (program) {
      var selected = profile.program === program ? ' selected' : '';
      return '<option value="' + program + '"' + selected + '>' + program + '</option>';
    }).join('');

    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<h1 class="onboarding__title">What program are you in?</h1>' +
        '<p class="onboarding__subtitle">This helps us personalize your UNite experience.</p>' +
        '<div class="onboarding__body">' +
          '<label class="input-label" for="program-select">Program</label>' +
          '<select id="program-select" class="input-field">' +
            '<option value="" disabled' + (profile.program ? '' : ' selected') + '>Select your program</option>' +
            optionsHtml +
          '</select>' +
        '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="program-continue" class="btn-primary btn-block"' +
            (profile.program ? '' : ' disabled') + '>Continue</button>' +
        '</footer>' +
      '</section>';

    var programSelect = document.getElementById('program-select');
    var continueBtn = document.getElementById('program-continue');

    programSelect.addEventListener('change', function () {
      continueBtn.disabled = !programSelect.value;
    });

    continueBtn.addEventListener('click', function () {
      if (!programSelect.value) return;
      profile.program = programSelect.value;
      goNext();
    });
  }

  /**
   * Renders the car ownership question with Yes and No buttons.
   */
  function renderCarScreen() {
    renderChoiceQuestion({
      questionIndex: 3,
      title: 'Do you have a car?',
      subtitle: 'This helps us set smart defaults in the Marketplace.',
      options: ['Yes', 'No'],
      row: true,
      currentValue: profile.has_car === true ? 'Yes' : profile.has_car === false ? 'No' : null,
      onSelect: function (value) {
        profile.has_car = value === 'Yes';
      }
    });
  }

  /**
   * Renders the multi-select interests question with toggle chips.
   */
  function renderInterestsScreen() {
    updateProgress(7);

    var chipsHtml = interestOptions.map(function (interest) {
      var selected = profile.interests.indexOf(interest) !== -1 ? ' onboarding__chip--selected' : '';
      return '<button type="button" class="onboarding__chip' + selected + '" data-interest="' + interest + '">' + interest + '</button>';
    }).join('');

    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<h1 class="onboarding__title">What are your interests?</h1>' +
        '<p class="onboarding__subtitle">Pick as many as you like — tap to select.</p>' +
        '<div class="onboarding__body">' +
          '<div class="onboarding__chips" id="interest-chips">' + chipsHtml + '</div>' +
        '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="interests-continue" class="btn-primary btn-block"' +
            (profile.interests.length ? '' : ' disabled') + '>Continue</button>' +
        '</footer>' +
      '</section>';

    var selectedInterests = profile.interests.slice();
    var continueBtn = document.getElementById('interests-continue');

    document.getElementById('interest-chips').addEventListener('click', function (event) {
      var chip = event.target.closest('.onboarding__chip');
      if (!chip) return;

      var interest = chip.dataset.interest;
      var index = selectedInterests.indexOf(interest);

      if (index === -1) {
        selectedInterests.push(interest);
        chip.classList.add('onboarding__chip--selected');
      } else {
        selectedInterests.splice(index, 1);
        chip.classList.remove('onboarding__chip--selected');
      }

      continueBtn.disabled = selectedInterests.length === 0;
    });

    continueBtn.addEventListener('click', function () {
      if (!selectedInterests.length) return;
      profile.interests = selectedInterests.slice();
      goNext();
    });
  }

  /**
   * Renders the welcome screen with personalized cards and a finish button.
   */
  function renderWelcomeScreen() {
    hideProgress();
    saveProfile();

    var cards = buildWelcomeCards();
    var cardsHtml = cards.map(function (card) {
      return '<article class="onboarding__welcome-card">' +
        '<div class="onboarding__welcome-card-icon" aria-hidden="true">' + card.icon + '</div>' +
        '<h2 class="onboarding__welcome-card-title">' + card.title + '</h2>' +
        '<p class="onboarding__welcome-card-desc">' + card.desc + '</p>' +
      '</article>';
    }).join('');

    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<h1 class="onboarding__title">Welcome to UNite, ' + profile.name + '!</h1>' +
        '<p class="onboarding__subtitle">Here is what we found for you.</p>' +
        '<div class="onboarding__welcome-cards">' + cardsHtml + '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="lets-go" class="btn-primary btn-block">Let\'s Go</button>' +
        '</footer>' +
      '</section>';

    document.getElementById('lets-go').addEventListener('click', redirectToFeature);
  }

  /**
   * Picks and renders the correct screen based on the current step index.
   */
  function renderScreen() {
    switch (currentScreen) {
      case 0:
        renderEmailScreen();
        break;
      case 1:
        renderVerificationScreen();
        break;
      case 2:
        renderNameScreen();
        break;
      case 3:
        renderProgramScreen();
        break;
      case 4:
        renderChoiceQuestion({
          questionIndex: 2,
          title: 'What year are you?',
          options: years,
          currentValue: profile.year || null,
          onSelect: function (value) {
            profile.year = value;
          }
        });
        break;
      case 5:
        renderCarScreen();
        break;
      case 6:
        renderChoiceQuestion({
          questionIndex: 4,
          title: 'Where do you live?',
          options: housingOptions,
          currentValue: profile.housing || null,
          onSelect: function (value) {
            profile.housing = value;
          }
        });
        break;
      case 7:
        renderChoiceQuestion({
          questionIndex: 5,
          title: 'What is your biggest challenge right now?',
          options: challenges,
          currentValue: profile.challenge || null,
          onSelect: function (value) {
            profile.challenge = value;
          }
        });
        break;
      case 8:
        renderChoiceQuestion({
          questionIndex: 6,
          title: 'Are you more of an introvert or extrovert?',
          options: personalities,
          currentValue: profile.personality || null,
          onSelect: function (value) {
            profile.personality = value;
          }
        });
        break;
      case 9:
        renderInterestsScreen();
        break;
      case 10:
        renderWelcomeScreen();
        break;
      default:
        renderEmailScreen();
    }
  }

  /**
   * Starts the onboarding flow when the page loads.
   */
  function init() {
    var params = new URLSearchParams(window.location.search);
    var demoScreen = params.get('screen');
    var reason = params.get('reason');

    // Already has a token but incomplete profile — skip signup, go straight to Q1
    if (reason === 'incomplete') {
      var token = localStorage.getItem('unite_token');
      if (token) {
        currentScreen = 3;
        renderScreen();
        return;
      }
    }

    if (demoScreen === 'program') {
      localStorage.setItem(INTENT_KEY, 'marketplace');
      profile.primary_intent = 'marketplace';
      profile.email = 'mousa@ucalgary.ca';
      profile.name = 'Mousa';
      currentScreen = 3;
      renderScreen();
      return;
    }

    if (!profile.primary_intent) {
      profile.primary_intent = 'course_compass';
      localStorage.setItem(INTENT_KEY, 'course_compass');
    }
    renderScreen();
  }

  init();
})();
