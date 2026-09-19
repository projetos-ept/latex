/* ==========================================================================
   Tela: Painel (visão geral do trabalho)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;

  function checklist(prj) {
    var m = prj.meta, S = P.Store;
    var stats = S.projectStats(prj);
    var refs = S.references();
    var faltando = S.missingCitations(prj);
    var itens = [
      { ok: !!U.trim(m.titulo) && m.titulo !== 'Novo trabalho acadêmico', label: 'Título definido', dica: 'Dados do trabalho' },
      { ok: !!U.trim(m.autor), label: 'Autoria informada', dica: 'Dados do trabalho' },
      { ok: !!U.trim(m.instituicao), label: 'Instituição informada', dica: 'Dados do trabalho' },
      { ok: !!U.trim(m.orientador), label: 'Orientação informada', dica: 'Dados do trabalho' },
      { ok: U.words(m.resumo) >= 150, label: 'Resumo com 150+ palavras', dica: 'ABNT NBR 6028: 150 a 500 palavras' },
      { ok: (m.palavrasChave || []).length >= 3, label: '3+ palavras-chave', dica: 'Editor → Resumo' },
      { ok: U.words(m.abstract) >= 100, label: 'Abstract redigido', dica: 'Editor → Resumo' },
      { ok: stats.progresso >= 100, label: 'Todos os capítulos com conteúdo', dica: stats.preenchidos + ' de ' + stats.textuais },
      { ok: refs.length >= 10, label: '10+ referências na biblioteca', dica: refs.length + ' cadastradas' },
      { ok: stats.citacoes > 0, label: 'Citações inseridas no texto', dica: stats.citacoes + ' chave(s) citada(s)' },
      { ok: faltando.length === 0, label: 'Citações sem referência: ' + faltando.length, dica: faltando.slice(0, 4).join(', ') }
    ];
    return itens;
  }

  P.Views.painel = {
    titulo: 'Painel',
    render: function (root) {
      var S = P.Store;
      var prj = S.activeProject();

      if (!prj) {
        root.innerHTML =
          '<div class="page-head"><h1>Bem-vindo ao Portal TCC ABNT</h1>' +
          '<p>Escreva seu TCC, dissertação ou tese em blocos editáveis, monte a biblioteca de referências e gere o projeto LaTeX pronto para o Overleaf.</p></div>' +
          '<div class="grid cols-3" style="margin-bottom:18px">' +
            card('1. Estruture', 'Escolha o nível (graduação, especialização, mestrado ou doutorado) e receba a estrutura ABNT NBR 14724 completa, capítulo por capítulo.') +
            card('2. Escreva em blocos', 'Cada capítulo e seção é um bloco independente, versionado, com cópia imediata do LaTeX correspondente.') +
            card('3. Exporte', 'Gere main.tex, capítulos, referencias.bib e baixe o .zip pronto para importar no Overleaf.') +
          '</div>' +
          '<div class="empty"><h3>Nenhum trabalho criado ainda</h3>' +
          '<p>Comece criando seu trabalho. Nada é enviado para servidores: os dados ficam no seu navegador até você configurar a sincronização.</p>' +
          '<button class="btn btn-primary" data-act="novo">' + U.icon('plus') + 'Criar meu trabalho</button></div>';
        U.on(root, 'click', '[data-act="novo"]', P.App.newProjectDialog);
        return;
      }

      var stats = S.projectStats(prj);
      var nivel = P.M.nivel(prj.meta.nivel);
      var capitulos = prj.blocks.filter(function (b) { return b.tipo === 'capitulo' && b.nivel === 1 && b.incluir !== false; });
      var itens = checklist(prj);
      var pendentes = itens.filter(function (i) { return !i.ok; }).length;
      var faltando = S.missingCitations(prj);

      root.innerHTML =
        '<div class="page-head"><div class="row"><div class="grow">' +
          '<h1>' + U.esc(prj.meta.titulo) + '</h1>' +
          '<p>' + U.esc(nivel.tipoTrabalho) + (U.trim(prj.meta.curso) ? ' · ' + U.esc(prj.meta.curso) : '') +
          (U.trim(prj.meta.instituicao) ? ' · ' + U.esc(prj.meta.instituicao) : '') + '</p>' +
        '</div>' +
        '<div class="row tight">' +
          '<a class="btn" href="#/editor">' + U.icon('editor') + 'Escrever</a>' +
          '<a class="btn btn-primary" href="#/exportar">' + U.icon('export') + 'Exportar</a>' +
        '</div></div></div>' +

        '<div class="grid cols-4" style="margin-bottom:18px">' +
          stat(stats.words.toLocaleString('pt-BR'), 'palavras', stats.chars.toLocaleString('pt-BR') + ' caracteres') +
          stat(String(stats.pages).replace('.', ','), 'páginas (estim.)', 'texto corrido, fonte 12, 1,5') +
          stat(stats.preenchidos + '/' + stats.textuais, 'capítulos escritos', stats.progresso + '% da estrutura') +
          stat(stats.citacoes + '/' + S.references().length, 'citados / biblioteca', faltando.length ? faltando.length + ' sem cadastro' : 'todas cadastradas') +
        '</div>' +

        '<div class="split">' +
          '<div class="stack">' +
            '<div class="card flush">' +
              '<div class="card-head"><h2>Progresso por capítulo</h2><div class="spacer"></div>' +
                '<span class="chip ' + (stats.progresso >= 100 ? 'ok' : 'accent') + '">' + stats.progresso + '%</span></div>' +
              '<div class="progress' + (stats.progresso >= 100 ? ' ok' : '') + '" style="border-radius:0"><span style="width:' + stats.progresso + '%"></span></div>' +
              '<table class="data"><thead><tr><th>Capítulo</th><th class="num">Palavras</th><th class="num">Págs.</th><th>Situação</th><th></th></tr></thead><tbody>' +
              (capitulos.length ? capitulos.map(function (b) {
                var w = U.words(b.conteudo), c = U.chars(b.conteudo);
                var estado = c > 1500 ? '<span class="chip ok">avançado</span>'
                  : c > 200 ? '<span class="chip warn">em andamento</span>'
                  : '<span class="chip">vazio</span>';
                return '<tr><td><strong>' + U.esc(b.titulo) + '</strong></td>' +
                  '<td class="num">' + w.toLocaleString('pt-BR') + '</td>' +
                  '<td class="num">' + String(U.pages(c)).replace('.', ',') + '</td>' +
                  '<td>' + estado + '</td>' +
                  '<td class="actions"><a class="btn btn-sm" href="#/editor/' + b.id + '">abrir</a></td></tr>';
              }).join('') : '<tr><td colspan="5" class="muted">Nenhum capítulo no trabalho.</td></tr>') +
              '</tbody></table>' +
            '</div>' +

            (faltando.length ? '<div class="callout warn"><strong>' + faltando.length + ' citação(ões) sem referência cadastrada:</strong> ' +
              U.esc(faltando.join(', ')) + '. Cadastre na <a href="#/biblioteca">biblioteca</a> para que apareçam no <code>referencias.bib</code>.</div>' : '') +

            '<div class="card flush">' +
              '<div class="card-head"><h2>Atividade recente</h2></div>' +
              '<table class="data"><tbody>' +
              ((prj.historico || []).slice(0, 8).map(function (h) {
                return '<tr><td>' + U.esc(h.titulo) + ' <span class="muted small">v' + h.versao + '</span></td>' +
                  '<td class="num muted small">' + h.chars + ' car.</td>' +
                  '<td class="num muted small nowrap">' + U.fromNow(h.at) + '</td></tr>';
              }).join('') || '<tr><td class="muted">Nenhuma edição registrada ainda.</td></tr>') +
              '</tbody></table>' +
            '</div>' +
          '</div>' +

          '<div class="stack">' +
            '<div class="card">' +
              '<h2>Checklist ABNT <span class="chip ' + (pendentes ? 'warn' : 'ok') + '">' +
                (pendentes ? pendentes + ' pendente(s)' : 'completo') + '</span></h2>' +
              '<div class="stack" style="gap:7px;margin-top:10px">' +
              itens.map(function (i) {
                return '<div class="row tight" style="align-items:flex-start;gap:8px">' +
                  '<span class="chip ' + (i.ok ? 'ok' : 'outline') + '" style="width:20px;justify-content:center">' +
                  (i.ok ? '✓' : '·') + '</span>' +
                  '<div style="min-width:0"><div class="small" style="font-weight:600">' + U.esc(i.label) + '</div>' +
                  (i.dica ? '<div class="muted small truncate">' + U.esc(i.dica) + '</div>' : '') + '</div></div>';
              }).join('') +
              '</div>' +
            '</div>' +

            '<div class="card">' +
              '<h2>Cópia rápida</h2>' +
              '<p class="muted small">Leva direto para o Overleaf sem baixar nada.</p>' +
              '<div class="stack" style="gap:6px">' +
                '<button class="btn btn-block" data-act="copy-main">' + U.icon('copy') + 'Copiar main.tex</button>' +
                '<button class="btn btn-block" data-act="copy-bib">' + U.icon('copy') + 'Copiar referencias.bib</button>' +
                '<button class="btn btn-block" data-act="zip">' + U.icon('export') + 'Baixar projeto .zip</button>' +
              '</div>' +
            '</div>' +

            '<div class="card">' +
              '<h2>Configuração de saída</h2>' +
              '<div class="ref-meta">' +
                '<span class="chip accent">' + U.esc((prj.opcoes.engine === 'uspsc' ? 'Modelo USPSC' : 'abnTeX2')) + '</span>' +
                '<span class="chip">' + (prj.opcoes.citacao === 'num' ? 'citação numérica' : 'autor-data') + '</span>' +
                '<span class="chip">' + (prj.opcoes.frenteEVerso ? 'frente e verso' : 'só frente') + '</span>' +
              '</div>' +
              '<p class="muted small" style="margin-top:10px">Ajuste em <a href="#/projeto">Dados do trabalho</a>.</p>' +
            '</div>' +
          '</div>' +
        '</div>';

      U.on(root, 'click', '[data-act="copy-main"]', function () {
        var build = P.LaTeX.buildProject(prj, S.references());
        U.copy(build.main, 'main.tex');
      });
      U.on(root, 'click', '[data-act="copy-bib"]', function () {
        var build = P.LaTeX.buildProject(prj, S.references());
        U.copy(build.bib, 'referencias.bib');
      });
      U.on(root, 'click', '[data-act="zip"]', function () {
        P.Views.exportar.baixarZip(prj);
      });
    }
  };

  function stat(value, label, hint) {
    return '<div class="card"><div class="stat">' +
      '<span class="value">' + U.esc(value) + '</span>' +
      '<span class="label">' + U.esc(label) + '</span>' +
      (hint ? '<span class="hint">' + U.esc(hint) + '</span>' : '') +
      '</div></div>';
  }

  function card(titulo, texto) {
    return '<div class="card"><h3>' + U.esc(titulo) + '</h3><p class="muted small" style="margin:0">' + U.esc(texto) + '</p></div>';
  }
})(window.Portal = window.Portal || {});
