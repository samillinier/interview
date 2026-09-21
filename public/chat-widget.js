/*!
 * FIS Chat Widget (WordPress / public website)
 * Send-only contact form. Visitors can send a message — they never see
 * other chats, message history, or the admin inbox.
 */
(function () {
  'use strict';

  if (window.__FIS_CHAT_MOUNTED__) return;
  window.__FIS_CHAT_MOUNTED__ = true;

  var scriptEl = (typeof document !== 'undefined' && document.currentScript) || null;
  var APP_ORIGIN = 'https://job.floorinteriorservices.com';
  if (scriptEl && scriptEl.src) {
    try { APP_ORIGIN = new URL(scriptEl.src).origin; } catch (e) {}
  }
  if (
    window.__FIS_CHAT_CONFIG__ &&
    typeof window.__FIS_CHAT_CONFIG__.apiBase === 'string' &&
    window.__FIS_CHAT_CONFIG__.apiBase.trim()
  ) {
    APP_ORIGIN = window.__FIS_CHAT_CONFIG__.apiBase.trim().replace(/\/+$/, '');
  }

  var TOKEN_KEY = 'fis-website-chat-token';
  var NAME_KEY = 'fis-website-chat-name';
  var EMAIL_KEY = 'fis-website-chat-email';
  var GREEN = '#8CB63C';
  var GREEN_DARK = '#7AA32F';
  var ONLINE = '#4ADE80';
  var ALICE_IMG = APP_ORIGIN + '/alice-interviewer.png';

  function lsGet(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  function ensureToken() {
    var existing = lsGet(TOKEN_KEY);
    if (existing.length >= 16) return existing;
    var bytes = new Uint8Array(24);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    var token = Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
    lsSet(TOKEN_KEY, token);
    return token;
  }

  function chatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }

  var style = document.createElement('style');
  style.textContent = [
    '.fis-chat-root[hidden]{display:none!important}',
    '.fis-chat-launcher{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:inline-flex;align-items:center;border:0;cursor:pointer;border-radius:9999px;padding:6px 6px 6px 20px;background:' + GREEN + ';color:#fff;box-shadow:0 10px 28px rgba(74,124,35,0.38);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.fis-chat-launcher:hover{background:' + GREEN_DARK + '}',
    '.fis-chat-launcher .fis-dot{position:absolute;left:8px;bottom:-2px;width:14px;height:14px;border-radius:9999px;background:' + ONLINE + ';border:2.5px solid #fff}',
    '.fis-chat-launcher .fis-label{padding-right:12px;font-size:17px;font-weight:600;letter-spacing:-0.01em}',
    '.fis-chat-launcher .fis-bubble{position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:9999px;background:rgba(255,255,255,0.2)}',
    '.fis-chat-launcher .fis-bubble svg{width:24px;height:24px;fill:#fff}',
    '.fis-chat-panel{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(380px,calc(100vw - 24px));height:min(560px,82vh);display:flex;flex-direction:column;overflow:hidden;border-radius:16px;border:1px solid #e2e8f0;background:#fff;box-shadow:0 12px 32px rgba(74,124,35,0.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.fis-chat-header{background:' + GREEN + ';color:#fff;padding:8px 16px 16px}',
    '.fis-chat-header-top{display:flex;justify-content:flex-end;margin-bottom:12px}',
    '.fis-chat-header-top button{background:transparent;border:0;color:#fff;cursor:pointer;padding:6px;border-radius:8px;line-height:0}',
    '.fis-chat-header-top button:hover{background:rgba(255,255,255,0.12)}',
    '.fis-chat-header-body{display:flex;align-items:center;gap:12px}',
    '.fis-chat-avatar{width:56px;height:56px;border-radius:9999px;overflow:hidden;background:#fff;border:2px solid #fff;flex-shrink:0}',
    '.fis-chat-avatar img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}',
    '.fis-chat-title{font-size:22px;font-weight:600;line-height:1.15;margin:0;letter-spacing:-0.02em}',
    '.fis-chat-sub{margin:6px 0 0;font-size:14px;opacity:0.92;display:flex;align-items:center;gap:6px}',
    '.fis-chat-sub .dot{width:10px;height:10px;border-radius:9999px;background:' + ONLINE + ';display:inline-block}',
    '.fis-chat-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;padding:16px}',
    '.fis-chat-body p.hint{margin:0;font-size:14px;color:#475569}',
    '.fis-chat-body input,.fis-chat-body textarea{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none}',
    '.fis-chat-body input:focus,.fis-chat-body textarea:focus{border-color:' + GREEN + ';box-shadow:0 0 0 3px rgba(140,182,60,0.2)}',
    '.fis-chat-body textarea{min-height:120px;resize:none;flex:1}',
    '.fis-chat-body .err{margin:0;font-size:12px;color:#dc2626}',
    '.fis-chat-send{margin-top:auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;padding:11px 16px;background:' + GREEN + ';color:#fff;font-size:14px;font-weight:600;cursor:pointer}',
    '.fis-chat-send:hover{background:' + GREEN_DARK + '}',
    '.fis-chat-send:disabled{opacity:0.6;cursor:default}',
    '.fis-chat-sent{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px}',
    '.fis-chat-sent .check{width:48px;height:48px;border-radius:9999px;background:rgba(140,182,60,0.12);color:' + GREEN + ';display:flex;align-items:center;justify-content:center}',
    '.fis-chat-sent h3{margin:0;font-size:16px;color:#1e293b}',
    '.fis-chat-sent p{margin:0;font-size:14px;color:#64748b}',
    '.fis-chat-again{margin-top:8px;border:1px solid #e2e8f0;background:#fff;border-radius:12px;padding:8px 16px;font-size:14px;font-weight:600;color:#475569;cursor:pointer}',
    '.fis-chat-again:hover{background:#f8fafc}'
  ].join('\n');
  document.head.appendChild(style);

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'fis-chat-launcher fis-chat-root';
  launcher.setAttribute('aria-label', 'Open chat support');
  launcher.innerHTML =
    '<span class="fis-dot"></span>' +
    '<span class="fis-label">Chat</span>' +
    '<span class="fis-bubble">' + chatIcon() + '</span>';

  var panel = document.createElement('div');
  panel.className = 'fis-chat-panel fis-chat-root';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="fis-chat-header">' +
      '<div class="fis-chat-header-top">' +
        '<button type="button" class="fis-min" aria-label="Minimize chat">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="fis-chat-header-body">' +
        '<span class="fis-chat-avatar"><img src="' + ALICE_IMG + '" alt="Alice"/></span>' +
        '<div>' +
          '<p class="fis-chat-title">How can we help?</p>' +
          '<p class="fis-chat-sub"><span class="dot"></span>Send us a message</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<form class="fis-chat-body" novalidate>' +
      '<div class="fis-form">' +
        '<p class="hint">Name and email are optional.</p>' +
        '<input class="fis-name" type="text" placeholder="Your name (optional)" autocomplete="name"/>' +
        '<input class="fis-email" type="email" placeholder="Email (optional)" autocomplete="email" style="margin-top:12px"/>' +
        '<textarea class="fis-msg" placeholder="Type your message..." style="margin-top:12px"></textarea>' +
        '<p class="err" hidden></p>' +
        '<button type="submit" class="fis-chat-send" style="margin-top:12px;width:100%">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
          'Send message' +
        '</button>' +
      '</div>' +
      '<div class="fis-chat-sent" hidden>' +
        '<span class="check"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
        '<h3>Message sent</h3>' +
        '<p>Thanks — our team will get back to you.</p>' +
        '<button type="button" class="fis-chat-again">Send another message</button>' +
      '</div>' +
    '</form>';

  var nameInput = panel.querySelector('.fis-name');
  var emailInput = panel.querySelector('.fis-email');
  var msgInput = panel.querySelector('.fis-msg');
  var errEl = panel.querySelector('.err');
  var formWrap = panel.querySelector('.fis-form');
  var sentWrap = panel.querySelector('.fis-chat-sent');
  var sendBtn = panel.querySelector('.fis-chat-send');
  var form = panel.querySelector('form');

  nameInput.value = lsGet(NAME_KEY);
  emailInput.value = lsGet(EMAIL_KEY);

  function openPanel() {
    panel.hidden = false;
    launcher.hidden = true;
  }
  function closePanel() {
    panel.hidden = true;
    launcher.hidden = false;
  }

  launcher.addEventListener('click', openPanel);
  panel.querySelector('.fis-min').addEventListener('click', closePanel);
  panel.querySelector('.fis-chat-again').addEventListener('click', function () {
    sentWrap.hidden = true;
    formWrap.hidden = false;
    msgInput.value = '';
    msgInput.focus();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var content = (msgInput.value || '').trim();
    if (!content || sendBtn.disabled) return;

    var name = (nameInput.value || '').trim();
    var email = (emailInput.value || '').trim();
    if (name) lsSet(NAME_KEY, name);
    if (email) lsSet(EMAIL_KEY, email);

    var token = ensureToken();
    sendBtn.disabled = true;
    errEl.hidden = true;
    errEl.textContent = '';

    fetch(APP_ORIGIN + '/api/website-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-website-chat-token': token
      },
      body: JSON.stringify({ name: name, email: email })
    })
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (start) {
        var chatToken = String((start.data && start.data.token) || token || '');
        if (chatToken) {
          lsSet(TOKEN_KEY, chatToken);
          token = chatToken;
        }
        return fetch(APP_ORIGIN + '/api/website-chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-website-chat-token': token
          },
          body: JSON.stringify({ content: content })
        });
      })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (result) {
        if (!result.res.ok) throw new Error((result.data && result.data.error) || 'Could not send');
        msgInput.value = '';
        formWrap.hidden = true;
        sentWrap.hidden = false;
      })
      .catch(function (err) {
        errEl.textContent = (err && err.message) || 'Could not send';
        errEl.hidden = false;
      })
      .then(function () {
        sendBtn.disabled = false;
      });
  });

  // Quietly register presence so the visitor shows in the admin inbox when online.
  try {
    var presenceToken = ensureToken();
    fetch(APP_ORIGIN + '/api/website-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-website-chat-token': presenceToken
      },
      body: JSON.stringify({
        presence: true,
        name: lsGet(NAME_KEY),
        email: lsGet(EMAIL_KEY)
      })
    }).catch(function () {});
  } catch (e) {}

  function mount() {
    document.body.appendChild(launcher);
    document.body.appendChild(panel);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
