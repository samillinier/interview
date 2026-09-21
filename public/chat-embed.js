/*!
 * FIS Chat Embed Loader
 * Loaded by the FIS Chat Widget WordPress plugin. Renders the green "Chat"
 * launcher button on the WordPress page and embeds the REAL FIS chat widget
 * (the exact same React component used on the FIS site) inside an iframe, so
 * the visitor experience is pixel-identical to the main site.
 */
(function () {
  'use strict';

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

  var EMBED_URL = APP_ORIGIN + '/chat-embed';
  var TOKEN_KEY = 'fis-website-chat-token';
  var GREEN = '#8CB63C';
  var GREEN_DARK = '#7AA32F';
  var ONLINE = '#4ADE80';

  function lsGet(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  function chatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }

  var style = document.createElement('style');
  style.textContent = [
    '.fis-chat-launcher-wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; }',
    '.fis-chat-launcher { position: relative; display: inline-flex; align-items: center; border: 0; cursor: pointer; border-radius: 9999px; padding: 6px 6px 6px 20px; background: ' + GREEN + '; color: #fff; box-shadow: 0 10px 28px rgba(74,124,35,0.38); }',
    '.fis-chat-launcher:hover { background: ' + GREEN_DARK + '; }',
    '.fis-chat-launcher-wrap .fis-dot { position: absolute; left: 8px; bottom: -3px; z-index: 2; width: 14px; height: 14px; border-radius: 9999px; background: ' + ONLINE + '; border: 2.5px solid #fff; pointer-events: none; }',
    '.fis-chat-launcher .fis-label { padding-right: 12px; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }',
    '.fis-chat-launcher .fis-bubble { position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 9999px; background: rgba(255,255,255,0.2); }',
    '.fis-chat-launcher .fis-bubble svg { width: 24px; height: 24px; fill: #fff; }',
    '.fis-chat-frame { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; border: 0; background: transparent; display: none; }'
  ].join('\n');
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'fis-chat-launcher-wrap';

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'fis-chat-launcher';
  launcher.setAttribute('aria-label', 'Open chat support');
  launcher.innerHTML =
    '<span class="fis-label">Chat</span>' +
    '<span class="fis-bubble">' + chatIcon() + '</span>';

  var onlineDot = document.createElement('span');
  onlineDot.className = 'fis-dot';
  onlineDot.setAttribute('aria-hidden', 'true');

  wrap.appendChild(launcher);
  wrap.appendChild(onlineDot);

  var initialToken = lsGet(TOKEN_KEY);
  var frame = document.createElement('iframe');
  frame.className = 'fis-chat-frame';
  frame.title = 'Chat support';
  frame.setAttribute('aria-label', 'Chat support');
  frame.src = EMBED_URL + (initialToken.length >= 16 ? '?token=' + encodeURIComponent(initialToken) : '');
  frame.setAttribute('allow', 'autoplay');

  function setFrameSize(expanded) {
    frame.style.width = expanded ? '420px' : '380px';
    frame.style.height = expanded ? '720px' : '560px';
  }

  launcher.addEventListener('click', function () {
    setFrameSize(false);
    frame.style.display = 'block';
    wrap.style.display = 'none';
  });

  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.source !== 'fis-chat') return;

    if (typeof data.token === 'string' && data.token.length >= 16) {
      lsSet(TOKEN_KEY, data.token);
    }

    if (data.type === 'minimize') {
      frame.style.display = 'none';
      wrap.style.display = '';
      return;
    }

    if (data.type === 'state' && typeof data.expanded === 'boolean') {
      setFrameSize(data.expanded);
    }
  });

  function mount() {
    document.body.appendChild(wrap);
    document.body.appendChild(frame);
    setFrameSize(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
