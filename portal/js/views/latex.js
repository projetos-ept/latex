/* ==========================================================================
   Tela: LaTeX gerado (pré-visualização e cópia rápida arquivo por arquivo)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;
  var atual = 0;

  P.Views.latex = {
    titulo: 'LaTeX gerado',
    wide: true,
    render: function (root) {
      var S = P.Store;
      var prj = S.activeProject();
      if (!prj) {
        root.innerHTML = '<div class="empty"><h3>Nenhum trabalho selecionado</h3>' +
          '<p>Crie um trabalho para gerar o LaTeX.</p></div>';
        return;
      }

      var build = P.LaTeX.buildProject(prj, S.references());
      var files = build.files.filter(function (f) { return /\.(tex|bib)$/.test(f.path); });
      if (atual >= files.length) atual = 0;
      var faltando = S.missingCitations(prj);
      var usadas = P.LaTeX.usedReferences(prj, S.references());
      var totalLinhas = files.reduce(function (n, f) { return n + f.content.split('\n').length; }, 0);

      root.innerHTML =
        '<div class="page-head"><div class="row"><div class="grow">' +
          '<h1>LaTeX gerado</h1>' +
          '<p>' + files.length + ' arquivo(s) · ' + totalLinhas.toLocaleString('pt-BR') + ' linhas · classe ' +
          '<strong>' + U.esc(prj.opcoes.engine === 'uspsc' ? 'USPSC' : 'abntex2') + '</strong> · citação ' +
          (prj.opcoes.citacao === 'num' ? 'numérica' : 'autor-data') + '. Tudo é regerado a cada alteração nos blocos.</p>' +
        '</div><div class="row tight">' +
          '<button class="btn" data-act="copy-todos">' + U.icon('copy') + 'Copiar arquivo atual</button>' +
          '<a class="btn btn-primary" href="#/exportar">' + U.icon('export') + 'Baixar projeto</a>' +
        '</div></div></div>' +

        (faltando.length
          ? '<div class="callout warn" style="margin-bottom:12px"><strong>' + faltando.length +
            ' citação(ões) sem referência cadastrada</strong> — não entrarão no <code>referencias.bib</code>: ' +
            U.esc(faltando.join(', ')) + '</div>'
          : '<div class="callout ok" style="margin-bottom:12px">' + usadas.length +
            ' referência(s) serão exportadas no <code>referencias.bib</code> e todas as citações do texto têm cadastro.</div>') +

        '<div class="tabs">' +
          files.map(function (f, i) {
            return '<button class="tab' + (i === atual ? ' is-active' : '') + '" data-file="' + i + '">' +
              U.esc(f.path) + '</button>';
          }).join('') +
        '</div>' +

        '<div class="card flush">' +
          '<div class="card-head">' +
            '<h3 class="mono">' + U.esc(files[atual].path) + '</h3>' +
            '<span class="muted small">' + files[atual].content.split('\n').length + ' linhas</span>' +
            '<div class="spacer"></div>' +
            '<button class="btn btn-sm" data-act="copy">' + U.icon('copy') + 'Copiar</button>' +
            '<button class="btn btn-sm" data-act="download">baixar</button>' +
          '</div>' +
          '<pre class="code tall">' + U.esc(files[atual].content) + '</pre>' +
        '</div>' +

        '<div class="grid cols-2" style="margin-top:16px">' +
          '<div class="card">' +
            '<h2>Ordem de compilação</h2>' +
            '<pre class="code">pdflatex main\nbibtex main\npdflatex main\npdflatex main</pre>' +
            '<p class="muted small" style="margin-top:8px">No Overleaf basta recompilar: a sequência é automática. Compile duas vezes após incluir citações novas para atualizar as chamadas e o sumário.</p>' +
          '</div>' +
          '<div class="card">' +
            '<h2>Arquivos do projeto</h2>' +
            '<table class="data"><tbody>' +
            build.files.map(function (f) {
              return '<tr><td class="mono small">' + U.esc(f.path) + '</td>' +
                '<td class="num muted small nowrap">' + (f.content.length / 1024).toFixed(1) + ' KB</td></tr>';
            }).join('') +
            '</tbody></table>' +
          '</div>' +
        '</div>';

      U.on(root, 'click', '[data-file]', function (ev, el) {
        atual = Number(el.getAttribute('data-file'));
        P.App.refresh();
      });
      U.on(root, 'click', '[data-act="copy"], [data-act="copy-todos"]', function () {
        U.copy(files[atual].content, files[atual].path);
      });
      U.on(root, 'click', '[data-act="download"]', function () {
        U.download(files[atual].path.split('/').pop(), files[atual].content, 'text/plain;charset=utf-8');
      });
    }
  };
})(window.Portal = window.Portal || {});
