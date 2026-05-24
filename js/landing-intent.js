/**
 * Saves the user's chosen entry intent and sends them to onboarding.
 */
function handleIntentClick(event) {
  event.preventDefault();
  const intent = event.currentTarget.dataset.intent;
  if (!intent) return;
  localStorage.setItem('unite_intent', intent);
  window.location.href = '/features/onboarding.html';
}

document.querySelectorAll('[data-intent]').forEach(function (card) {
  card.addEventListener('click', handleIntentClick);
});
