/*!
 * FIS Website Chat Widget
 * Self-contained embed script. Loads the same chat that powers the FIS
 * landing page, so WordPress visitors can chat and admins can reply from the
 * existing dashboard inbox. No React/Tailwind required.
 *
 * Usage: <script src="https://job.floorinteriorservices.com/chat-widget.js" defer></script>
 */
(function () {
  'use strict';

  // ---- Config -----------------------------------------------------------
  var scriptEl = (typeof document !== 'undefined' && document.currentScript) || null;
  var API_BASE = 'https://job.floorinteriorservices.com';
  if (scriptEl && scriptEl.src) {
    try { API_BASE = new URL(scriptEl.src).origin; } catch (e) {}
  }
  if (
    window.__FIS_CHAT_CONFIG__ &&
    typeof window.__FIS_CHAT_CONFIG__.apiBase === 'string' &&
    window.__FIS_CHAT_CONFIG__.apiBase.trim()
  ) {
    API_BASE = window.__FIS_CHAT_CONFIG__.apiBase.trim().replace(/\/+$/, '');
  }

  var TOKEN_KEY = 'fis-website-chat-token';
  var OPEN_KEY = 'fis-website-chat-open';
  var NAME_KEY = 'fis-website-chat-name';
  var EMAIL_KEY = 'fis-website-chat-email';
  var SEEN_KEY = 'fis-website-chat-seen-at';
  var AI_FALLBACK_WAIT_MS = 45000;

  var ALICE_IMG = API_BASE + '/alice-interviewer.png';

  // ---- Brand palette (matches tailwind.config.ts) -----------------------
  var GREEN = '#8CB63C';
  var GREEN_DARK = '#7AA32F';
  var GREEN_LIGHT = '#A3C95A';
  var ONLINE = '#4ADE80';

  // ---- State -------------------------------------------------------------
  var token = '';
  var started = false;
  var open = true;
  var messages = [];
  var seenAt = 0;
  var name = '';
  var email = '';
  var lastId = '';
  var aiFallbackTimer = null;
  var sending = false;
  var starting = false;
  var stopped = false;

  // ---- Storage helpers ---------------------------------------------------
  function lsGet(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }

  function ensureToken() {
    var existing = lsGet(TOKEN_KEY);
    if (existing && existing.length >= 16) return existing;
    var bytes = new Uint8Array(24);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var t = '';
    for (var j = 0; j < bytes.length; j++) t += bytes[j].toString(16).padStart(2, '0');
    lsSet(TOKEN_KEY, t);
    return t;
  }

  function identity() {
    return { name: (name || '').trim(), email: (email || '').trim() };
  }

  // ---- DOM scaffolding ----------------------------------------------------
  var style = document.createElement('style');
  style.textContent = [
    '.fis-chat-root, .fis-chat-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif; line-height: 1.5; }',
    '.fis-chat-root button, .fis-chat-root textarea, .fis-chat-root input { font-family: inherit; font-size: inherit; letter-spacing: normal; text-transform: none; }',
    '.fis-chat-root[hidden], .fis-chat-root [hidden] { display: none !important; }',
    '.fis-chat-launcher { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; display: inline-flex; align-items: center; border: 0; cursor: pointer; border-radius: 9999px; padding: 6px 6px 6px 20px; background: ' + GREEN + '; color: #ffffff; box-shadow: 0 10px 28px rgba(74,124,35,0.38); }',
    '.fis-chat-launcher:hover { background: ' + GREEN_DARK + '; }',
    '.fis-chat-launcher .fis-label { font-size: 17px; font-weight: 600; padding-right: 12px; letter-spacing: -0.01em; }',
    '.fis-chat-launcher .fis-dot { position: absolute; left: 8px; bottom: 2px; width: 14px; height: 14px; border-radius: 9999px; background: ' + ONLINE + '; border: 2.5px solid #ffffff; }',
    '.fis-chat-launcher .fis-bubble { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 9999px; background: rgba(255,255,255,0.2); }',
    '.fis-chat-launcher .fis-bubble svg { width: 24px; height: 24px; fill: #ffffff; }',
    '.fis-chat-launcher .fis-badge { position: absolute; top: -6px; right: -6px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 9999px; background: #ef4444; color: #fff; font-size: 12px; font-weight: 800; line-height: 20px; text-align: center; border: 2px solid #fff; }',
    '.fis-chat-window { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; width: min(100% - 24px, 380px); height: min(560px, 82vh); display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 12px 32px rgba(74,124,35,0.18); }',
    '.fis-chat-window.fis-expanded { width: min(100% - 24px, 420px); height: min(720px, 90vh); }',
    '.fis-header { background: ' + GREEN + '; color: #fff; padding: 8px 16px 16px; }',
    '.fis-header .fis-top { display: flex; justify-content: flex-end; gap: 4px; margin-bottom: 12px; }',
    '.fis-header .fis-top button { background: transparent; border: 0; color: #fff; cursor: pointer; border-radius: 8px; padding: 6px; line-height: 0; }',
    '.fis-header .fis-top button:hover { background: rgba(255,255,255,0.12); }',
    '.fis-header .fis-top svg { width: 20px; height: 20px; stroke: #fff; fill: none; stroke-width: 2; }',
    '.fis-header .fis-id { display: flex; align-items: center; gap: 12px; }',
    '.fis-avatar { position: relative; flex-shrink: 0; width: 56px; height: 56px; border-radius: 9999px; background: #fff; overflow: hidden; box-shadow: 0 0 0 2px #fff; }',
    '.fis-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: top; }',
    '.fis-avatar svg { width: 32px; height: 32px; fill: ' + GREEN + '; }',
    '.fis-header .fis-title { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }',
    '.fis-header .fis-status { margin-top: 4px; display: flex; align-items: center; gap: 6px; font-size: 14px; color: rgba(255,255,255,0.9); }',
    '.fis-header .fis-status .fis-online-dot { width: 10px; height: 10px; border-radius: 9999px; background: ' + ONLINE + '; }',
    '.fis-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }',
    '.fis-start { display: flex; flex-direction: column; gap: 12px; padding: 16px; flex: 1; }',
    '.fis-start p { font-size: 14px; color: #475569; }',
    '.fis-start input { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 12px; font-size: 14px; outline: none; }',
    '.fis-start input:focus { border-color: ' + GREEN + '; box-shadow: 0 0 0 3px rgba(140,182,60,0.2); }',
    '.fis-start button.fis-primary { margin-top: auto; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 12px; background: ' + GREEN + '; color: #fff; font-size: 14px; font-weight: 600; padding: 10px 16px; cursor: pointer; }',
    '.fis-start button.fis-primary:hover { background: ' + GREEN_DARK + '; }',
    '.fis-start button.fis-primary:disabled { opacity: 0.6; cursor: default; }',
    '.fis-error { font-size: 12px; color: #dc2626; }',
    '.fis-thread { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 16px; background: #fff; }',
    '.fis-thread .fis-empty { text-align: center; color: #64748b; font-size: 14px; }',
    '.fis-msg { display: flex; width: 100%; }',
    '.fis-msg.fis-from-staff { justify-content: flex-start; align-items: flex-end; gap: 10px; }',
    '.fis-msg.fis-from-visitor { justify-content: flex-end; }',
    '.fis-msg .fis-mini-avatar { flex-shrink: 0; width: 32px; height: 32px; border-radius: 9999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 24px; }',
    '.fis-msg .fis-mini-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: top; }',
    '.fis-msg .fis-mini-avatar svg { width: 20px; height: 20px; fill: ' + GREEN + '; }',
    '.fis-bubble-wrap { position: relative; }',
    '.fis-bubble { padding: 12px 16px; border-radius: 16px; font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }',
    '.fis-msg.fis-from-staff .fis-bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }',
    '.fis-msg.fis-from-visitor .fis-bubble { padding: 10px 16px; background: ' + GREEN + '; color: #fff; font-weight: 500; border-bottom-right-radius: 4px; }',
    '.fis-bubble-tail { position: absolute; bottom: 12px; width: 10px; height: 10px; transform: rotate(45deg); }',
    '.fis-msg.fis-from-staff .fis-bubble-tail { left: -5px; background: #f1f5f9; }',
    '.fis-msg.fis-from-visitor .fis-bubble-tail { right: -5px; background: ' + GREEN + '; }',
    '.fis-msg .fis-time { font-size: 12px; color: #94a3b8; margin-top: 6px; padding-left: 4px; }',
    '.fis-bubble a { color: inherit; text-decoration: underline; }',
    '.fis-compose { border-top: 1px solid #f1f5f9; padding: 12px; }',
    '.fis-compose .fis-row { display: flex; align-items: flex-end; gap: 8px; }',
    '.fis-compose textarea { flex: 1; min-height: 40px; max-height: 120px; resize: none; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 12px; font-size: 14px; outline: none; line-height: 1.4; }',
    '.fis-compose textarea:focus { border-color: ' + GREEN + '; box-shadow: 0 0 0 3px rgba(140,182,60,0.2); }',
    '.fis-compose button { flex-shrink: 0; width: 40px; height: 40px; border-radius: 9999px; border: 0; background: ' + GREEN + '; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }',
    '.fis-compose button:hover { background: ' + GREEN_DARK + '; }',
    '.fis-compose button:disabled { opacity: 0.5; cursor: default; }',
    '.fis-compose button svg { width: 18px; height: 18px; fill: #fff; }',
    '.fis-spin { animation: fis-spin 0.8s linear infinite; }',
    '@keyframes fis-spin { to { transform: rotate(360deg); } }'
  ].join('\n');
  document.head.appendChild(style);

  // Small icon helper (inline SVG strings)
  function chatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }
  function sparkleIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.9 5.7L19.5 9l-5.6 1.3L12 16l-1.9-5.7L4.5 9l5.6-1.3L12 2z"/></svg>';
  }
  function aliceImg() {
    return '<img src="' + ALICE_IMG + '" alt="Alice" />';
  }
  function chevronIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  }
  function expandIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  }
  function shrinkIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  }
  function sendIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  }
  function spinnerIcon() {
    return '<svg class="fis-spin" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  }

  // ---- Build DOM ----------------------------------------------------------
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'fis-chat-root fis-chat-launcher';
  launcher.setAttribute('aria-label', 'Open chat support');
  launcher.innerHTML =
    '<span class="fis-dot"></span>' +
    '<span class="fis-label">Chat</span>' +
    '<span class="fis-bubble">' + chatIcon() + '</span>' +
    '<span class="fis-badge" hidden></span>';

  var win = document.createElement('div');
  win.className = 'fis-chat-root fis-chat-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Chat support');
  win.innerHTML =
    '<div class="fis-header">' +
      '<div class="fis-top">' +
        '<button type="button" data-act="expand" aria-label="Expand chat">' + expandIcon() + '</button>' +
        '<button type="button" data-act="minimize" aria-label="Minimize chat">' + chevronIcon() + '</button>' +
      '</div>' +
      '<div class="fis-id">' +
        '<span class="fis-avatar">' + aliceImg() + '</span>' +
        '<div>' +
          '<p class="fis-title">How can we help?</p>' +
          '<p class="fis-status"><span class="fis-online-dot"></span><span data-role="status">Alice can help with onboarding</span></p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="fis-body" data-role="body"></div>' +
    '<div class="fis-compose" hidden>' +
      '<p class="fis-error" data-role="error"></p>' +
      '<div class="fis-row">' +
        '<textarea rows="1" placeholder="Write a message..."></textarea>' +
        '<button type="button" data-act="send" aria-label="Send"></button>' +
      '</div>' +
    '</div>';

  var bodyEl = win.querySelector('[data-role="body"]');
  var composeEl = win.querySelector('.fis-compose');
  var textarea = win.querySelector('textarea');
  var sendBtn = win.querySelector('[data-act="send"]');
  var errorEl = win.querySelector('[data-role="error"]');
  var statusEl = win.querySelector('[data-role="status"]');
  var badgeEl = launcher.querySelector('.fis-badge');

  sendBtn.innerHTML = sendIcon();

  // ---- Rendering ----------------------------------------------------------
  function formatRelativeTime(dateString) {
    var d = new Date(dateString).getTime();
    var diff = Date.now() - d;
    if (!isFinite(diff) || diff < 0) return 'Just now';
    var m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var days = Math.floor(h / 24);
    if (days < 30) return days + 'd ago';
    var months = Math.floor(days / 30);
    if (months < 12) return months + ' month' + (months === 1 ? '' : 's') + ' ago';
    return Math.floor(days / 365) + 'y ago';
  }

  function linkify(text) {
    var urlRe = /(https?:\/\/[^\s<>"']+)/g;
    var parts = String(text || '').split(urlRe);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      if (urlRe.test(p) && /^https?:\/\//.test(p)) {
        urlRe.lastIndex = 0;
        var a = document.createElement('a');
        a.href = p;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = p;
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(p));
      }
    }
    return frag;
  }

  function clearBody() {
    while (bodyEl.firstChild) bodyEl.removeChild(bodyEl.firstChild);
  }

  function renderStart() {
    clearBody();
    composeEl.hidden = true;
    var form = document.createElement('form');
    form.className = 'fis-start';
    form.innerHTML =
      '<p>Name and email are optional. If you skip them, we will start the chat as a visitor.</p>' +
      '<input type="text" placeholder="Your name (optional)" value="" />' +
      '<input type="email" placeholder="Email (optional)" value="" />' +
      '<p class="fis-error" data-role="error"></p>' +
      '<button type="submit" class="fis-primary">Start chat</button>';
    var nameInput = form.querySelector('input[type="text"]');
    var emailInput = form.querySelector('input[type="email"]');
    nameInput.value = name;
    emailInput.value = email;
    var startError = form.querySelector('[data-role="error"]');
    var startBtn = form.querySelector('button');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nextName = nameInput.value.trim();
      var nextEmail = emailInput.value.trim();
      name = nextName;
      email = nextEmail;
      lsSet(NAME_KEY, nextName);
      lsSet(EMAIL_KEY, nextEmail);
      startChat(startBtn, startError);
    });
    bodyEl.appendChild(form);
  }

  function renderThread() {
    clearBody();
    composeEl.hidden = false;
    var thread = document.createElement('div');
    thread.className = 'fis-thread';
    if (messages.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'fis-empty';
      empty.textContent = 'Ask about onboarding, insurance, or required documents.';
      thread.appendChild(empty);
    } else {
      messages.forEach(function (msg) {
        var fromStaff = msg.senderType === 'admin' || msg.senderType === 'alice';
        var row = document.createElement('div');
        row.className = 'fis-msg ' + (fromStaff ? 'fis-from-staff' : 'fis-from-visitor');

        if (fromStaff) {
          var av = document.createElement('span');
          av.className = 'fis-mini-avatar';
          av.innerHTML = aliceImg();
          row.appendChild(av);
        }

        var wrap = document.createElement('div');
        wrap.style.maxWidth = fromStaff ? 'calc(100% - 44px)' : '78%';
        var bubbleWrap = document.createElement('div');
        bubbleWrap.className = 'fis-bubble-wrap';
        var bubble = document.createElement('div');
        bubble.className = 'fis-bubble';
        bubble.appendChild(linkify(msg.content));
        bubbleWrap.appendChild(bubble);
        var tail = document.createElement('span');
        tail.className = 'fis-bubble-tail';
        tail.setAttribute('aria-hidden', 'true');
        bubbleWrap.appendChild(tail);
        wrap.appendChild(bubbleWrap);

        if (fromStaff) {
          var time = document.createElement('p');
          time.className = 'fis-time';
          time.textContent = formatRelativeTime(msg.createdAt);
          wrap.appendChild(time);
        }
        row.appendChild(wrap);
        thread.appendChild(row);
      });
    }
    bodyEl.appendChild(thread);
    thread.scrollTop = thread.scrollHeight;
  }

  function render() {
    if (!open) {
      launcher.hidden = false;
      win.hidden = true;
      return;
    }
    launcher.hidden = true;
    win.hidden = false;

    var adminJoined = messages.some(function (m) { return m.senderType === 'admin'; });
    statusEl.textContent = adminJoined ? 'A team member has joined' : 'Alice can help with onboarding';

    var showThread = started || adminJoined || messages.some(function (m) { return m.senderType === 'alice'; });
    if (showThread) {
      renderThread();
    } else {
      renderStart();
    }
    updateBadge();
  }

  function updateBadge() {
    var unread = open ? 0 : messages.filter(function (m) {
      return (m.senderType === 'admin' || m.senderType === 'alice') && new Date(m.createdAt).getTime() > seenAt;
    }).length;
    if (unread > 0) {
      badgeEl.hidden = false;
      badgeEl.textContent = unread > 9 ? '9+' : String(unread);
      launcher.setAttribute('aria-label', 'Open chat support, ' + unread + ' new messages');
    } else {
      badgeEl.hidden = true;
      launcher.setAttribute('aria-label', 'Open chat support');
    }
  }

  function markSeen() {
    seenAt = Date.now();
    lsSet(SEEN_KEY, String(seenAt));
    updateBadge();
  }

  // ---- API helpers ---------------------------------------------------------
  function post(path, body, headers) {
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
      body: JSON.stringify(body || {}),
      cache: 'no-store'
    });
  }

  function chatHeaders() {
    return token ? { 'x-website-chat-token': token } : {};
  }

  // ---- Chat flow -----------------------------------------------------------
  function applyKnownIdentity(chat) {
    if (!chat) return;
    if (!name && chat.name && String(chat.name).indexOf('Visitor ') !== 0) {
      name = chat.name;
      lsSet(NAME_KEY, name);
    }
    if (!email && chat.email && !String(chat.email).endsWith('@noreply.local')) {
      email = chat.email;
      lsSet(EMAIL_KEY, email);
    }
  }

  function startChat(btn, errEl) {
    if (starting) return;
    starting = true;
    btn.disabled = true;
    btn.textContent = 'Starting\u2026';
    if (errEl) errEl.textContent = '';

    var chatToken = token || ensureToken();
    token = chatToken;
    lsSet(TOKEN_KEY, chatToken);

    post('/api/website-chat', { name: name, email: email }, chatHeaders())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.token) {
          token = data.token;
          lsSet(TOKEN_KEY, token);
        }
        applyKnownIdentity(data.chat);
        if (data.chat && data.chat.name) name = data.chat.name;
        if (data.chat && data.chat.email && !String(data.chat.email).endsWith('@noreply.local')) email = data.chat.email;
        started = true;
        return loadMessages(true);
      })
      .catch(function (err) {
        if (errEl) errEl.textContent = (err && err.message) || 'Could not start chat';
      })
      .then(function () {
        starting = false;
        btn.disabled = false;
        btn.textContent = 'Start chat';
        render();
      });
  }

  function loadMessages(wait) {
    if (!token) return Promise.resolve();
    return post('/api/website-chat/messages', {
      poll: true,
      sinceId: lastId,
      waitMs: wait ? 8000 : 0,
      t: Date.now()
    }, chatHeaders())
      .then(function (res) {
        if (res.status === 404) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.messages)) return;
        var next = data.messages;
        var prevLastId = lastId;
        var nextLastId = next.length ? next[next.length - 1].id : '';
        lastId = nextLastId || prevLastId;

        var same = next.length === messages.length &&
          next.length > 0 &&
          messages[messages.length - 1] &&
          messages[messages.length - 1].id === next[next.length - 1].id;

        if (!same) {
          messages = next;
          var staffWrote = next.some(function (m) { return m.senderType === 'admin' || m.senderType === 'alice'; });
          if (next.length && staffWrote) started = true;
          var newest = next[next.length - 1];
          var newestIsStaff = newest && (newest.senderType === 'admin' || newest.senderType === 'alice');
          if (newestIsStaff && nextLastId && nextLastId !== prevLastId) {
            if (aiFallbackTimer) { clearTimeout(aiFallbackTimer); aiFallbackTimer = null; }
          }
          var newestIsAdmin = newest && newest.senderType === 'admin';
          if (newestIsAdmin && nextLastId && nextLastId !== prevLastId) {
            open = true;
            ssSet(OPEN_KEY, '1');
          }
        }
        render();
      })
      .catch(function () {});
  }

  function pollLoop() {
    var run = function () {
      if (stopped) return;
      var t = token || ensureToken();
      if (!t) {
        setTimeout(run, 400);
        return;
      }
      token = t;
      loadMessages(true).then(function () {
        if (!stopped) setTimeout(run, 150);
      });
    };
    run();
  }

  function pingLoop() {
    var ping = function () {
      if (stopped) return;
      var t = token || ensureToken();
      if (!t) return;
      token = t;
      post('/api/website-chat/ping', identity(), chatHeaders()).catch(function () {});
    };
    ping();
    setInterval(function () {
      if (!stopped) ping();
    }, 4000);
  }

  function sendMessage() {
    var content = textarea.value.trim();
    if (!content || !token || sending) return;
    sending = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = spinnerIcon();
    errorEl.textContent = '';

    post('/api/website-chat/messages', { content: content }, chatHeaders())
      .then(function (res) {
        if (res.status === 404) {
          resetSession();
          throw new Error('Chat ended. Please start a new chat.');
        }
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || 'Could not send');
        textarea.value = '';
        textarea.style.height = 'auto';
        var data = result.data;
        if (data.message && !messages.some(function (m) { return m.id === data.message.id; })) {
          messages.push(data.message);
        }
        if (data.aliceMessage && !messages.some(function (m) { return m.id === data.aliceMessage.id; })) {
          messages.push(data.aliceMessage);
        }
        lastId = messages.length ? messages[messages.length - 1].id : lastId;

        if (data.aliceMessage) {
          if (aiFallbackTimer) { clearTimeout(aiFallbackTimer); aiFallbackTimer = null; }
        } else {
          var chatToken = token;
          if (aiFallbackTimer) clearTimeout(aiFallbackTimer);
          aiFallbackTimer = setTimeout(function () {
            aiFallbackTimer = null;
            post('/api/website-chat/messages', { requestAi: true }, chatHeaders())
              .then(function (res) { return res.json(); })
              .then(function (fallback) {
                if (fallback.aliceMessage && !messages.some(function (m) { return m.id === fallback.aliceMessage.id; })) {
                  messages.push(fallback.aliceMessage);
                  render();
                }
              })
              .catch(function () {});
          }, AI_FALLBACK_WAIT_MS);
        }
        render();
      })
      .catch(function (err) {
        errorEl.textContent = (err && err.message) || 'Could not send';
      })
      .then(function () {
        sending = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = sendIcon();
        updateBadge();
      });
  }

  function resetSession() {
    lsDel(TOKEN_KEY);
    lsDel(SEEN_KEY);
    token = '';
    started = false;
    messages = [];
    lastId = '';
    seenAt = 0;
  }

  // ---- Events --------------------------------------------------------------
  launcher.addEventListener('click', function () {
    open = true;
    ssSet(OPEN_KEY, '1');
    render();
  });

  win.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'minimize') {
      open = false;
      ssSet(OPEN_KEY, '0');
      render();
    } else if (act === 'expand') {
      var expanded = win.classList.toggle('fis-expanded');
      btn.innerHTML = expanded ? shrinkIcon() : expandIcon();
      btn.setAttribute('aria-label', expanded ? 'Shrink chat' : 'Expand chat');
    } else if (act === 'send') {
      sendMessage();
    }
  });

  textarea.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      sendMessage();
    }
  });

  textarea.addEventListener('input', function () {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') loadMessages(false);
  });
  window.addEventListener('focus', function () {
    loadMessages(false);
  });

  // ---- Init ----------------------------------------------------------------
  function init() {
    // Restore identity
    var storedName = lsGet(NAME_KEY);
    var storedEmail = lsGet(EMAIL_KEY);
    if (storedName) name = storedName;
    if (storedEmail) email = storedEmail;

    // Restore open state (default open on first visit)
    var storedOpen = ssGet(OPEN_KEY);
    open = storedOpen !== '0';

    var seen = Number(lsGet(SEEN_KEY) || 0);
    if (isFinite(seen) && seen > 0) seenAt = seen;

    document.body.appendChild(launcher);
    document.body.appendChild(win);
    render();

    // Presence + token bootstrap
    token = ensureToken();
    post('/api/website-chat', Object.assign({ presence: true }, identity()), chatHeaders())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.token) {
          token = data.token;
          lsSet(TOKEN_KEY, token);
        }
        applyKnownIdentity(data.chat);
        if (data.chat && data.chat.messageCount > 0) {
          started = true;
        }
        render();
      })
      .catch(function () {});

    pingLoop();
    pollLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
