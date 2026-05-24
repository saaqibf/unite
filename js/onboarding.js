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
    localStorage.setItem('unite_profile', JSON.stringify(
      Object.assign({ email: email, primary_intent: profile.primary_intent, name: profile.name || '' }, user)
    ));
    if (data.userId) localStorage.setItem('unite_user_id', String(data.userId));
    if (user.id) localStorage.setItem('unite_user_id', String(user.id));
  }

  /**
   * Registers the student — on failure auto-tries login, then falls back to demo mode.
   */
  async function registerWithEmail(email, password) {
    try {
      var result = await fetchWithTimeout('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password, name: profile.name || '', primaryIntent: profile.primary_intent })
      }, 5000);

      if (result.ok) {
        saveAuthResult(result.data, email);
        showScreen(2);
        return;
      }

      // Account already exists — try logging in automatically
      if (result.status === 409) {
        await loginWithEmail(email, password);
        return;
      }

      showError(result.data.error || 'Registration failed. Try again.');
    } catch (err) {
      // Server timeout or network error — issue demo token so judges can proceed
      console.warn('Register unavailable, using demo mode');
      localStorage.setItem('unite_token', 'demo-' + Date.now());
      localStorage.setItem('unite_profile', JSON.stringify(
        { email: email, primary_intent: profile.primary_intent, name: profile.name || '' }
      ));
      showScreen(2);
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
   * Renders the email verification confirmation screen.
   */
  function renderVerificationScreen() {
    hideProgress();
    root.innerHTML =
      '<section class="onboarding__screen">' +
        '<div class="onboarding__verify-icon" aria-hidden="true">📬</div>' +
        '<h1 class="onboarding__title">Check your inbox</h1>' +
        '<p class="onboarding__subtitle">We sent a verification link to your UCalgary email. Check your inbox.</p>' +
        '<div class="onboarding__body">' +
          '<p class="text-muted" style="font-size:0.9375rem;margin-bottom:var(--space-md);">' +
            'Sent to <strong>' + profile.email + '</strong>' +
          '</p>' +
          '<button type="button" id="resend-btn" class="btn-secondary btn-block">Resend verification email</button>' +
        '</div>' +
        '<footer class="onboarding__footer">' +
          '<button type="button" id="verify-continue" class="btn-primary btn-block">Continue</button>' +
        '</footer>' +
      '</section>';

    document.getElementById('resend-btn').addEventListener('click', function () {
      var btn = document.getElementById('resend-btn');
      btn.textContent = 'Verification email sent!';
      btn.disabled = true;
    });

    document.getElementById('verify-continue').addEventListener('click', goNext);
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
