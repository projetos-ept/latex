/* ==========================================================================
   Tela: Configurações (dados padrão, tema, API do Worker, R2)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;

  function field(label, name, value, ph, help, tipo) {
    return '<div class="field"><label>' + U.esc(label) + '</label>' +
      '<input type="' + (tipo || 'text') + '" name="' + name + '" value="' + U.esc(value || '') + '" placeholder="' + U.esc(ph || '') + '">' +
      (help ? '<div class="help">' + help + '</div>' : '') + '</div>';
  }

  P.Views.config = {
    titulo: 'Configurações',
    render: function (root) {
      var S = P.Store;
      var s = S.settings();

      root.innerHTML =
        '<div class="page-head"><h1>Configurações</h1>' +
        '<p>Dados padrão para novos trabalhos, aparência e integração com a infraestrutura Cloudflare.</p></div>' +

        '<div class="split"><div class="stack">' +
          '<div class="card pad-lg" id="formPessoal">' +
            '<h2>Dados padrão</h2>' +
            '<p class="muted small">Preenchidos automaticamente ao criar um novo trabalho.</p>' +
            '<div class="form-grid">' +
              field('Autor', 'autor', s.autor, 'Nome completo') +
              field('Instituição', 'instituicao', s.instituicao, 'Universidade Federal de…') +
              field('Curso / Programa', 'curso', s.curso) +
              field('Orientador', 'orientador', s.orientador, 'Prof. Dr. …') +
              field('Cidade', 'cidade', s.cidade) +
              '<div class="field"><label>Tema da interface</label><select name="tema">' +
                ['auto', 'light', 'dark'].map(function (t) {
                  var rot = { auto: 'Automático (sistema)', light: 'Claro', dark: 'Escuro' }[t];
                  return '<option value="' + t + '"' + (s.tema === t ? ' selected' : '') + '>' + rot + '</option>';
                }).join('') +
              '</select></div>' +
            '</div>' +
            '<div class="row end"><button class="btn btn-primary" data-act="salvar-pessoal">Salvar</button></div>' +
          '</div>' +

          '<div class="card pad-lg" id="formApi">' +
            '<h2>API (Cloudflare Worker)</h2>' +
            '<div class="callout warn small" style="margin-bottom:14px">' +
              '<strong>Pendência de implantação.</strong> O Worker, o banco D1 e o bucket R2 estão prontos em ' +
              '<code>api/worker/</code> e <code>database/migrations/</code>. Depois de publicar com <code>wrangler deploy</code>, ' +
              'cole aqui a URL gerada. Sem isso, o portal continua funcionando 100% offline no navegador.' +
            '</div>' +
            '<div class="form-grid">' +
              field('URL do Worker', 'apiBaseUrl', s.apiBaseUrl, 'https://portal-tcc-api.seu-subdominio.workers.dev',
                'Rota de verificação: <code>/api/health</code>', 'url') +
              field('Token de sessão', 'apiToken', s.apiToken, '', 'Obtido no login administrativo (<code>/api/auth/login</code>).', 'password') +
              field('URL pública do R2', 'r2PublicUrl', s.r2PublicUrl, 'https://arquivos.seudominio.br',
                'Opcional: domínio público do bucket. Sem ele, os arquivos são servidos pelo próprio Worker.', 'url') +
              '<div class="field"><label>Sincronização</label>' +
                '<label class="check" style="margin-top:6px"><input type="checkbox" name="syncEnabled"' + (s.syncEnabled ? ' checked' : '') + '>' +
                '<span>Manter trabalhos e biblioteca sincronizados</span></label>' +
                '<div class="help">Estratégia: último a salvar vence, comparando <code>updatedAt</code>.</div></div>' +
            '</div>' +
            '<div class="row end">' +
              '<button class="btn" data-act="testar">Testar conexão</button>' +
              '<button class="btn" data-act="login">Autenticar</button>' +
              '<button class="btn btn-primary" data-act="salvar-api">Salvar</button>' +
            '</div>' +
            '<div id="apiResultado" class="small" style="margin-top:10px"></div>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card">' +
            '<h2>Estado do sistema</h2>' +
            '<table class="data"><tbody>' +
              linha('Versão do portal', P.config.version) +
              linha('Armazenamento local', S.storageOk ? 'disponível' : 'indisponível') +
              linha('API configurada', P.Api.configured() ? 'sim' : 'não') +
              linha('Sincronização', P.Api.enabled() ? 'ativa' : 'desligada') +
              linha('Última resposta da API', P.Api.online === null ? '—' : (P.Api.online ? 'ok' : U.esc(P.Api.lastError || 'falha'))) +
              linha('Service worker (PWA)', ('serviceWorker' in navigator) ? 'suportado' : 'não suportado') +
            '</tbody></table>' +
          '</div>' +

          '<div class="card">' +
            '<h2>Pendências de infraestrutura</h2>' +
            '<ol class="soft small" style="margin:0;padding-left:18px;line-height:1.8">' +
              '<li><code>wrangler d1 create portal-tcc</code> e aplique <code>database/migrations/0001_init.sql</code>.</li>' +
              '<li><code>wrangler r2 bucket create portal-tcc-arquivos</code>.</li>' +
              '<li>Preencha <code>database_id</code> e <code>bucket_name</code> em <code>api/worker/wrangler.toml</code>.</li>' +
              '<li>Defina o segredo: <code>wrangler secret put ADMIN_SENHA</code>.</li>' +
              '<li><code>wrangler deploy</code> e cole a URL no campo ao lado.</li>' +
            '</ol>' +
            '<p class="muted small" style="margin:10px 0 0">Detalhes em <code>PENDENCIAS.md</code> e <code>api/worker/README.md</code>.</p>' +
          '</div>' +
        '</div></div>';

      U.on(root, 'click', '[data-act="salvar-pessoal"]', function () {
        var patch = {};
        U.qsa('#formPessoal [name]', root).forEach(function (i) { patch[i.name] = U.trim(i.value); });
        S.updateSettings(patch);
        P.App.applyTheme(patch.tema);
        U.toast('Configurações salvas', 'ok');
        P.App.refresh();
      });

      U.on(root, 'click', '[data-act="salvar-api"]', function () {
        var patch = {};
        U.qsa('#formApi [name]', root).forEach(function (i) {
          patch[i.name] = i.type === 'checkbox' ? i.checked : U.trim(i.value);
        });
        S.updateSettings(patch);
        U.toast('Integração salva', 'ok');
        P.App.refresh();
      });

      U.on(root, 'click', '[data-act="testar"]', function () {
        var url = U.trim(U.qs('[name="apiBaseUrl"]', root).value);
        if (!url) { U.toast('Informe a URL do Worker', 'err'); return; }
        S.updateSettings({ apiBaseUrl: url });
        var out = U.qs('#apiResultado', root);
        out.innerHTML = '<span class="muted">consultando /api/health…</span>';
        P.Api.health().then(function (r) {
          out.innerHTML = '<span class="chip ok">API respondendo</span> <span class="mono">' +
            U.esc(JSON.stringify(r)) + '</span>';
        }, function (err) {
          out.innerHTML = '<span class="chip danger">falha</span> <span class="mono">' + U.esc(err.message) + '</span>';
        });
      });

      U.on(root, 'click', '[data-act="login"]', function () {
        U.modal({
          title: 'Autenticação administrativa', size: 'sm', okLabel: 'Entrar',
          body: '<div class="field"><label>Senha</label><input type="password" name="senha" autofocus></div>' +
            '<p class="muted small">Corresponde ao segredo <code>ADMIN_SENHA</code> definido no Worker.</p>',
          onOk: function (el) {
            var senha = U.qs('[name="senha"]', el).value;
            P.Api.login(senha).then(function () {
              U.toast('Autenticado', 'ok');
              P.App.refresh();
            }, function (err) { U.toast(err.message, 'err'); });
          }
        });
      });
    }
  };

  function linha(k, v) {
    return '<tr><td>' + U.esc(k) + '</td><td class="num muted small">' + v + '</td></tr>';
  }
})(window.Portal = window.Portal || {});
