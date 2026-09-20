/* ==========================================================================
   Portal TCC ABNT - motor LaTeX
   --------------------------------------------------------------------------
   1. Converte a marcação leve dos blocos editáveis em LaTeX ABNT.
   2. Monta o projeto completo (main.tex + capítulos + .bib) para abnTeX2
      ou para o modelo USPSC.
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;
  var L = {};

  /* ---------------------------------------------------------------- escape - */

  var ESC = {
    '\\': '\\textbackslash{}',
    '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
    '_': '\\_', '{': '\\{', '}': '\\}',
    '~': '\\textasciitilde{}', '^': '\\textasciicircum{}'
  };

  /** Escapa texto comum para LaTeX. */
  L.escape = function (s) {
    return String(s == null ? '' : s).replace(/[\\&%$#_{}~^]/g, function (ch) { return ESC[ch]; });
  };

  /* ----------------------------------------------------------- marcação ---- */

  var PH = '\u0001PTL', PH_END = '\u0002';

  /** Protege trechos que não devem ser escapados (matemática, código, comandos). */
  function protect(text, store) {
    return text
      .replace(/\$\$[\s\S]*?\$\$/g, keep)
      .replace(/\$[^$\n]*\$/g, keep)
      .replace(/`([^`\n]+)`/g, function (_, code) {
        return keep('\\texttt{' + L.escape(code) + '}');
      })
      .replace(/\\\\(?=\s|$)/g, function () { return keep('\\\\'); });

    function keep(m) {
      store.push(m);
      return PH + (store.length - 1) + PH_END;
    }
  }

  function restore(text, store) {
    return text.replace(new RegExp(PH + '(\\d+)' + PH_END, 'g'), function (_, i) {
      return store[Number(i)];
    });
  }

  function citations(text) {
    // [@@chave, p. 12] -> citação narrativa; [@chave, p. 12] -> citação indireta
    return text
      .replace(/\[@@([A-Za-z0-9:_\-+.,;\s]+?)\]/g, function (_, body) {
        return citeCmd('citeonline', body);
      })
      .replace(/\[@([A-Za-z0-9:_\-+.,;\s]+?)\]/g, function (_, body) {
        return citeCmd('cite', body);
      });
  }

  function citeCmd(cmd, body) {
    var parts = String(body).split(',');
    var keys = U.trim(parts.shift()).replace(/\s+/g, '');
    var extra = U.trim(parts.join(',')).replace(/^p\.?\s*/i, '');
    return '\\' + cmd + (extra ? '[p.~' + extra + ']' : '') + '{' + keys + '}';
  }

  function inline(text) {
    var store = [];
    var out = protect(text, store);
    out = L.escape(out);
    // A marcação é aplicada depois do escape, então os comandos gerados sobrevivem.
    out = out
      .replace(/\*\*([^*\n]+)\*\*/g, '\\textbf{$1}')
      .replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1\\emph{$2}')
      .replace(/(^|\s)\\_\\_([^\n]+?)\\_\\_(?=\s|$|[.,;:!?])/g, '$1\\underline{$2}');
    out = citations(out);
    // Os marcadores de proteção atravessam o escape intactos; restaura por último.
    return restore(out, store);
  }

  L.inline = inline;

  var HEAD_CMDS = ['chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];

  /**
   * Converte a marcação de um bloco em LaTeX.
   * offset: 1 -> "##" vira \section (padrão dentro de um capítulo).
   */
  L.fromMarkup = function (text, offset) {
    offset = offset == null ? 1 : offset;
    var lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    var out = [];
    var buf = [];          // parágrafo corrente
    var mode = null;       // null | 'ul' | 'ol' | 'quote' | 'raw' | 'table'
    var items = [];
    var pendingCaption = null;

    function flushParagraph() {
      if (!buf.length) return;
      out.push(inline(buf.join(' ').trim()));
      out.push('');
      buf = [];
    }

    function flushMode() {
      if (mode === 'ul' || mode === 'ol') {
        var env = mode === 'ul' ? 'itemize' : 'enumerate';
        out.push('\\begin{' + env + '}');
        items.forEach(function (it) { out.push('  \\item ' + inline(it)); });
        out.push('\\end{' + env + '}', '');
      } else if (mode === 'quote') {
        out.push('\\begin{citacao}');
        out.push(inline(items.join(' ')));
        out.push('\\end{citacao}', '');
      } else if (mode === 'raw') {
        items.forEach(function (it) { out.push(it); });
        out.push('');
      } else if (mode === 'table') {
        out.push(tabular(items, pendingCaption));
        out.push('');
        pendingCaption = null;
      }
      items = [];
      mode = null;
    }

    function flushAll() { flushParagraph(); flushMode(); }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();

      if (!t) { flushAll(); continue; }

      var head = /^(#{2,6})\s+(.*)$/.exec(t);
      if (head) {
        flushAll();
        var lvl = Math.min(head[1].length - 2 + offset, HEAD_CMDS.length - 1);
        var titulo = U.trim(head[2]);
        var star = /\*$/.test(titulo);
        if (star) titulo = U.trim(titulo.slice(0, -1));
        out.push('\\' + HEAD_CMDS[lvl] + (star ? '*' : '') + '{' + inline(titulo) + '}', '');
        continue;
      }

      var fig = /^\[fig:\s*([^\]|]+)(?:\|([^\]|]*))?(?:\|([^\]|]*))?\]$/.exec(t);
      if (fig) {
        flushAll();
        out.push(figure(U.trim(fig[1]), U.trim(fig[2] || ''), U.trim(fig[3] || '')));
        out.push('');
        continue;
      }

      var tab = /^\[tab:\s*([^\]|]+)(?:\|([^\]|]*))?\]$/.exec(t);
      if (tab) {
        flushAll();
        pendingCaption = { legenda: U.trim(tab[1]), fonte: U.trim(tab[2] || '') };
        continue;
      }

      if (t.charAt(0) === '|') {
        if (mode !== 'table') { flushParagraph(); flushMode(); mode = 'table'; }
        items.push(t);
        continue;
      }

      if (t.charAt(0) === '>') {
        if (mode !== 'quote') { flushParagraph(); flushMode(); mode = 'quote'; }
        items.push(U.trim(t.replace(/^>\s?/, '')));
        continue;
      }

      if (/^[-*+]\s+/.test(t)) {
        if (mode !== 'ul') { flushParagraph(); flushMode(); mode = 'ul'; }
        items.push(U.trim(t.replace(/^[-*+]\s+/, '')));
        continue;
      }

      if (/^\d+[.)]\s+/.test(t)) {
        if (mode !== 'ol') { flushParagraph(); flushMode(); mode = 'ol'; }
        items.push(U.trim(t.replace(/^\d+[.)]\s+/, '')));
        continue;
      }

      if (t.charAt(0) === '\\' || t.charAt(0) === '%') {
        if (mode !== 'raw') { flushParagraph(); flushMode(); mode = 'raw'; }
        items.push(line.replace(/\s+$/, ''));
        continue;
      }

      if (mode && mode !== 'raw') flushMode();
      buf.push(t);
    }

    flushAll();
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  function figure(arquivo, legenda, fonte) {
    var nome = arquivo.replace(/\.(png|jpg|jpeg|pdf|eps)$/i, '');
    var label = 'fig:' + U.slug(nome);
    return [
      '\\begin{figure}[htb]',
      '\\centering',
      '\\caption{' + inline(legenda || nome) + '}',
      '\\label{' + label + '}',
      '\\includegraphics[width=0.85\\textwidth]{figuras/' + arquivo + '}',
      '\\fonte{' + (fonte ? inline(fonte) : 'Elaborado pelo autor (' + U.year() + ').') + '}',
      '\\end{figure}'
    ].join('\n');
  }

  function tabular(rows, caption) {
    var cells = rows.map(function (r) {
      return r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return U.trim(c); });
    }).filter(function (r) {
      return !r.every(function (c) { return /^:?-{2,}:?$/.test(c) || !c; });
    });
    if (!cells.length) return '';
    var cols = cells[0].length;
    var spec = new Array(cols + 1).join('l');
    var head = cells[0].map(function (c) { return '\\textbf{' + inline(c) + '}'; }).join(' & ');
    var body = cells.slice(1).map(function (r) {
      return r.map(inline).join(' & ') + ' \\\\';
    });
    var legenda = caption && caption.legenda ? caption.legenda : 'Dados da pesquisa';
    var fonte = caption && caption.fonte ? caption.fonte : 'Elaborado pelo autor (' + U.year() + ').';
    return [
      '\\begin{table}[htb]',
      '\\centering',
      '\\caption{' + inline(legenda) + '}',
      '\\label{tab:' + U.slug(legenda) + '}',
      '\\begin{tabular}{' + spec + '}',
      '\\toprule',
      head + ' \\\\',
      '\\midrule',
      body.join('\n'),
      '\\bottomrule',
      '\\end{tabular}',
      '\\fonte{' + inline(fonte) + '}',
      '\\end{table}'
    ].join('\n');
  }

  /* ------------------------------------------------------------- por bloco - */

  /** LaTeX de um bloco isolado (é o que o botão "Copiar LaTeX" entrega). */
  L.block = function (block, opts) {
    opts = opts || {};
    if (!block) return '';
    if (block.comando) return block.comando;

    var body = L.fromMarkup(block.conteudo, block.nivel === 1 ? 1 : block.nivel);
    var titulo = inline(block.titulo || '');
    var head = '';

    if (block.tipo === 'capitulo' && block.nivel === 1) {
      head = '\\chapter' + (block.numerado === false ? '*' : '') + '{' + titulo + '}';
    } else if (block.nivel === 2) {
      head = '\\section' + (block.numerado === false ? '*' : '') + '{' + titulo + '}';
    } else if (block.nivel === 3) {
      head = '\\subsection' + (block.numerado === false ? '*' : '') + '{' + titulo + '}';
    } else if (block.tipo === 'pretextual' || block.tipo === 'postextual') {
      // Dentro de apendicesenv/anexosenv o \chapter numerado gera "APÊNDICE A – ...",
      // por isso um prefixo digitado pelo autor é removido para não duplicar.
      var limpo = inline(U.trim(block.titulo || '').replace(/^(ap[êe]ndice|anexo)\s+[A-Z0-9]*\s*[–—-]?\s*/i, ''));
      head = block.numerado === false
        ? '\\chapter*{' + titulo + '}'
        : '\\chapter{' + (limpo || titulo) + '}';
    }
    if (opts.semTitulo) head = '';

    var label = block.tipo === 'capitulo' && block.nivel === 1
      ? '\\label{cap:' + U.slug(block.key || block.titulo) + '}' : '';

    var cabeca = [head, label].filter(Boolean).join('\n');
    return (cabeca ? cabeca + '\n\n' : '') + body +
      (opts.trailingNewline === false ? '' : '\n');
  };

  /* ------------------------------------------------------- projeto completo - */

  function metaEsc(v) { return L.escape(U.trim(v)); }

  /** Título com subtítulo incorporado (as classes ABNT não definem \subtitulo). */
  function tituloCompleto(meta) {
    var t = metaEsc(meta.titulo) || '[Título do trabalho]';
    return U.trim(meta.subtitulo) ? t + ': ' + metaEsc(meta.subtitulo) : t;
  }

  // Titulações que o autor costuma digitar junto do nome.
  var RE_TITULACAO = /^\s*(prof|profa|professor|professora|dr|dra|doutor|doutora|me|ma|mestre|mestra|msc|m\.?sc|esp|especialista|ph\.?\s*d)\b\.?/i;

  /**
   * Junta titulação e nome sem duplicar: quem escreve "Prof. Me. Fulano" no
   * campo do nome não deve receber o prefixo padrão "Prof. Dr." por cima.
   */
  function nomeComTitulo(titulacao, nome, padrao) {
    var n = U.trim(nome);
    if (!n) return metaEsc(padrao);
    if (RE_TITULACAO.test(n)) return metaEsc(n);
    return metaEsc([U.trim(titulacao), n].filter(Boolean).join(' '));
  }

  function preambulo(project) {
    var meta = project.meta;
    var nivel = M.nivel(meta.nivel);
    var texto = U.trim(meta.preambulo) || nivel.preambulo;
    return metaEsc(texto
      .replace(/\{curso\}/g, U.trim(meta.curso) || '[curso]')
      .replace(/\{instituicao\}/g, U.trim(meta.instituicao) || '[instituição]')
      .replace(/\{grau\}/g, U.trim(meta.grau) || nivel.grau)
      .replace(/\{area\}/g, U.trim(meta.area) || U.trim(meta.curso) || '[área]'));
  }

  /** Agrupa blocos textuais em arquivos: cada capítulo (nível 1) vira um .tex. */
  L.chapterFiles = function (project) {
    var files = [];
    var current = null;
    var usados = {};
    (project.blocks || []).forEach(function (b) {
      if (b.incluir === false || b.tipo !== 'capitulo') return;
      if (b.nivel === 1 || !current) {
        var nome = U.slug(b.arquivo || b.key || b.titulo) || 'capitulo' + (files.length + 1);
        if (usados[nome]) nome = nome + '-' + (++usados[nome]);
        else usados[nome] = 1;
        current = {
          nome: nome,
          titulo: b.titulo,
          blocks: [b]
        };
        files.push(current);
      } else {
        current.blocks.push(b);
      }
    });
    files.forEach(function (fl) {
      fl.conteudo = fl.blocks.map(function (b) { return L.block(b); }).join('\n\n').trim() + '\n';
    });
    return files;
  };

  function extraFiles(project, tipo, dir) {
    var usados = {};
    return (project.blocks || [])
      .filter(function (b) { return b.tipo === tipo && b.incluir !== false && !b.comando && U.trim(b.conteudo); })
      .map(function (b) {
        var nome = U.slug(b.arquivo || b.key || b.titulo);
        if (usados[nome]) nome = nome + '-' + (++usados[nome]);
        else usados[nome] = 1;
        // Dedicatória, agradecimentos e epígrafe entram nos ambientes próprios
        // do abntex2, que já imprimem o título do elemento.
        var semTitulo = !!PRE_ENV[nome];
        return {
          nome: nome,
          dir: dir,
          titulo: b.titulo,
          conteudo: L.block(b, { semTitulo: semTitulo })
        };
      });
  }

  function palavras(list) {
    var arr = Array.isArray(list) ? list : String(list || '').split(/[;,]/);
    return arr.map(U.trim).filter(Boolean);
  }

  function resumoEnv(project) {
    var meta = project.meta;
    var out = [];
    var kw = palavras(meta.palavrasChave);
    out.push('\\begin{resumo}');
    out.push(L.fromMarkup(meta.resumo || '', 2) || '% Insira o resumo (150 a 500 palavras, parágrafo único).');
    out.push('');
    out.push('\\noindent');
    out.push('\\textbf{Palavras-chave}: ' + (kw.length ? metaEsc(kw.join('; ')) + '.' : '[palavras-chave].'));
    out.push('\\end{resumo}');
    out.push('');
    var kwEn = palavras(meta.keywords);
    out.push('\\begin{resumo}[Abstract]');
    out.push(' \\begin{otherlanguage*}{english}');
    out.push(L.fromMarkup(meta.abstract || '', 2) || '   % Insira o abstract.');
    out.push('');
    out.push('   \\noindent');
    out.push('   \\textbf{Keywords}: ' + (kwEn.length ? metaEsc(kwEn.join('; ')) + '.' : '[keywords].'));
    out.push(' \\end{otherlanguage*}');
    out.push('\\end{resumo}');
    return out.join('\n');
  }

  /* ------------------------------------------------------ main.tex abnTeX2 -- */

  function mainAbntex2(project, chapters, pre, post) {
    var meta = project.meta;
    var op = project.opcoes || {};
    var nivel = M.nivel(meta.nivel);
    var classOpts = [
      '12pt',
      'openright',
      op.frenteEVerso ? 'twoside' : 'oneside',
      'a4paper',
      'chapter=TITLE',
      'english',
      'brazil'
    ].join(',\n');

    var citeOpts = op.citacao === 'num'
      ? '[num, abnt-emphasize=bf]'
      : '[alf, abnt-emphasize=bf, abnt-thesis-year=both, abnt-etal-cite=3, abnt-etal-list=3]';

    var lines = [];
    var out = lines.push.bind(lines);

    out('% =====================================================================');
    out('% ' + U.trim(meta.titulo));
    out('% ' + nivel.tipoTrabalho + ' — gerado pelo Portal TCC ABNT');
    out('% Classe: abntex2 | Compilação: pdflatex -> bibtex -> pdflatex (2x)');
    out('% Gerado em: ' + U.fmtDateTime(U.now()));
    out('% =====================================================================');
    out('\\documentclass[');
    out(classOpts);
    out(']{abntex2}');
    out('');
    out('% ---- pacotes básicos ----');
    out('\\usepackage[T1]{fontenc}');
    out('\\usepackage[utf8]{inputenc}');
    out('\\usepackage{lmodern}');
    out('\\usepackage{lastpage}');
    out('\\usepackage{indentfirst}');
    out('\\usepackage{color}');
    out('\\usepackage{graphicx}');
    out('\\usepackage{microtype}');
    out('\\usepackage{amsmath}');
    out('\\usepackage{amssymb}');
    out('\\usepackage{booktabs}');
    out('\\usepackage{float}');
    out('\\usepackage{multirow}');
    out('\\usepackage{longtable}');
    out('');
    out('% ---- citações e referências ABNT ----');
    out('\\usepackage[brazilian,hyperpageref]{backref}');
    out('\\usepackage' + citeOpts + '{abntex2cite}');
    out('');
    out('% ---- informações do trabalho ----');
    out('\\titulo{' + tituloCompleto(meta) + '}');
    out('\\autor{' + metaEsc(meta.autor) + '}');
    out('\\local{' + (metaEsc(meta.cidade) || '[Cidade]') + '}');
    out('\\data{' + metaEsc(meta.ano) + '}');
    var linhasInst = [metaEsc(meta.instituicao) || '[Instituição]'];
    if (U.trim(meta.unidade)) linhasInst.push(metaEsc(meta.unidade));
    if (U.trim(meta.curso)) linhasInst.push(metaEsc(meta.curso));
    out('\\instituicao{%');
    linhasInst.forEach(function (linha, i) {
      out('  ' + linha + (i < linhasInst.length - 1 ? ' \\par' : ''));
    });
    out('}');
    out('\\tipotrabalho{' + metaEsc(meta.tipoTrabalho || nivel.tipoTrabalho) + '}');
    out('\\preambulo{' + preambulo(project) + '}');
    out('\\orientador{' + nomeComTitulo(meta.orientadorTitulo, meta.orientador, '[Orientador]') + '}');
    if (U.trim(meta.coorientador)) {
      out('\\coorientador{' + nomeComTitulo(meta.coorientadorTitulo, meta.coorientador, '') + '}');
    }
    out('');
    out('% ---- configuração de links e backref ----');
    out('\\definecolor{blue}{RGB}{41,5,195}');
    out('\\makeatletter');
    out('\\hypersetup{');
    out('  pdftitle={\\@title},');
    out('  pdfauthor={\\@author},');
    out('  pdfsubject={' + metaEsc(meta.tipoTrabalho || nivel.tipoTrabalho) + '},');
    out('  colorlinks=true, linkcolor=blue, citecolor=blue, filecolor=magenta, urlcolor=blue,');
    out('  bookmarksdepth=4');
    out('}');
    out('\\makeatother');
    out('');
    out('\\renewcommand{\\backrefpagesname}{Citado na(s) página(s):~}');
    out('\\renewcommand{\\backref}{}');
    out('\\renewcommand*{\\backrefalt}[4]{%');
    out('  \\ifcase #1 %');
    out('    Nenhuma citação no texto.%');
    out('  \\or');
    out('    Citado na página #2.%');
    out('  \\else');
    out('    Citado #1 vezes nas páginas #2.%');
    out('  \\fi}');
    out('');
    out('% ---- espaçamentos ABNT ----');
    out('\\setlength{\\parindent}{1.3cm}');
    out('\\setlength{\\parskip}{0.2cm}');
    out('\\OnehalfSpacing % espaçamento 1,5 no texto (NBR 14724)');
    out('');
    out('% =====================================================================');
    out('\\begin{document}');
    out('\\selectlanguage{brazil}');
    out('\\frenchspacing');
    out('');
    out('% --------------------------- pré-textuais ---------------------------');
    out('\\pretextual');
    out('\\imprimircapa');
    out('\\imprimirfolhaderosto' + (op.frenteEVerso ? '*' : ''));
    out('');
    if (op.fichaCatalografica) {
      out('% Ficha catalográfica fornecida pela biblioteca da instituição:');
      out('% \\begin{fichacatalografica}\\input{pretextual/ficha-catalografica}\\end{fichacatalografica}');
      out('');
    }
    if (op.errata) {
      out('\\begin{errata}');
      out('  \\input{pretextual/errata}');
      out('\\end{errata}');
      out('');
    }
    out('% Folha de aprovação (inserir o PDF assinado pela banca após a defesa)');
    out('\\begin{folhadeaprovacao}%');
    out('  \\input{pretextual/folha-de-aprovacao}');
    out('\\end{folhadeaprovacao}');
    out('');
    pre.forEach(function (fl) {
      var env = PRE_ENV[fl.nome];
      if (env) {
        out('\\begin{' + env + '}');
        out('  \\input{pretextual/' + fl.nome + '}');
        out('\\end{' + env + '}');
      } else {
        out('\\input{pretextual/' + fl.nome + '}');
      }
      out('');
    });
    out(resumoEnv(project));
    out('');
    if (op.listaFiguras) {
      out('\\pdfbookmark[0]{\\listfigurename}{lof}');
      out('\\listoffigures*');
      out('\\cleardoublepage');
      out('');
    }
    if (op.listaTabelas) {
      out('\\pdfbookmark[0]{\\listtablename}{lot}');
      out('\\listoftables*');
      out('\\cleardoublepage');
      out('');
    }
    if (op.listaSiglas) {
      out('\\begin{siglas}');
      out('  \\item[ABNT] Associação Brasileira de Normas Técnicas');
      out('  % \\item[SIGLA] Significado');
      out('\\end{siglas}');
      out('');
    }
    if (op.listaSimbolos) {
      out('\\begin{simbolos}');
      out('  \\item[$ \\Gamma $] Função gama');
      out('\\end{simbolos}');
      out('');
    }
    out('\\pdfbookmark[0]{\\contentsname}{toc}');
    out('\\tableofcontents*');
    out('\\cleardoublepage');
    out('');
    out('% ----------------------------- textuais -----------------------------');
    out('\\textual');
    chapters.forEach(function (fl) {
      out('\\include{capitulos/' + fl.nome + '}   % ' + U.trim(fl.titulo));
    });
    out('');
    out('% ---------------------------- pós-textuais --------------------------');
    out('\\postextual');
    out('\\bibliography{referencias}');
    out('');
    post.forEach(function (fl) {
      var apx = /apendice/.test(fl.nome), anx = /anexo/.test(fl.nome);
      if (apx || anx) {
        var env = apx ? 'apendicesenv' : 'anexosenv';
        var cmd = apx ? '\\partapendices' : '\\partanexos';
        out('\\begin{' + env + '}');
        out('  ' + cmd);
        out('  \\input{postextual/' + fl.nome + '}');
        out('\\end{' + env + '}');
      } else {
        out('\\input{postextual/' + fl.nome + '}');
      }
      out('');
    });
    out('\\end{document}');

    return lines.join('\n') + '\n';
  }

  var PRE_ENV = {
    dedicatoria: 'dedicatoria',
    agradecimentos: 'agradecimentos',
    epigrafe: 'epigrafe'
  };

  /* -------------------------------------------------------- main.tex USPSC -- */

  function mainUspsc(project, chapters, pre, post) {
    var meta = project.meta;
    var op = project.opcoes || {};
    var nivel = M.nivel(meta.nivel);
    var lines = [];
    var out = lines.push.bind(lines);

    out('% =====================================================================');
    out('% ' + U.trim(meta.titulo));
    out('% ' + nivel.tipoTrabalho + ' — gerado pelo Portal TCC ABNT (modelo USPSC)');
    out('% IMPORTANTE: copie a pasta USPSC-classe/ do Pacote USPSC oficial para');
    out('% a raiz deste projeto antes de compilar.');
    out('% =====================================================================');
    out('\\documentclass[');
    out('12pt,');
    out('openright,');
    out(op.frenteEVerso ? 'twoside,' : 'oneside,');
    out('a4paper,');
    out('chapter=TITLE,');
    out('english,');
    out('brazil');
    out(']{USPSC-classe/USPSC}');
    out('');
    out('\\usepackage[T1]{fontenc}');
    out('\\usepackage[utf8]{inputenc}');
    out('\\usepackage{lmodern}');
    out('\\usepackage{lastpage}');
    out('\\usepackage{indentfirst}');
    out('\\usepackage{graphicx}');
    out('\\usepackage{booktabs}');
    out('\\usepackage{float}');
    out('\\usepackage{microtype}');
    out('\\usepackage{amsmath}');
    out('\\usepackage{amssymb}');
    out('');
    out(op.citacao === 'num'
      ? '\\usepackage[num, abnt-emphasize=bf]{abntex2cite}\n\\bibliographystyle{USPSC-classe/abntex2-num-USPSC}'
      : '\\usepackage[alf, abnt-emphasize=bf, abnt-thesis-year=both]{abntex2cite}\n\\bibliographystyle{USPSC-classe/abntex2-alf-USPSC}');
    out('');
    out('\\titulo{' + tituloCompleto(meta) + '}');
    out('\\autor{' + metaEsc(meta.autor) + '}');
    out('\\local{' + (metaEsc(meta.cidade) || '[Cidade]') + '}');
    out('\\data{' + metaEsc(meta.ano) + '}');
    out('\\instituicao{' + (metaEsc(meta.instituicao) || '[Instituição]') + '}');
    out('\\tipotrabalho{' + metaEsc(meta.tipoTrabalho || nivel.tipoTrabalho) + '}');
    out('\\preambulo{' + preambulo(project) + '}');
    out('\\orientador{' + nomeComTitulo(meta.orientadorTitulo, meta.orientador, '[Orientador]') + '}');
    if (U.trim(meta.coorientador)) out('\\coorientador{' + nomeComTitulo(meta.coorientadorTitulo, meta.coorientador, '') + '}');
    out('\\curso{' + metaEsc(meta.curso) + '}');
    out('\\area{' + (metaEsc(meta.area) || metaEsc(meta.curso)) + '}');
    out('');
    out('\\begin{document}');
    out('\\selectlanguage{brazil}');
    out('\\frenchspacing');
    out('\\pretextual');
    out('\\imprimircapa');
    out('\\imprimirfolhaderosto' + (op.frenteEVerso ? '*' : ''));
    out('');
    pre.forEach(function (fl) { out('\\input{pretextual/' + fl.nome + '}'); });
    out('');
    out(resumoEnv(project));
    out('');
    if (op.listaFiguras) out('\\pdfbookmark[0]{\\listfigurename}{lof}\n\\listoffigures*\n\\cleardoublepage');
    if (op.listaTabelas) out('\\pdfbookmark[0]{\\listtablename}{lot}\n\\listoftables*\n\\cleardoublepage');
    out('\\pdfbookmark[0]{\\contentsname}{toc}');
    out('\\tableofcontents*');
    out('\\cleardoublepage');
    out('');
    out('\\textual');
    chapters.forEach(function (fl) {
      out('\\include{capitulos/' + fl.nome + '}   % ' + U.trim(fl.titulo));
    });
    out('');
    out('\\postextual');
    out('\\bibliography{referencias}');
    post.forEach(function (fl) { out('\\input{postextual/' + fl.nome + '}'); });
    out('\\end{document}');
    return lines.join('\n') + '\n';
  }

  /* ------------------------------------------------------------- fachada --- */

  /**
   * Monta o projeto LaTeX completo.
   * Retorna { files: [{path, content}], main, bib, chapters }
   */
  L.buildProject = function (project, refs) {
    var chapters = L.chapterFiles(project);
    var pre = extraFiles(project, 'pretextual', 'pretextual');
    var post = extraFiles(project, 'postextual', 'postextual');
    var engine = (project.opcoes && project.opcoes.engine) || 'abntex2';
    var main = engine === 'uspsc'
      ? mainUspsc(project, chapters, pre, post)
      : mainAbntex2(project, chapters, pre, post);

    var usadas = L.usedReferences(project, refs);
    var bib = P.BibTeX.file(usadas, U.trim(project.meta.titulo));

    var files = [{ path: 'main.tex', content: main }, { path: 'referencias.bib', content: bib }];

    chapters.forEach(function (fl) {
      files.push({ path: 'capitulos/' + fl.nome + '.tex', content: fl.conteudo });
    });
    pre.forEach(function (fl) {
      files.push({ path: 'pretextual/' + fl.nome + '.tex', content: fl.conteudo });
    });
    post.forEach(function (fl) {
      files.push({ path: 'postextual/' + fl.nome + '.tex', content: fl.conteudo });
    });

    files.push({
      path: 'pretextual/folha-de-aprovacao.tex',
      content: folhaAprovacao(project)
    });
    if ((project.opcoes || {}).errata) {
      files.push({
        path: 'pretextual/errata.tex',
        content: '% Errata: elemento opcional, inserido após a folha de rosto.\n' +
          'Folha \\quad Linha \\quad Onde se lê \\quad Leia-se\n'
      });
    }
    files.push({ path: 'figuras/LEIA-ME.txt', content: 'Coloque nesta pasta as imagens usadas com [fig: arquivo.png | legenda | fonte].\n' });
    files.push({ path: 'README.md', content: readme(project, engine) });

    return { files: files, main: main, bib: bib, chapters: chapters, pre: pre, post: post };
  };

  function folhaAprovacao(project) {
    var meta = project.meta;
    var nivel = M.nivel(meta.nivel);
    var linhas = [
      '% Folha de aprovação — substitua pelo PDF assinado pela banca após a defesa.',
      '\\begin{center}',
      '  \\textbf{' + metaEsc(U.upper(meta.autor || 'Nome do autor')) + '}',
      '',
      '  \\vspace{1cm}',
      '',
      '  \\textbf{' + tituloCompleto(meta) + '}',
      '\\end{center}',
      '',
      '\\vspace{2cm}',
      '\\noindent ' + metaEsc(nivel.tipoTrabalho) + ' aprovado em \\rule{3cm}{0.4pt} de ' +
        '\\rule{3cm}{0.4pt} de ' + (metaEsc(meta.ano) || '\\rule{1.5cm}{0.4pt}') + '.',
      '',
      '\\vspace{2cm}',
      '\\noindent \\textbf{Banca examinadora}',
      ''
    ];

    membroBanca(linhas,
      nomeComTitulo(meta.orientadorTitulo, meta.orientador, 'Prof. Dr. (nome do orientador)') + ' --- orientador(a)',
      metaEsc(meta.instituicao) || '(instituição)');
    membroBanca(linhas, 'Prof. Dr. (nome do examinador)', '(instituição)');
    membroBanca(linhas, 'Prof. Dr. (nome do examinador)', '(instituição)');

    return linhas.join('\n');
  }

  /**
   * Cada assinatura da banca é composta por parágrafos, não por \\.
   * Uma quebra \\ seguida de linha iniciada por colchete é lida pelo LaTeX como
   * o argumento opcional de espaçamento (\\[dimensão]) e aborta a compilação —
   * foi o que aconteceu com os antigos marcadores "[Instituição]".
   */
  function membroBanca(linhas, nome, instituicao) {
    linhas.push('\\vspace{1.5cm}');
    linhas.push('\\noindent \\rule{10cm}{0.4pt}');
    linhas.push('');
    linhas.push('\\noindent ' + nome);
    linhas.push('');
    linhas.push('\\noindent ' + instituicao);
    linhas.push('');
  }

  function readme(project, engine) {
    var meta = project.meta;
    return [
      '# ' + U.trim(meta.titulo),
      '',
      '- **Autor:** ' + (U.trim(meta.autor) || '—'),
      '- **Tipo:** ' + U.trim(meta.tipoTrabalho),
      '- **Instituição:** ' + (U.trim(meta.instituicao) || '—'),
      '- **Curso/Programa:** ' + (U.trim(meta.curso) || '—'),
      '- **Orientação:** ' + (U.trim(meta.orientador) || '—'),
      '- **Ano:** ' + U.trim(meta.ano),
      '',
      'Projeto gerado pelo **Portal TCC ABNT** em ' + U.fmtDateTime(U.now()) + '.',
      '',
      '## Como compilar no Overleaf',
      '',
      '1. Acesse overleaf.com e escolha **New Project → Upload Project**.',
      '2. Envie este arquivo `.zip` sem descompactar.',
      '3. Defina `main.tex` como documento principal (Menu → Main document).',
      '4. Em **Menu → Compiler**, selecione `pdfLaTeX`.',
      engine === 'uspsc'
        ? '5. Copie a pasta `USPSC-classe/` do Pacote USPSC oficial para a raiz do projeto.'
        : '5. A classe `abntex2` já está disponível no Overleaf — nada a instalar.',
      '6. Clique em **Recompile**. Para atualizar as citações: `pdflatex` → `bibtex` → `pdflatex` (2x).',
      '',
      '## Como compilar localmente',
      '',
      '```bash',
      'pdflatex main',
      'bibtex main',
      'pdflatex main',
      'pdflatex main',
      '```',
      '',
      '## Estrutura',
      '',
      '```',
      'main.tex            documento principal (preâmbulo + montagem)',
      'capitulos/          um arquivo por capítulo',
      'pretextual/         dedicatória, agradecimentos, epígrafe, folha de aprovação',
      'postextual/         apêndices e anexos',
      'referencias.bib     referências em BibTeX (ABNT NBR 6023)',
      'figuras/            imagens',
      '```',
      '',
      '## Citações',
      '',
      '| Marcação no portal | LaTeX gerado | Resultado ABNT |',
      '|---|---|---|',
      '| `[@chave]` | `\\cite{chave}` | (SOBRENOME, ano) |',
      '| `[@@chave]` | `\\citeonline{chave}` | Sobrenome (ano) |',
      '| `[@chave, p. 45]` | `\\cite[p.~45]{chave}` | (SOBRENOME, ano, p. 45) |',
      ''
    ].join('\n');
  }

  /** Referências efetivamente citadas nos blocos + as marcadas como usadas. */
  L.usedReferences = function (project, refs) {
    refs = refs || [];
    var keys = L.citedKeys(project);
    var manual = project.refsUsadas || [];
    var out = refs.filter(function (r) {
      return keys.indexOf(r.chave) > -1 || manual.indexOf(r.id) > -1;
    });
    return out.length ? out : refs.slice();
  };

  /** Chaves citadas no corpo do trabalho. */
  L.citedKeys = function (project) {
    var text = (project.blocks || []).map(function (b) { return b.conteudo || ''; }).join('\n');
    var keys = [];
    var re = /\[@{1,2}([A-Za-z0-9:_\-+.,;\s]+?)\]/g;
    var m;
    while ((m = re.exec(text))) {
      U.trim(m[1]).split(',')[0].split(';').forEach(function (k) {
        var key = U.trim(k).replace(/\s+/g, '');
        if (key && keys.indexOf(key) === -1) keys.push(key);
      });
    }
    return keys;
  };

  P.LaTeX = L;
})(window.Portal = window.Portal || {});
