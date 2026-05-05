/**
 * Indo Heals – AI Chat Widget
 * Communicates with POST /api/chat/ask
 */

(function () {
  "use strict";

  const API_BASE = window.API_BASE || "http://localhost:5001";
  const CHAT_ENDPOINT = `${API_BASE}/api/chat/ask`;

  let chatOpen = false;
  let chatHistory = [];
  let isTyping = false;

  /* ───── Toggle open/close ───── */
  window.toggleChat = function () {
    chatOpen = !chatOpen;
    const panel = document.getElementById("chatPanel");
    const btn = document.getElementById("chatToggleBtn");
    const openIcon = btn.querySelector(".chat-icon-open");
    const closeIcon = btn.querySelector(".chat-icon-close");
    const badge = document.getElementById("chatBadge");

    if (chatOpen) {
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      btn.setAttribute("aria-expanded", "true");
      openIcon.style.display = "none";
      closeIcon.style.display = "block";
      badge.style.display = "none";
      document.getElementById("chatInput").focus();
      scrollToBottom();
    } else {
      panel.style.display = "none";
      btn.setAttribute("aria-expanded", "false");
      openIcon.style.display = "block";
      closeIcon.style.display = "none";
    }
  };

  /* ───── Suggestion chips ───── */
  window.sendSuggestion = function (text) {
    document.getElementById("chatInput").value = text;
    hideSuggestions();
    sendChatMessage(null, text);
  };

  function hideSuggestions() {
    const s = document.getElementById("chatSuggestions");
    if (s) s.style.display = "none";
  }

  /* ───── Send message ───── */
  window.sendChatMessage = async function (event, overrideText) {
    if (event) event.preventDefault();
    if (isTyping) return;

    const input = document.getElementById("chatInput");
    const message = (overrideText || input.value).trim();
    if (!message) return;

    input.value = "";
    hideSuggestions();

    appendMessage("user", message);
    chatHistory.push({ role: "user", content: message });

    showTypingIndicator();

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: chatHistory.slice(-6) })
      });

      hideTypingIndicator();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || "I'm sorry, I couldn't understand that. Please try again.";

      appendMessage("bot", reply);
      chatHistory.push({ role: "assistant", content: reply });

    } catch (err) {
      hideTypingIndicator();
      console.error("Chat error:", err);
      const fallback = getOfflineFallback(message);
      appendMessage("bot", fallback);
      chatHistory.push({ role: "assistant", content: fallback });
    }
  };

  /* ───── Offline fallback ───── */
  function getOfflineFallback(message) {
    const msg = message.toLowerCase();
    if (msg.includes("appointment") || msg.includes("book")) {
      return "To book an appointment, click 'Book an Appointment' in the top navigation. Our Unani doctors offer video call consultations! 📅";
    }
    if (msg.includes("price") || msg.includes("cost")) {
      return "Our products range from ₹299 to ₹349:\n• Breathe Classic – ₹299\n• Breathe Energy – ₹349\n• Breathe Immunity – ₹349\n• Breathe Slim – ₹329";
    }
    if (msg.includes("contact") || msg.includes("phone") || msg.includes("email")) {
      return "📞 Contact us:\nEmail: Contact@indoheals.com\nPhone: +91 9955289295";
    }
    return "I'm having trouble connecting right now. Please try again in a moment, or contact us at Contact@indoheals.com or +91 9955289295. 🙏";
  }

  /* ───── Render helpers ───── */
  function appendMessage(role, text) {
    const container = document.getElementById("chatMessages");
    const wrapper = document.createElement("div");
    wrapper.className = `chat-message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = formatMarkdown(text);

    const time = document.createElement("div");
    time.className = "chat-time";
    time.textContent = getCurrentTime();

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    container.appendChild(wrapper);
    scrollToBottom();
  }

  function showTypingIndicator() {
    isTyping = true;
    const container = document.getElementById("chatMessages");
    const indicator = document.createElement("div");
    indicator.className = "chat-message bot";
    indicator.id = "typingIndicator";
    indicator.innerHTML = `
      <div class="chat-bubble typing-indicator">
        <span></span><span></span><span></span>
      </div>`;
    container.appendChild(indicator);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    isTyping = false;
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
  }

  function scrollToBottom() {
    const container = document.getElementById("chatMessages");
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  /* ───── Simple markdown formatter ───── */
  function formatMarkdown(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  /* ───── Close on outside click ───── */
  document.addEventListener("click", function (e) {
    if (!chatOpen) return;
    const widget = document.getElementById("chatWidget");
    if (widget && !widget.contains(e.target)) {
      // Don't auto-close on outside click — user needs to manually close
    }
  });

  /* ───── Keyboard shortcut: Escape to close ───── */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && chatOpen) {
      toggleChat();
    }
  });

  /* ───── Pulse the badge after 3 seconds ───── */
  setTimeout(function () {
    const badge = document.getElementById("chatBadge");
    const btn = document.getElementById("chatToggleBtn");
    if (badge && !chatOpen) {
      badge.style.display = "flex";
      btn.classList.add("chat-pulse");
    }
  }, 3000);

})();
