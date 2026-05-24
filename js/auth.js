// Handles all frontend authentication — register, login, logout, token storage, and UCalgary email validation

const API = '/api/auth';

// Checks if the email ends with @ucalgary.ca — used for live validation in the signup form
function isUCalgaryEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@ucalgary.ca');
}

// Saves the JWT token and user object to localStorage after a successful login
function saveSession(token, user) {
  localStorage.setItem('unite_token', token);
  localStorage.setItem('unite_user', JSON.stringify(user));
}

// Retrieves the stored JWT token — returns null if not logged in
function getToken() {
  return localStorage.getItem('unite_token');
}

// Retrieves the stored user object — returns null if not logged in
function getUser() {
  const raw = localStorage.getItem('unite_user');
  return raw ? JSON.parse(raw) : null;
}

// Returns true if a token exists in localStorage — does not verify the token's expiry
function isLoggedIn() {
  return !!getToken();
}

// Clears the session from localStorage and redirects to the landing page
function logout() {
  localStorage.removeItem('unite_token');
  localStorage.removeItem('unite_user');
  window.location.href = '/';
}

// Sends register request to the server — returns { success, message, error }
async function register(email, password, name, primaryIntent) {
  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, primaryIntent })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, message: data.message };
  } catch {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

// Sends login request and saves the session if successful — returns { success, user, error }
async function login(email, password) {
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    saveSession(data.token, data.user);
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

// Saves the student's onboarding answers to their server-side profile
async function saveOnboarding(answers) {
  try {
    const res = await fetch(`${API}/onboarding`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(answers)
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

// Fetches the current user's full profile from the server
async function fetchMe() {
  try {
    const res = await fetch(`${API}/me`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

// Redirects to onboarding if the user is not authenticated — call this at the top of protected pages
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/features/onboarding.html';
  }
}

// Redirects to Course Compass if the user IS already logged in — call this on login/register pages
function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = '/features/course-compass.html';
  }
}

// Builds the Authorization header object needed for all authenticated API calls
function authHeader() {
  return { 'Authorization': `Bearer ${getToken()}` };
}

export {
  isUCalgaryEmail,
  register,
  login,
  logout,
  saveOnboarding,
  fetchMe,
  getToken,
  getUser,
  isLoggedIn,
  requireAuth,
  redirectIfLoggedIn,
  authHeader
};
