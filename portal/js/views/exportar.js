/* ==========================================================================
   Tela: Exportar / Overleaf
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;

  function nomeArquivo(prj) {
    return (U.slug(prj.meta.titulo) || 'projeto-tcc') + '.zip';
  }

  P.Views.exportar = {
    titulo: 'Exportar / Overleaf',

    /** Gera e baixa o .zip do projeto (usado também pelo painel). */
    baixarZip: function (prj) {
      prj = prj || P.Store.activeProject();
      if (!prj) return;
      var build = P.LaTeX.buildProject(prj, P.Store.references());
      var blob = P.Zip.create(build.files);
      U.download(nomeArquivo(prj), blob);
      P.Store.log('Projeto exportado (.zip) com ' + build.files.length + ' arquivos');
      U.toast('Download iniciado: ' + nomeArquivo(prj), 'ok');
    },

    render: function (root) {
      var S = P.Store;
      var prj = S.activeProject();
      if (!prj) {
        root.innerHTML = '<div class="empty"><h3>Nenhum trabalho selecionado</h3></div>';
        return;
      }

      var build = P.LaTeX.buildProject(prj, S.references());
      var stats = S.projectStats(prj);
      var faltando = S.missingCitations(prj);
      var tamanho = build.files.reduce(function (n, f) { return n + f.content.length; }, 0);
      var vazios = prj.blocks.filter(function (b) {
        return b.tipo === 'capitulo' && b.incluir !== false && U.chars(b.conteudo) < 200;
      });

      root.innerHTML =
        '<div class="page-head"><h1>Exportar para o Overleaf</h1>' +
        '<p>O pacote contém <code>main.tex</code>, os capítulos separados, <code>referencias.bib</code> e a pasta de figuras — pronto para <em>Upload Project</em>.</p></div>' +

        '<div class="split"><div class="stack">' +
          '<div class="card pad-lg">' +
            '<h2>1. Baixar o pacote</h2>' +
            '<p class="muted small">' + build.files.length + ' arquivos · ' + (tamanho / 1024).toFixed(1) + ' KB · ' +
              stats.words.toLocaleString('pt-BR') + ' palavras</p>' +
            '<div class="row">' +
              '<button class="btn btn-primary" data-act="zip">' + U.icon('export') + 'Baixar ' + U.esc(nomeArquivo(prj)) + '</button>' +
              '<button class="btn" data-act="copy-main">' + U.icon('copy') + 'Copiar main.tex</button>' +
              '<button class="btn" data-act="copy-bib">' + U.icon('copy') + 'Copiar referencias.bib</button>' +
            '</div>' +
          '</div>' +

          '<div class="card pad-lg">' +
            '<h2>2. Importar no Overleaf</h2>' +
            '<ol class="soft small" style="margin:0;padding-left:20px;line-height:1.9">' +
              '<li>Acesse <a href="https://www.overleaf.com/project" target="_blank" rel="noopener">overleaf.com/project</a> e escolha <strong>New Project → Upload Project</strong>.</li>' +
              '<li>Envie o <code>.zip</code> sem descompactar.</li>' +
              '<li>Defina <code>main.tex</code> como documento principal em <strong>Menu → Main document</strong>.</li>' +
              '<li>Em <strong>Menu → Compiler</strong>, mantenha <code>pdfLaTeX</code>.</li>' +
              (prj.opcoes.engine === 'uspsc'
                ? '<li><strong>Atenção:</strong> copie a pasta <code>USPSC-classe/</code> do Pacote USPSC oficial para a raiz do projeto — ela não é distribuída aqui.</li>'
                : '<li>A classe <code>abntex2</code> já existe no Overleaf: nada a instalar.</li>') +
              '<li>Clique em <strong>Recompile</strong>. Se as citações aparecerem como <code>(?)</code>, recompile uma segunda vez.</li>' +
            '</ol>' +
          '</div>' +

          '<div class="card flush">' +
            '<div class="card-head"><h2>Conteúdo do pacote</h2></div>' +
            '<table class="data"><thead><tr><th>Arquivo</th><th>Descrição</th><th class="num">Tamanho</th></tr></thead><tbody>' +
            build.files.map(function (f) {
              return '<tr><td class="mono small">' + U.esc(f.path) + '</td>' +
                '<td class="muted small">' + U.esc(descricao(f.path)) + '</td>' +
                '<td class="num muted small nowrap">' + (f.content.length / 1024).toFixed(1) + ' KB</td></tr>';
            }).join('') +
            '</tbody></table>' +
          '</div>' +

          '<div class="card pad-lg">' +
            '<h2>Outras saídas</h2>' +
            '<div class="row">' +
              '<button class="btn btn-sm" data-act="bib">Somente referencias.bib</button>' +
              '<button class="btn btn-sm" data-act="texto">Texto puro (.txt)</button>' +
              '<button class="btn btn-sm" data-act="json">Backup do trabalho (.json)</button>' +
              '<button class="btn btn-sm" data-act="md">Markdown (.md)</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card">' +
            '<h2>Antes de exportar</h2>' +
            '<div class="stack" style="gap:8px;margin-top:8px">' +
              aviso(faltando.length === 0, faltando.length ? faltando.length + ' citação(ões) sem referência' : 'Todas as citações têm cadastro',
                faltando.length ? U.esc(faltando.slice(0, 5).join(', ')) : 'nada a corrigir') +
              aviso(vazios.length === 0, vazios.length ? vazios.length + ' capítulo(s) quase vazios' : 'Todos os capítulos com conteúdo',
                vazios.length ? U.esc(vazios.map(function (b) { return b.titulo; }).slice(0, 4).join(', ')) : '') +
              aviso(U.words(prj.meta.resumo) >= 150, 'Resumo com 150+ palavras', U.words(prj.meta.resumo) + ' palavras') +
              aviso(!!U.trim(prj.meta.instituicao) && !!U.trim(prj.meta.orientador), 'Capa e folha de rosto completas', 'instituição e orientação') +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<h2>Arquivos e anexos (R2)</h2>' +
            (P.Api.configured()
              ? '<p class="muted small">Envie PDFs (ficha catalográfica, folha de aprovação assinada) e imagens para o bucket R2.</p>' +
                '<button class="btn btn-sm btn-block" data-act="upload">Enviar arquivo</button>'
              : '<p class="muted small">O envio de arquivos para o Cloudflare R2 fica disponível assim que a URL do Worker for informada em <a href="#/config">Configurações</a>. Enquanto isso, inclua as imagens direto na pasta <code>figuras/</code> do Overleaf.</p>') +
          '</div>' +
        '</div></div>';

      U.on(root, 'click', '[data-act="zip"]', function () { P.Views.exportar.baixarZip(prj); });
      U.on(root, 'click', '[data-act="copy-main"]', function () { U.copy(build.main, 'main.tex'); });
      U.on(root, 'click', '[data-act="copy-bib"]', function () { U.copy(build.bib, 'referencias.bib'); });
      U.on(root, 'click', '[data-act="bib"]', function () {
        U.download('referencias.bib', build.bib, 'text/plain;charset=utf-8');
      });
      U.on(root, 'click', '[data-act="texto"]', function () {
        U.download(U.slug(prj.meta.titulo) + '.txt', textoPuro(prj), 'text/plain;charset=utf-8');
      });
      U.on(root, 'click', '[data-act="md"]', function () {
        U.download(U.slug(prj.meta.titulo) + '.md', markdown(prj), 'text/markdown;charset=utf-8');
      });
      U.on(root, 'click', '[data-act="json"]', function () {
        U.download(U.slug(prj.meta.titulo) + '.json', JSON.stringify({
          projeto: prj,
          referencias: P.LaTeX.usedReferences(prj, S.references())
        }, null, 2), 'application/json');
      });
      U.on(root, 'click', '[data-act="upload"]', function () {
        U.pickFile('', function (buffer, file) {
          U.toast('Enviando ' + file.name + '…');
          // O arquivo é vinculado ao projeto no banco, então o projeto precisa
          // existir no servidor antes do envio.
          P.Api.saveProject(prj)
            .then(function () { return P.Api.uploadFile(file, prj.id); })
            .then(function (r) {
              U.toast('Arquivo enviado: ' + (r.nome || file.name), 'ok');
            }, function (err) { U.toast(err.message, 'err'); });
        }, false);
      });
    }
  };

  function aviso(ok, titulo, detalhe) {
    return '<div class="row tight" style="align-items:flex-start;gap:8px">' +
      '<span class="chip ' + (ok ? 'ok' : 'warn') + '" style="width:20px;justify-content:center">' + (ok ? '✓' : '!') + '</span>' +
      '<div style="min-width:0"><div class="small" style="font-weight:600">' + titulo + '</div>' +
      (detalhe ? '<div class="muted small truncate">' + detalhe + '</div>' : '') + '</div></div>';
  }

  function descricao(path) {
    if (path === 'main.tex') return 'documento principal: preâmbulo, capa, folha de rosto e montagem';
    if (path === 'referencias.bib') return 'referências em BibTeX (ABNT NBR 6023)';
    if (path === 'README.md') return 'instruções de compilação';
    if (/^capitulos\//.test(path)) return 'capítulo dos elementos textuais';
    if (/^pretextual\//.test(path)) return 'elemento pré-textual';
    if (/^postextual\//.test(path)) return 'elemento pós-textual';
    if (/^figuras\//.test(path)) return 'pasta de imagens';
    return '';
  }

  function textoPuro(prj) {
    var linhas = [prj.meta.titulo.toUpperCase(), ''];
    if (U.trim(prj.meta.autor)) linhas.push(prj.meta.autor, '');
    if (U.trim(prj.meta.resumo)) linhas.push('RESUMO', '', prj.meta.resumo, '');
    prj.blocks.forEach(function (b) {
      if (b.incluir === false || !U.trim(b.conteudo)) return;
      linhas.push(b.titulo.toUpperCase(), '', b.conteudo, '');
    });
    return linhas.join('\n');
  }

  function markdown(prj) {
    var out = ['# ' + prj.meta.titulo];
    if (U.trim(prj.meta.subtitulo)) out.push('## ' + prj.meta.subtitulo);
    out.push('', '**' + prj.meta.autor + '** · ' + prj.meta.instituicao + ' · ' + prj.meta.ano, '');
    if (U.trim(prj.meta.resumo)) out.push('## Resumo', '', prj.meta.resumo, '');
    prj.blocks.forEach(function (b) {
      if (b.incluir === false) return;
      out.push(new Array(b.nivel + 2).join('#') + ' ' + b.titulo, '', b.conteudo || '_(em branco)_', '');
    });
    out.push('## Referências', '');
    P.LaTeX.usedReferences(prj, P.Store.references()).forEach(function (r) {
      out.push('- ' + P.ABNT.formatPlain(r));
    });
    return out.join('\n');
  }
})(window.Portal = window.Portal || {});
