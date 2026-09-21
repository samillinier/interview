/*!
 * FIS Chat Embed Loader
 * Loaded by the FIS Chat Widget WordPress plugin. Renders the "Chat" launcher
 * button on the WordPress page and embeds the real FIS chat widget (the exact
 * same React widget used on the FIS site) inside an iframe.
 *
 * The conversation itself runs in the iframe at job.floorinteriorservices.com,
 * so the visitor experience is identical to the main site and your team still
 * answers from the same dashboard chat inbox.
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

  // Brand colors (matches the FIS theme).
  var GREEN = '#8CB63C';
  var ONLINE = '#4ADE80';

  function lsGet(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  function chatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }

  // ---- Styles (launcher only; the chat UI lives in the iframe) ------------
  var style = document.createElement('style');
  style.textContent = [
    '.fis-chat-launcher { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; display: inline-flex; align-items: center; border: 0; cursor: pointer; border-radius: 9999px; padding: 6px 6px 6px 20px; background: #ffffff; color: ' + GREEN + '; box-shadow: 0 10px 28px rgba(15,23,42,0.18); }',
    '.fis-chat-launcher:hover { background: #f8fafc; }',
    '.fis-chat-launcher .fis-dot { position: absolute; left: 8px; bottom: -2px; width: 14px; height: 14px; border-radius: 9999px; background: ' + ONLINE + '; border: 2.5px solid #ffffff; }',
    '.fis-chat-launcher .fis-label { padding-right: 12px; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }',
    '.fis-chat-launcher .fis-bubble { position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 9999px; background: rgba(140,182,60,0.15); }',
    '.fis-chat-launcher .fis-bubble svg { width: 24px; height: 24px; fill: ' + GREEN + '; }',
    '.fis-chat-launcher .fis-badge { position: absolute; top: -6px; right: -6px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 9999px; background: #ef4444; color: #fff; font-size: 12px; font-weight: 800; line-height: 20px; text-align: center; border: 2px solid #fff; box-sizing: border-box; }'
  ].join('\n');
  document.head.appendChild(style);

  // ---- Launcher button -----------------------------------------------------
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'fis-chat-launcher';
  launcher.setAttribute('aria-label', 'Open chat support');
  launcher.innerHTML =
    '<span class="fis-dot"></span>' +
    '<span class="fis-label">Chat</span>' +
    '<span class="fis-bubble">' + chatIcon() + '</span>' +
    '<span class="fis-badge" hidden></span>';
  var badge = launcher.querySelector('.fis-badge');

  // ---- Iframe (the real widget) --------------------------------------------
  var initialToken = lsGet(TOKEN_KEY);
  var frame = document.createElement('iframe');
  frame.title = 'Chat support';
  frame.setAttribute('aria-label', 'Chat support');
  frame.src = EMBED_URL + (initialToken.length >= 16 ? '?token=' + encodeURIComponent(initialToken) : '');
  frame.setAttribute('allow', 'autoplay');
  frame.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:2147483000;border:0;background:transparent;' +
    'width:380px;height:560px;display:none;overflow:hidden;';

  function setBadge(unread) {
    if (unread > 0) {
      badge.hidden = false;
      badge.textContent = unread > 9 ? '9+' : String(unread);
      launcher.setAttribute('aria-label', 'Open chat support, ' + unread + ' new messages');
    } else {
      badge.hidden = true;
      launcher.setAttribute('aria-label', 'Open chat support');
    }
  }

  function openChat() {
    frame.style.display = 'block';
    frame.style.width = '380px';
    frame.style.height = '560px';
    if (frame.contentWindow) {
      try {
        frame.contentWindow.postMessage({ source: 'fis-chat-parent', type: 'open' }, APP_ORIGIN);
      } catch (e) {}
    }
  }

  launcher.addEventListener('click', openChat);

  window.addEventListener('message', function (event) {
    // Only accept messages coming from our own iframe.
    if (event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.source !== 'fis-chat' || data.type !== 'state') return;

    if (typeof data.token === 'string' && data.token.length >= 16) {
      lsSet(TOKEN_KEY, data.token);
    }

    if (!data.open) {
      frame.style.display = 'none';
    } else {
      frame.style.display = 'block';
      frame.style.width = data.expanded ? '420px' : '380px';
      frame.style.height = data.expanded ? '720px' : '560px';
    }

    setBadge(typeof data.unread === 'number' ? data.unread : 0);
  });

  function mount() {
    document.body.appendChild(launcher);
    document.body.appendChild(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
