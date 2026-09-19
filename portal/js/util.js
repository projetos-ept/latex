/* ==========================================================================
   Portal TCC ABNT - utilidades gerais (DOM, texto, datas, clipboard)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = {};

  /* ------------------------------------------------------------- texto --- */

  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.deburr = function (s) {
    return String(s == null ? '' : s)
      .normalize ? String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      : String(s == null ? '' : s);
  };

  U.slug = function (s, sep) {
    sep = sep || '-';
    return U.deburr(s).toLowerCase()
      .replace(/[^a-z0-9]+/g, sep)
      .replace(new RegExp('^' + sep + '+|' + sep + '+$', 'g'), '')
      .slice(0, 60);
  };

  U.uid = function (prefix) {
    var rnd = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '_' + Date.now().toString(36) + rnd;
  };

  U.trim = function (s) { return String(s == null ? '' : s).trim(); };

  U.titleCase = function (s) {
    return U.trim(s).replace(/\S+/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  };

  U.upper = function (s) { return String(s == null ? '' : s).toUpperCase(); };

  U.words = function (s) {
    var t = U.trim(s);
    return t ? t.split(/\s+/).length : 0;
  };

  U.chars = function (s) { return U.trim(s).length; };

  /** Estimativa de páginas ABNT: ~2100 caracteres por página (fonte 12, espaço 1,5). */
  U.pages = function (chars) { return Math.max(0, Math.round((chars / 2100) * 10) / 10); };

  U.plural = function (n, one, many) { return n === 1 ? one : (many || one + 's'); };

  /* ------------------------------------------------------------- datas --- */

  U.now = function () { return new Date().toISOString(); };

  U.fmtDate = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  U.fmtDateTime = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  U.fromNow = function (iso) {
    if (!iso) return '—';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(diff)) return '—';
    if (diff < 60) return 'agora';
    if (diff < 3600) return Math.floor(diff / 60) + ' min';
    if (diff < 86400) return Math.floor(diff / 3600) + ' h';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' d';
    return U.fmtDate(iso);
  };

  /** Data no formato ABNT de acesso: "19 set. 2026". */
  U.fmtAcesso = function (iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    var meses = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    if (m) return String(Number(m[3])).padStart(2, '0') + ' ' + meses[Number(m[2]) - 1] + ' ' + m[1];
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return String(d.getDate()).padStart(2, '0') + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
  };

  U.today = function () { return new Date().toISOString().slice(0, 10); };

  U.year = function () { return new Date().getFullYear(); };

  /* --------------------------------------------------------------- DOM --- */

  U.qs = function (sel, root) { return (root || document).querySelector(sel); };
  U.qsa = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /** Liga handlers por delegação: on(root, 'click', '[data-act="x"]', fn). */
  U.on = function (root, type, sel, fn) {
    root.addEventListener(type, function (ev) {
      var t = ev.target.closest(sel);
      if (t && root.contains(t)) fn(ev, t);
    });
  };

  U.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  };

  /* ----------------------------------------------------------- feedback -- */

  U.toast = function (msg, kind) {
    var host = U.qs('#toasts');
    if (!host) { return; }
    var icons = {
      ok: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10.5l4 4 8-9"/></svg>',
      err: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 5v7M10 15h.01"/></svg>'
    };
    var node = document.createElement('div');
    node.className = 'toast' + (kind ? ' ' + kind : '');
    node.innerHTML = (icons[kind] || '') + '<span>' + U.esc(msg) + '</span>';
    host.appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity .25s ease';
      node.style.opacity = '0';
      setTimeout(function () { node.remove(); }, 260);
    }, kind === 'err' ? 4200 : 2400);
  };

  /**
   * Modal simples. opts: {title, body (HTML), size, okLabel, cancelLabel,
   * onOk(modalEl) -> false para manter aberto, hideCancel}
   */
  U.modal = function (opts) {
    opts = opts || {};
    var scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML =
      '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head"><h2>' + U.esc(opts.title || '') + '</h2>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-ghost btn-icon" data-close aria-label="Fechar">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        '<div class="modal-foot">' +
          (opts.hideCancel ? '' : '<button class="btn" data-close>' + U.esc(opts.cancelLabel || 'Cancelar') + '</button>') +
          '<button class="btn btn-primary" data-ok>' + U.esc(opts.okLabel || 'Salvar') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);

    function close() {
      scrim.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(ev) { if (ev.key === 'Escape') close(); }

    U.on(scrim, 'click', '[data-close]', close);
    scrim.addEventListener('click', function (ev) { if (ev.target === scrim) close(); });
    document.addEventListener('keydown', onKey);
    U.on(scrim, 'click', '[data-ok]', function () {
      if (!opts.onOk || opts.onOk(scrim) !== false) close();
    });

    var first = scrim.querySelector('input, select, textarea');
    if (first) setTimeout(function () { first.focus(); }, 30);
    scrim.close = close;
    return scrim;
  };

  U.confirm = function (message, onYes, opts) {
    opts = opts || {};
    U.modal({
      title: opts.title || 'Confirmar',
      size: 'sm',
      body: '<p>' + U.esc(message) + '</p>',
      okLabel: opts.okLabel || 'Confirmar',
      onOk: function () { onYes(); }
    });
  };

  /* ---------------------------------------------------- clipboard/arquivo */

  U.copy = function (text, label) {
    function done() { U.toast((label || 'Conteúdo') + ' copiado para a área de transferência', 'ok'); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) done(); else U.toast('Não foi possível copiar automaticamente', 'err');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  };

  U.download = function (filename, content, mime) {
    var blob = content instanceof Blob
      ? content
      : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  U.pickFile = function (accept, onRead, asText) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept || '';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { onRead(r.result, f); };
      if (asText === false) r.readAsArrayBuffer(f); else r.readAsText(f, 'utf-8');
    };
    inp.click();
  };

  /* -------------------------------------------------------------- ícones -- */

  var ICONS = {
    dashboard: '<path d="M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z"/>',
    projects: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    editor: '<path d="M4 20h16M6 16l10.5-10.5a2.1 2.1 0 1 1 3 3L9 19H6z"/>',
    library: '<path d="M4 4h5v16H4zM11 4h4v16h-4zM17.5 5l3.2 14.2-3.9.8L14 5.8z"/>',
    latex: '<path d="M7 7l-3 5 3 5M17 7l3 5-3 5M14 6l-4 12"/>',
    export: '<path d="M12 3v12m0-12l-4 4m4-4l4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    admin: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.4-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/>',
    settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5A2.5 2.5 0 1 1 12 12v2M12 17h.01"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20z"/>'
  };

  U.icon = function (name, cls) {
    var body = ICONS[name];
    if (!body) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' +
      body + '</svg>';
  };

  P.U = U;
})(window.Portal = window.Portal || {});
