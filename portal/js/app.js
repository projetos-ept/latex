/* ==========================================================================
   Portal TCC ABNT - shell da aplicação (navegação, tema, atalhos)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;
  var App = { current: null };

  var NAV = [
    { group: 'Trabalho' },
    { id: 'painel', label: 'Painel', icon: 'dashboard' },
    { id: 'projeto', label: 'Dados do trabalho', icon: 'projects' },
    { id: 'editor', label: 'Editor de blocos', icon: 'editor' },
    { group: 'Referências' },
    { id: 'biblioteca', label: 'Biblioteca', icon: 'library', count: function () { return P.Store.references().length; } },
    { group: 'Saída' },
    { id: 'latex', label: 'LaTeX', icon: 'latex' },
    { id: 'exportar', label: 'Exportar / Overleaf', icon: 'export' },
    { group: 'Sistema' },
    { id: 'admin', label: 'Painel administrativo', icon: 'admin' },
    { id: 'config', label: 'Configurações', icon: 'settings' },
    { id: 'ajuda', label: 'Ajuda e normas', icon: 'help' }
  ];

  /* ----------------------------------------------------------------- tema -- */

  App.applyTheme = function (tema) {
    var root = document.documentElement;
    if (tema === 'light' || tema === 'dark') root.setAttribute('data-theme', tema);
    else root.removeAttribute('data-theme');
  };

  App.toggleTheme = function () {
    var atual = P.Store.settings().tema || 'auto';
    var proximo = atual === 'auto' ? 'light' : atual === 'light' ? 'dark' : 'auto';
    P.Store.updateSettings({ tema: proximo });
    App.applyTheme(proximo);
    U.toast('Tema: ' + ({ auto: 'automático', light: 'claro', dark: 'escuro' })[proximo]);
    App.renderTopbar();
  };

  /* -------------------------------------------------------------- sidebar -- */

  App.renderNav = function () {
    var host = U.qs('#nav');
    var html = NAV.map(function (item) {
      if (item.group) return '<div class="nav-group-label">' + U.esc(item.group) + '</div>';
      var count = item.count ? item.count() : null;
      return '<a class="nav-item' + (App.current === item.id ? ' is-active' : '') + '" href="#/' + item.id + '">' +
        U.icon(item.icon) + '<span>' + U.esc(item.label) + '</span>' +
        (count ? '<span class="count">' + count + '</span>' : '') +
        '</a>';
    }).join('');
    host.innerHTML = html;
  };

  App.renderFoot = function () {
    var api = P.Api;
    var conectado = api.enabled();
    var estado = !api.configured()
      ? 'Modo local (navegador)'
      : conectado ? 'Sincronização ativa' : 'API configurada, sync desligada';
    var cls = !api.configured() ? 'off' : conectado ? 'on' : 'off';
    U.qs('#sidebarFoot').innerHTML =
      '<div class="status-line"><span class="dot ' + cls + '"></span><span>' + U.esc(estado) + '</span></div>' +
      '<div class="status-line" style="opacity:.7">v' + U.esc(P.config.version) +
      ' · ' + (P.Store.storageOk ? 'dados salvos localmente' : 'armazenamento indisponível') + '</div>';
  };

  /* --------------------------------------------------------------- topbar -- */

  App.renderTopbar = function () {
    var view = P.Views[App.current];
    var prj = P.Store.activeProject();
    var titulo = (view && view.titulo) || 'Portal TCC ABNT';
    var temas = { auto: 'Automático', light: 'Claro', dark: 'Escuro' };
    var tema = P.Store.settings().tema || 'auto';

    U.qs('#topbarTitle').innerHTML = U.esc(titulo);
    U.qs('#topbarCrumb').innerHTML = prj
      ? '<span class="crumb">' + U.esc(prj.meta.titulo) + ' · ' + U.esc(P.M.nivel(prj.meta.nivel).curto) + '</span>'
      : '<span class="crumb">nenhum trabalho selecionado</span>';

    var actions = [];
    if (P.Store.projects().length > 1) {
      actions.push('<select id="projectSwitch" title="Trabalho ativo" style="max-width:230px">' +
        P.Store.projects().map(function (p) {
          return '<option value="' + p.id + '"' + (prj && p.id === prj.id ? ' selected' : '') + '>' +
            U.esc(p.meta.titulo) + '</option>';
        }).join('') + '</select>');
    }
    actions.push('<button class="btn btn-sm" id="themeBtn" title="Alternar tema">Tema: ' + temas[tema] + '</button>');
    if (P.Api.enabled()) {
      actions.push('<button class="btn btn-sm" id="syncBtn">Sincronizar</button>');
    }
    actions.push('<button class="btn btn-sm btn-primary" id="newProjectBtn">' + U.icon('plus') + 'Novo trabalho</button>');
    U.qs('#topbarActions').innerHTML = actions.join('');
  };

  /* --------------------------------------------------------------- router -- */

  function route() {
    var hash = (location.hash || '#/painel').replace(/^#\/?/, '');
    var parts = hash.split('/');
    var id = parts[0] || 'painel';
    if (!P.Views[id]) id = 'painel';
    App.current = id;
    App.params = parts.slice(1);
    App.render();
  }

  App.render = function () {
    var view = P.Views[App.current];
    // Troca o nó por um novo: as telas registram handlers delegados na raiz e,
    // sem isso, eles se acumulariam a cada renderização.
    var anterior = U.qs('#view');
    var host = document.createElement('div');
    host.id = 'view';
    anterior.parentNode.replaceChild(host, anterior);
    host.className = 'view' + (view.wide ? ' wide' : '');
    App.renderNav();
    App.renderTopbar();
    App.renderFoot();
    try {
      view.render(host, App.params || []);
    } catch (err) {
      console.error(err);
      host.innerHTML = '<div class="callout danger"><strong>Erro ao renderizar a tela.</strong><br>' +
        U.esc(err.message) + '</div>';
    }
    window.scrollTo(0, 0);
    U.qs('#sidebar').classList.remove('is-open');
    U.qs('#scrim').classList.remove('is-open');
  };

  App.go = function (path) {
    location.hash = '#/' + path;
  };

  App.refresh = function () { App.render(); };

  /* ------------------------------------------------------------ novo TCC --- */

  App.newProjectDialog = function () {
    var M = P.M;
    var s = P.Store.settings();
    var niveis = Object.keys(M.NIVEIS).map(function (k) {
      return '<option value="' + k + '">' + U.esc(M.NIVEIS[k].label) + '</option>';
    }).join('');

    U.modal({
      title: 'Novo trabalho acadêmico',
      okLabel: 'Criar trabalho',
      body:
        '<div class="callout" style="margin-bottom:14px">A estrutura de capítulos é criada automaticamente conforme o nível escolhido, seguindo a ABNT NBR 14724. Tudo pode ser editado depois.</div>' +
        '<div class="form-grid">' +
          '<div class="field span-2"><label>Nível do trabalho</label><select name="nivel">' + niveis + '</select></div>' +
          '<div class="field span-2"><label>Título <span class="req">*</span></label><input name="titulo" placeholder="Ex.: Impacto da telemedicina na atenção primária"></div>' +
          '<div class="field span-2"><label>Subtítulo</label><input name="subtitulo"></div>' +
          '<div class="field"><label>Autor</label><input name="autor" value="' + U.esc(s.autor) + '"></div>' +
          '<div class="field"><label>Ano</label><input name="ano" value="' + U.year() + '"></div>' +
          '<div class="field"><label>Instituição</label><input name="instituicao" value="' + U.esc(s.instituicao) + '"></div>' +
          '<div class="field"><label>Curso / Programa</label><input name="curso" value="' + U.esc(s.curso) + '"></div>' +
          '<div class="field"><label>Orientador</label><input name="orientador" value="' + U.esc(s.orientador) + '"></div>' +
          '<div class="field"><label>Cidade</label><input name="cidade" value="' + U.esc(s.cidade) + '"></div>' +
        '</div>',
      onOk: function (el) {
        var data = {};
        U.qsa('[name]', el).forEach(function (i) { data[i.name] = U.trim(i.value); });
        if (!data.titulo) { U.toast('Informe o título do trabalho', 'err'); return false; }
        var prj = P.Store.createProject(data);
        U.toast('Trabalho criado com ' + prj.blocks.length + ' blocos', 'ok');
        App.go('editor');
        App.refresh();
      }
    });
  };

  /* ---------------------------------------------------------------- boot --- */

  App.boot = function () {
    P.Store.init();
    App.applyTheme(P.Store.settings().tema);

    window.addEventListener('hashchange', route);

    U.on(document, 'click', '#newProjectBtn', App.newProjectDialog);
    U.on(document, 'click', '#themeBtn', App.toggleTheme);
    U.on(document, 'click', '#menuToggle', function () {
      U.qs('#sidebar').classList.toggle('is-open');
      U.qs('#scrim').classList.toggle('is-open');
    });
    U.on(document, 'click', '#scrim', function () {
      U.qs('#sidebar').classList.remove('is-open');
      U.qs('#scrim').classList.remove('is-open');
    });
    U.on(document, 'click', '#syncBtn', function (ev, btn) {
      btn.disabled = true;
      btn.textContent = 'Sincronizando…';
      P.Api.sync().then(function (r) {
        // O resumo precisa cobrir também a biblioteca: contar só trabalhos fazia
        // uma sincronização de referências aparecer como "0 enviados".
        var partes = [];
        if (r.enviados) partes.push(r.enviados + ' ' + U.plural(r.enviados, 'trabalho') + ' enviado' + (r.enviados > 1 ? 's' : ''));
        if (r.baixados) partes.push(r.baixados + ' ' + U.plural(r.baixados, 'trabalho') + ' baixado' + (r.baixados > 1 ? 's' : ''));
        if (r.refsEnviadas) partes.push(r.refsEnviadas + ' ' + U.plural(r.refsEnviadas, 'referência', 'referências') + ' enviada' + (r.refsEnviadas > 1 ? 's' : ''));
        if (r.refsBaixadas) partes.push(r.refsBaixadas + ' ' + U.plural(r.refsBaixadas, 'referência', 'referências') + ' baixada' + (r.refsBaixadas > 1 ? 's' : ''));
        U.toast(partes.length ? 'Sincronizado: ' + partes.join(', ') : 'Tudo já estava sincronizado', 'ok');
        App.refresh();
      }, function (err) {
        U.toast(err.message, 'err');
        btn.disabled = false;
        btn.textContent = 'Sincronizar';
      });
    });
    document.addEventListener('change', function (ev) {
      if (ev.target.id === 'projectSwitch') {
        P.Store.setActive(ev.target.value);
        App.refresh();
      }
    });

    // Atalhos globais
    document.addEventListener('keydown', function (ev) {
      var tag = (ev.target.tagName || '').toLowerCase();
      var digitando = tag === 'input' || tag === 'textarea' || tag === 'select';
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        P.Store.saveNow();
        U.toast('Alterações salvas', 'ok');
        return;
      }
      if (digitando || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var atalhos = { e: 'editor', b: 'biblioteca', l: 'latex', p: 'painel', x: 'exportar' };
      if (atalhos[ev.key]) App.go(atalhos[ev.key]);
    });

    P.Store.on('references', function () { App.renderNav(); });
    P.Store.on('projects', function () { App.renderTopbar(); });

    route();

    // Service worker (PWA) — só em http/https
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* silencioso */ });
    }
  };

  P.App = App;
  P.Views = P.Views || {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { App.boot(); });
  } else {
    App.boot();
  }
})(window.Portal = window.Portal || {});
