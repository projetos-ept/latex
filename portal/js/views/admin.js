/* ==========================================================================
   Tela: Painel administrativo (projetos, biblioteca, relatórios, backup)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;

  function tamanhoLocal() {
    try {
      var raw = localStorage.getItem('portal-tcc-abnt/v1') || '';
      return raw.length;
    } catch (e) { return 0; }
  }

  P.Views.admin = {
    titulo: 'Painel administrativo',
    wide: true,
    render: function (root) {
      var S = P.Store;
      var projetos = S.projects();
      var refs = S.references();
      var bytes = tamanhoLocal();
      var limite = 5 * 1024 * 1024; // limite prático de localStorage
      var uso = Math.min(100, Math.round((bytes / limite) * 100));

      var porTipo = {};
      refs.forEach(function (r) { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1; });
      var porNivel = {};
      projetos.forEach(function (p) {
        var k = M.nivel(p.meta.nivel).curto;
        porNivel[k] = (porNivel[k] || 0) + 1;
      });
      var totalPalavras = projetos.reduce(function (n, p) { return n + S.projectStats(p).words; }, 0);

      root.innerHTML =
        '<div class="page-head"><h1>Painel administrativo</h1>' +
        '<p>Visão consolidada dos trabalhos, da biblioteca e do armazenamento. ' +
        (P.Api.configured()
          ? 'API configurada: ' + U.esc(P.config.apiBaseUrl)
          : 'Operando em modo local — a gestão multiusuário entra quando o Worker for configurado.') + '</p></div>' +

        '<div class="grid cols-4" style="margin-bottom:18px">' +
          stat(String(projetos.length), 'trabalhos') +
          stat(String(refs.length), 'referências') +
          stat(totalPalavras.toLocaleString('pt-BR'), 'palavras escritas') +
          stat((bytes / 1024).toFixed(0) + ' KB', 'armazenamento local', uso + '% do limite do navegador') +
        '</div>' +

        '<div class="split"><div class="stack">' +
          '<div class="card flush">' +
            '<div class="card-head"><h2>Trabalhos</h2><div class="spacer"></div>' +
              '<button class="btn btn-sm btn-primary" data-act="novo">' + U.icon('plus') + 'Novo</button></div>' +
            '<table class="data"><thead><tr><th>Título</th><th>Nível</th><th class="num">Blocos</th>' +
              '<th class="num">Palavras</th><th class="num">Progresso</th><th>Atualizado</th><th></th></tr></thead><tbody>' +
            (projetos.length ? projetos.map(function (p) {
              var st = S.projectStats(p);
              return '<tr><td><strong>' + U.esc(p.meta.titulo) + '</strong><div class="muted small">' +
                  U.esc(p.meta.autor || 'sem autoria') + '</div></td>' +
                '<td>' + U.esc(M.nivel(p.meta.nivel).curto) + '</td>' +
                '<td class="num">' + p.blocks.length + '</td>' +
                '<td class="num">' + st.words.toLocaleString('pt-BR') + '</td>' +
                '<td class="num">' + st.progresso + '%</td>' +
                '<td class="muted small nowrap">' + U.fromNow(p.updatedAt) + '</td>' +
                '<td class="actions">' +
                  '<button class="btn btn-sm" data-abrir="' + p.id + '">abrir</button> ' +
                  '<button class="btn btn-sm" data-dup="' + p.id + '">duplicar</button> ' +
                  '<button class="btn btn-sm btn-danger" data-del="' + p.id + '">' + U.icon('trash') + '</button>' +
                '</td></tr>';
            }).join('') : '<tr><td colspan="7" class="muted">Nenhum trabalho cadastrado.</td></tr>') +
            '</tbody></table>' +
          '</div>' +

          '<div class="card flush">' +
            '<div class="card-head"><h2>Registro de atividades</h2><div class="spacer"></div>' +
              '<span class="muted small">' + (S.state.log || []).length + ' evento(s)</span></div>' +
            '<table class="data"><tbody>' +
            ((S.state.log || []).slice(0, 25).map(function (l) {
              return '<tr><td>' + U.esc(l.mensagem) + '</td>' +
                '<td class="num muted small nowrap">' + U.fmtDateTime(l.at) + '</td></tr>';
            }).join('') || '<tr><td class="muted">Sem registros.</td></tr>') +
            '</tbody></table>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card">' +
            '<h2>Acesso</h2>' +
            '<p class="muted small">Modelo inicial previsto no projeto: administrador único com sessão por token.</p>' +
            '<table class="data"><tbody>' +
              '<tr><td>Perfil</td><td class="num">' + (P.Api.configured() ? 'administrador' : 'local') + '</td></tr>' +
              '<tr><td>Token da API</td><td class="num">' + (U.trim(S.settings().apiToken) ? 'presente' : '—') + '</td></tr>' +
              '<tr><td>Sincronização</td><td class="num">' + (P.Api.enabled() ? 'ativa' : 'desligada') + '</td></tr>' +
              '<tr><td>Bucket R2</td><td class="num">' + (U.trim(S.settings().r2PublicUrl) ? 'configurado' : 'pendente') + '</td></tr>' +
            '</tbody></table>' +
            '<a class="btn btn-sm btn-block" href="#/config" style="margin-top:10px">Abrir configurações</a>' +
          '</div>' +

          '<div class="card">' +
            '<h2>Relatórios</h2>' +
            '<h4>Referências por tipo</h4>' +
            (Object.keys(porTipo).length ? barras(porTipo, refs.length, function (k) { return M.refType(k).label; }) : '<p class="muted small">Biblioteca vazia.</p>') +
            '<h4 style="margin-top:14px">Trabalhos por nível</h4>' +
            (Object.keys(porNivel).length ? barras(porNivel, projetos.length, function (k) { return k; }) : '<p class="muted small">Nenhum trabalho.</p>') +
          '</div>' +

          '<div class="card">' +
            '<h2>Backup</h2>' +
            '<p class="muted small">Exporte tudo (trabalhos, blocos, histórico e biblioteca) em um único arquivo JSON.</p>' +
            '<div class="stack" style="gap:6px">' +
              '<button class="btn btn-sm btn-block" data-act="backup">Exportar backup completo</button>' +
              '<button class="btn btn-sm btn-block" data-act="restaurar">Restaurar backup</button>' +
              '<button class="btn btn-sm btn-block btn-danger" data-act="zerar">Apagar todos os dados</button>' +
            '</div>' +
            '<div class="progress" style="margin-top:12px"><span style="width:' + uso + '%"></span></div>' +
            '<div class="help">' + uso + '% do armazenamento local em uso. Acima de 80%, faça backup e considere ativar a sincronização.</div>' +
          '</div>' +
        '</div></div>';

      U.on(root, 'click', '[data-act="novo"]', P.App.newProjectDialog);
      U.on(root, 'click', '[data-abrir]', function (ev, el) {
        S.setActive(el.getAttribute('data-abrir'));
        P.App.go('editor');
      });
      U.on(root, 'click', '[data-dup]', function (ev, el) {
        S.duplicateProject(el.getAttribute('data-dup'));
        U.toast('Trabalho duplicado', 'ok');
        P.App.refresh();
      });
      U.on(root, 'click', '[data-del]', function (ev, el) {
        var id = el.getAttribute('data-del');
        var p = S.project(id);
        U.confirm('Excluir "' + p.meta.titulo + '"? Esta ação não pode ser desfeita.', function () {
          S.deleteProject(id);
          P.App.refresh();
        }, { okLabel: 'Excluir' });
      });

      U.on(root, 'click', '[data-act="backup"]', function () {
        U.download('portal-tcc-backup-' + U.today() + '.json', S.exportAll(), 'application/json');
      });
      U.on(root, 'click', '[data-act="restaurar"]', function () {
        U.pickFile('.json', function (texto) {
          U.confirm('Restaurar o backup substituirá TODOS os dados atuais. Continuar?', function () {
            try {
              S.importAll(texto);
              U.toast('Backup restaurado', 'ok');
              P.App.refresh();
            } catch (e) {
              U.toast(e.message, 'err');
            }
          }, { okLabel: 'Restaurar' });
        });
      });
      U.on(root, 'click', '[data-act="zerar"]', function () {
        U.confirm('Apagar todos os trabalhos, blocos e referências deste navegador?', function () {
          S.reset();
          U.toast('Dados apagados');
          P.App.go('painel');
          P.App.refresh();
        }, { okLabel: 'Apagar tudo' });
      });
    }
  };

  function stat(value, label, hint) {
    return '<div class="card"><div class="stat"><span class="value">' + U.esc(value) + '</span>' +
      '<span class="label">' + U.esc(label) + '</span>' +
      (hint ? '<span class="hint">' + U.esc(hint) + '</span>' : '') + '</div></div>';
  }

  function barras(mapa, total, rotulo) {
    return Object.keys(mapa).sort(function (a, b) { return mapa[b] - mapa[a]; }).map(function (k) {
      var pct = total ? Math.round((mapa[k] / total) * 100) : 0;
      return '<div style="margin-bottom:8px">' +
        '<div class="row tight small" style="justify-content:space-between">' +
          '<span class="truncate">' + U.esc(rotulo(k)) + '</span><span class="muted">' + mapa[k] + '</span></div>' +
        '<div class="progress"><span style="width:' + pct + '%"></span></div></div>';
    }).join('');
  }
})(window.Portal = window.Portal || {});
