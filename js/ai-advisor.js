// Handles all frontend interactions with the UCalgary AI academic advisor powered by Claude

import { getToken, getUser, authHeader } from './auth.js';

const API = '/api/ai';

// Stores the conversation history so the advisor remembers what was said earlier in the session
let conversationHistory = [];

// Sends a student's question to the AI advisor and returns the response text
async function askAdvisor(message) {
  const user = getUser();

  const payload = {
    message,
    program: user?.program || null,
    year: user?.year || null,
    transcript: user?.completed_courses || []
  };

  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader()
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: data.reply });

    return { success: true, reply: data.reply };
  } catch {
    return { success: false, error: 'Could not reach the AI advisor. Please try again.' };
  }
}

// Requests a semester-by-semester roadmap for the student's program and completed courses
async function generateRoadmap(program, year, completedCourses) {
  try {
    const res = await fetch(`${API}/roadmap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader()
      },
      body: JSON.stringify({ program, year, completed_courses: completedCourses || [] })
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, roadmap: data.roadmap };
  } catch {
    return { success: false, error: 'Could not generate roadmap. Please try again.' };
  }
}

// Renders a single chat message bubble into the chat container element
function renderMessage(container, role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-bubble--${role}`;

  const label = document.createElement('span');
  label.className = 'chat-bubble__label';
  label.textContent = role === 'user' ? 'You' : 'Course Compass AI';

  const content = document.createElement('p');
  content.className = 'chat-bubble__text';
  content.textContent = text;

  bubble.appendChild(label);
  bubble.appendChild(content);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// Shows a loading spinner in the chat while waiting for the AI to respond
function renderThinking(container) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble--assistant chat-bubble--thinking';
  bubble.id = 'thinking-bubble';
  bubble.innerHTML = `
    <span class="chat-bubble__label">Course Compass AI</span>
    <div class="thinking-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// Removes the loading spinner once the AI response has arrived
function removeThinking() {
  const el = document.getElementById('thinking-bubble');
  if (el) el.remove();
}

// Initializes the chat interface — wires up the send button and enter-key listener
function initAdvisorChat(containerId, inputId, sendBtnId) {
  const container = document.getElementById(containerId);
  const input = document.getElementById(inputId);
  const sendBtn = document.getElementById(sendBtnId);

  if (!container || !input || !sendBtn) return;

  // Greet the student when the advisor loads
  const user = getUser();
  const greeting = user?.name
    ? `Hi ${user.name}! I'm your UCalgary academic advisor. Ask me anything about your courses, prerequisites, or degree plan.`
    : `Hi! I'm your UCalgary academic advisor. Ask me anything about courses, prerequisites, or your degree plan.`;
  renderMessage(container, 'assistant', greeting);

  // Sends the message when the button is clicked
  sendBtn.addEventListener('click', () => handleSend(container, input));

  // Sends the message when Enter is pressed (Shift+Enter for new line)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(container, input);
    }
  });
}

// Handles the full send flow — renders user message, shows thinking, gets reply, renders reply
async function handleSend(container, input) {
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;

  renderMessage(container, 'user', text);
  renderThinking(container);

  const result = await askAdvisor(text);

  removeThinking();
  input.disabled = false;
  input.focus();

  if (result.success) {
    renderMessage(container, 'assistant', result.reply);
  } else {
    renderMessage(container, 'assistant', `Sorry, something went wrong: ${result.error}`);
  }
}

// Clears the in-memory conversation history — call this when the user starts a new session
function clearHistory() {
  conversationHistory = [];
}

export {
  askAdvisor,
  generateRoadmap,
  initAdvisorChat,
  clearHistory,
  conversationHistory
};
