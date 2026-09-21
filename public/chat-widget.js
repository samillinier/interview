/*!
 * FIS Chat Embed Loader (WordPress plugin)
 * Floating chat launcher + responsive iframe for mobile and desktop.
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

  var EMBED_URL = APP_ORIGIN + '/chat-embed';
  var TOKEN_KEY = 'fis-website-chat-token';
  var GREEN = '#8CB63C';
  var GREEN_DARK = '#7AA32F';
  var ONLINE = '#4ADE80';

  function lsGet(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
  }

  function chatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }

  var style = document.createElement('style');
  style.textContent = [
    '.fis-chat-launcher-wrap,',
    '.fis-chat-frame {',
    '  position: fixed !important;',
    '  z-index: 2147483000 !important;',
    '  margin: 0 !important;',
    '  -webkit-transform: translateZ(0);',
    '  transform: translateZ(0);',
    '  -webkit-backface-visibility: hidden;',
    '  backface-visibility: hidden;',
    '}',
    '.fis-chat-launcher-wrap {',
    '  right: max(12px, env(safe-area-inset-right, 0px)) !important;',
    '  bottom: max(12px, env(safe-area-inset-bottom, 0px)) !important;',
    '  left: auto !important;',
    '  top: auto !important;',
    '}',
    '.fis-chat-launcher {',
    '  position: relative;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  border: 0;',
    '  cursor: pointer;',
    '  border-radius: 9999px;',
    '  padding: 6px 6px 6px 20px;',
    '  background: ' + GREEN + ';',
    '  color: #fff;',
    '  box-shadow: 0 10px 28px rgba(74,124,35,0.38);',
    '  -webkit-tap-highlight-color: transparent;',
    '  touch-action: manipulation;',
    '}',
    '.fis-chat-launcher:hover { background: ' + GREEN_DARK + '; }',
    '.fis-chat-launcher-wrap .fis-dot {',
    '  position: absolute; left: 8px; bottom: -3px; z-index: 2;',
    '  width: 14px; height: 14px; border-radius: 9999px;',
    '  background: ' + ONLINE + '; border: 2.5px solid #fff; pointer-events: none;',
    '}',
    '.fis-chat-launcher .fis-label { padding-right: 12px; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }',
    '.fis-chat-launcher .fis-bubble {',
    '  position: relative; display: flex; align-items: center; justify-content: center;',
    '  width: 44px; height: 44px; border-radius: 9999px; background: rgba(255,255,255,0.2);',
    '}',
    '.fis-chat-launcher .fis-bubble svg { width: 24px; height: 24px; fill: #fff; }',
    '.fis-chat-badge {',
    '  position: absolute; right: -4px; top: -4px; z-index: 3;',
    '  min-width: 22px; min-height: 22px; padding: 0 5px; border-radius: 9999px;',
    '  background: #ef4444; color: #fff; border: 2px solid #fff;',
    '  font-size: 12px; font-weight: 800; line-height: 18px; text-align: center;',
    '  box-shadow: 0 2px 8px rgba(0,0,0,0.25); display: none;',
    '}',
    '.fis-chat-badge.is-on { display: inline-flex; align-items: center; justify-content: center; }',
    '.fis-chat-frame {',
    '  border: 0 !important;',
    '  background: transparent !important;',
    '  display: none;',
    '  right: max(12px, env(safe-area-inset-right, 0px)) !important;',
    '  bottom: max(12px, env(safe-area-inset-bottom, 0px)) !important;',
    '  left: auto !important;',
    '  top: auto !important;',
    '  width: 380px;',
    '  height: 560px;',
    '  max-width: calc(100vw - 24px);',
    '  max-height: calc(100dvh - 24px - env(safe-area-inset-bottom, 0px));',
    '}',
    /* Phones / small tablets: fill the screen so nothing is clipped */
    '@media (max-width: 767px) {',
    '  .fis-chat-launcher-wrap {',
    '    right: max(10px, env(safe-area-inset-right, 0px)) !important;',
    '    bottom: max(10px, env(safe-area-inset-bottom, 0px)) !important;',
    '  }',
    '  .fis-chat-frame {',
    '    left: max(8px, env(safe-area-inset-left, 0px)) !important;',
    '    right: max(8px, env(safe-area-inset-right, 0px)) !important;',
    '    bottom: max(8px, env(safe-area-inset-bottom, 0px)) !important;',
    '    top: auto !important;',
    '    width: auto !important;',
    '    height: min(88dvh, 720px) !important;',
    '    max-width: none !important;',
    '    max-height: calc(100dvh - 16px - env(safe-area-inset-bottom, 0px)) !important;',
    '  }',
    '}'
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

  var badge = document.createElement('span');
  badge.className = 'fis-chat-badge';
  badge.setAttribute('aria-hidden', 'true');

  wrap.appendChild(launcher);
  wrap.appendChild(onlineDot);
  wrap.appendChild(badge);

  var initialToken = lsGet(TOKEN_KEY);
  var frame = document.createElement('iframe');
  frame.className = 'fis-chat-frame';
  frame.title = 'Chat support';
  frame.setAttribute('aria-label', 'Chat support');
  frame.setAttribute('scrolling', 'no');
  frame.src = EMBED_URL + (initialToken.length >= 16 ? '?token=' + encodeURIComponent(initialToken) : '');
  frame.setAttribute('allow', 'autoplay');

  function clearInlineSize() {
    frame.style.removeProperty('width');
    frame.style.removeProperty('height');
    frame.style.removeProperty('left');
    frame.style.removeProperty('right');
    frame.style.removeProperty('bottom');
    frame.style.removeProperty('top');
    frame.style.removeProperty('max-width');
    frame.style.removeProperty('max-height');
  }

  function setFrameSize(expanded) {
    clearInlineSize();
    if (isMobile()) {
      // CSS media query owns mobile sizing so the panel fills the phone width.
      return;
    }
    frame.style.width = expanded ? '420px' : '380px';
    frame.style.height = expanded ? '720px' : '560px';
  }

  function setUnread(count) {
    var n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.classList.add('is-on');
      launcher.setAttribute('aria-label', 'Open chat support, ' + n + ' new messages');
    } else {
      badge.textContent = '';
      badge.classList.remove('is-on');
      launcher.setAttribute('aria-label', 'Open chat support');
    }
  }

  function openChat() {
    setFrameSize(false);
    frame.style.display = 'block';
    wrap.style.display = 'none';
    setUnread(0);
    try {
      frame.contentWindow.postMessage({ source: 'fis-chat-parent', type: 'open' }, '*');
    } catch (e) {}
  }

  launcher.addEventListener('click', openChat);

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

    if (data.type === 'state') {
      if (typeof data.expanded === 'boolean') setFrameSize(data.expanded);
      if (typeof data.unread === 'number') setUnread(data.unread);
    }
  });

  window.addEventListener('resize', function () {
    if (frame.style.display === 'block') setFrameSize(false);
  });
  window.addEventListener('orientationchange', function () {
    window.setTimeout(function () {
      if (frame.style.display === 'block') setFrameSize(false);
    }, 250);
  });

  function mount() {
    var root = document.documentElement || document.body;
    root.appendChild(wrap);
    root.appendChild(frame);
    setFrameSize(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
