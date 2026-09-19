/* ==========================================================================
   Portal TCC ABNT - formatação de referências (NBR 6023:2018)
   e chamadas de citação (NBR 10520:2023).
   Gera HTML (para a biblioteca) e texto puro (para copiar).
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;
  var A = {};

  var ET_AL_LIMIT = 3; // até 3 autores são listados; a partir de 4 usa "et al."

  /* ----------------------------------------------------------- utilidades - */

  function isBlank(v) { return !U.trim(v); }

  /** Autor no formato ABNT: SOBRENOME, Nome. */
  function oneAuthor(a) {
    if (!a) return '';
    if (typeof a === 'string') a = M.parseAuthor(a);
    if (!a) return '';
    var sobre = U.upper(U.trim(a.sobrenome));
    if (!a.nomes) return sobre;
    return sobre + ', ' + U.trim(a.nomes);
  }

  /** Lista de autores conforme NBR 6023 (com "et al." acima de 3). */
  A.authors = function (list, opts) {
    opts = opts || {};
    var arr = M.parseAuthors(list || []);
    if (!arr.length) return '';
    var out;
    if (arr.length > ET_AL_LIMIT && opts.etAl !== false) {
      out = oneAuthor(arr[0]) + ' <i>et al.</i>';
    } else {
      out = arr.map(oneAuthor).join('; ');
    }
    if (opts.papel) out += ' (' + opts.papel + ')';
    return out;
  };

  /** Sobrenome do primeiro autor em caixa alta (para chamadas de citação). */
  A.firstSurname = function (list) {
    var arr = M.parseAuthors(list || []);
    if (!arr.length) return '';
    return U.upper(U.trim(arr[0].sobrenome));
  };

  function dot(s) {
    var t = U.trim(s);
    if (!t) return '';
    return /[.!?]$/.test(t.replace(/<\/?[bi]>$/, '')) ? t : t + '.';
  }

  /** Une segmentos já pontuados, ignorando vazios. */
  function join(parts) {
    return parts.filter(function (p) { return U.trim(p); }).join(' ').replace(/\s+/g, ' ').trim();
  }

  function bold(s) { return '<b>' + s + '</b>'; }

  /** Título destacado em negrito + subtítulo sem destaque. */
  function titleHL(titulo, subtitulo) {
    var t = U.trim(titulo);
    if (!t) return '';
    var out = bold(t);
    if (U.trim(subtitulo)) out += ': ' + U.trim(subtitulo);
    return dot(out);
  }

  /** Título sem destaque (artigo, capítulo, trabalho em evento) + subtítulo. */
  function titlePlain(titulo, subtitulo) {
    var t = U.trim(titulo);
    if (!t) return '';
    return dot(U.trim(subtitulo) ? t + ': ' + U.trim(subtitulo) : t);
  }

  function edicao(v) {
    var t = U.trim(v);
    if (!t) return '';
    var n = t.replace(/[^\d]/g, '');
    return n ? n + '. ed.' : dot(t);
  }

  function imprenta(local, editora, ano) {
    var l = U.trim(local) || '[s.l.]';
    var e = U.trim(editora) || '[s.n.]';
    var a = U.trim(ano) || '[s.d.]';
    return l + ': ' + e + ', ' + a + '.';
  }

  function webTail(c) {
    var out = [];
    if (U.trim(c.doi)) out.push('DOI: ' + U.trim(c.doi) + '.');
    if (U.trim(c.url)) out.push('Disponível em: ' + U.trim(c.url) + '.');
    if (U.trim(c.acesso)) out.push('Acesso em: ' + U.fmtAcesso(c.acesso) + '.');
    return out.join(' ');
  }

  /* --------------------------------------------------- formatadores por tipo */

  var FMT = {
    livro: function (c) {
      return join([
        dot(A.authors(c.autores)),
        titleHL(c.titulo, c.subtitulo),
        U.trim(c.tradutor) ? dot('Tradução de ' + U.trim(c.tradutor)) : '',
        edicao(c.edicao),
        imprenta(c.local, c.editora, c.ano),
        U.trim(c.totalPaginas) ? U.trim(c.totalPaginas).replace(/[^\d\-–]/g, '') + ' p.' : '',
        U.trim(c.volume) ? 'v. ' + U.trim(c.volume) + '.' : '',
        U.trim(c.serie) ? '(' + U.trim(c.serie) + ').' : '',
        U.trim(c.isbn) ? 'ISBN ' + U.trim(c.isbn) + '.' : '',
        webTail(c)
      ]);
    },

    artigo: function (c) {
      var loc = [];
      if (U.trim(c.local)) loc.push(U.trim(c.local));
      if (U.trim(c.volume)) loc.push('v. ' + U.trim(c.volume));
      if (U.trim(c.numero)) loc.push('n. ' + U.trim(c.numero));
      if (U.trim(c.paginas)) loc.push('p. ' + U.trim(c.paginas));
      var data = [U.trim(c.mes), U.trim(c.ano)].filter(Boolean).join(' ');
      if (data) loc.push(data);
      return join([
        dot(A.authors(c.autores)),
        titlePlain(c.titulo, c.subtitulo),
        bold(U.trim(c.periodico)) + (loc.length ? ', ' + loc.join(', ') : '') + '.',
        U.trim(c.issn) ? 'ISSN ' + U.trim(c.issn) + '.' : '',
        webTail(c)
      ]);
    },

    site: function (c) {
      var au = A.authors(c.autores);
      var head = au ? dot(au) + ' ' + titleHL(c.titulo, c.subtitulo) : dot(bold(U.upper(U.trim(c.titulo))));
      var meio = [];
      if (U.trim(c.nomeSite)) meio.push(U.trim(c.nomeSite));
      if (U.trim(c.local)) meio.push(U.trim(c.local));
      meio.push(U.trim(c.dataPublicacao) || U.trim(c.ano));
      return join([head, dot(meio.filter(Boolean).join(', ')), webTail(c)]);
    },

    legislacao: function (c) {
      var norma = [U.trim(c.tipoNorma), U.trim(c.numero) ? 'nº ' + U.trim(c.numero) : '']
        .filter(Boolean).join(' ');
      if (U.trim(c.data)) norma += ', de ' + U.trim(c.data);
      var pub = [];
      if (U.trim(c.publicacao)) pub.push(bold(U.trim(c.publicacao)));
      if (U.trim(c.secao)) pub.push(U.trim(c.secao));
      if (U.trim(c.local)) pub.push(U.trim(c.local));
      pub.push(U.trim(c.ano));
      return join([
        dot(U.upper(U.trim(c.jurisdicao))),
        dot(norma),
        dot(U.trim(c.ementa)),
        dot(pub.filter(Boolean).join(', ')),
        webTail(c)
      ]);
    },

    norma: function (c) {
      var titulo = bold(U.trim(c.codigo)) + (U.trim(c.titulo) ? ': ' + U.trim(c.titulo) : '');
      return join([
        dot(U.upper(U.trim(c.instituicao))),
        dot(titulo),
        imprenta(c.local, c.editora || c.instituicao, c.ano),
        U.trim(c.totalPaginas) ? U.trim(c.totalPaginas).replace(/[^\d]/g, '') + ' p.' : '',
        webTail(c)
      ]);
    },

    trabalho: function (c) {
      var natureza = U.trim(c.grau) || 'Trabalho de Conclusão de Curso';
      var nivel = U.trim(c.nivel);
      var curso = U.trim(c.curso);
      var qual = natureza;
      if (nivel || curso) {
        qual += ' (' + [nivel, curso ? 'em ' + curso : ''].filter(Boolean).join(' ') + ')';
      }
      var origem = [qual, U.trim(c.instituicao), U.trim(c.local), U.trim(c.ano)]
        .filter(Boolean);
      return join([
        dot(A.authors(c.autores)),
        titleHL(c.titulo, c.subtitulo),
        U.trim(c.ano) ? U.trim(c.ano) + '.' : '',
        U.trim(c.totalPaginas) ? U.trim(c.totalPaginas).replace(/[^\d]/g, '') + ' f.' : '',
        dot(origem[0] + (origem.length > 1 ? ' – ' + origem.slice(1).join(', ') : '')),
        webTail(c)
      ]);
    },

    capitulo: function (c) {
      var orgs = c.organizadores && (Array.isArray(c.organizadores) ? c.organizadores.length : U.trim(c.organizadores))
        ? A.authors(c.organizadores, { papel: U.trim(c.papelOrganizador) || 'org.' })
        : A.authors(c.autores);
      return join([
        dot(A.authors(c.autores)),
        titlePlain(c.titulo, c.subtitulo),
        'In: ' + dot(orgs),
        titleHL(c.tituloObra, ''),
        edicao(c.edicao),
        imprenta(c.local, c.editora, c.ano),
        U.trim(c.volume) ? 'v. ' + U.trim(c.volume) + '.' : '',
        U.trim(c.paginas) ? 'p. ' + U.trim(c.paginas) + '.' : '',
        webTail(c)
      ]);
    },

    evento: function (c) {
      var ev = [U.upper(U.trim(c.nomeEvento))];
      if (U.trim(c.numeroEvento)) ev.push(U.trim(c.numeroEvento).replace(/[^\d]/g, '') + '.');
      if (U.trim(c.anoEvento)) ev.push(U.trim(c.anoEvento));
      if (U.trim(c.localEvento)) ev.push(U.trim(c.localEvento));
      var anais = U.trim(c.tituloAnais) || 'Anais [...]';
      return join([
        dot(A.authors(c.autores)),
        titlePlain(c.titulo, c.subtitulo),
        'In: ' + dot(ev.filter(Boolean).join(', ')),
        dot(bold(anais)),
        imprenta(c.local, c.editora, c.ano),
        U.trim(c.paginas) ? 'p. ' + U.trim(c.paginas) + '.' : '',
        webTail(c)
      ]);
    },

    video: function (c) {
      var au = A.authors(c.autores);
      var head = au ? dot(au) + ' ' + titleHL(c.titulo, '') : dot(bold(U.upper(U.trim(c.titulo))));
      var meio = [U.trim(c.plataforma), U.trim(c.local), U.trim(c.ano)].filter(Boolean).join(', ');
      return join([
        head,
        dot(meio),
        U.trim(c.duracao) ? 'Vídeo (' + U.trim(c.duracao) + ').' : 'Vídeo.',
        webTail(c)
      ]);
    }
  };

  /** Referência formatada em HTML (negrito/itálico preservados). */
  A.format = function (ref) {
    if (!ref) return '';
    var fmt = FMT[ref.tipo] || FMT.livro;
    var out = fmt(ref.campos || {});
    return out
      .replace(/\[\.\.\.\]/g, '\u0003')        // preserva a supressão "[...]"
      .replace(/\s+([,.;])/g, '$1')
      .replace(/\.{2,}/g, '.')
      .replace(/\u0003/g, '[...]')
      .trim();
  };

  /** Referência em texto puro (sem marcação). */
  A.formatPlain = function (ref) {
    return A.format(ref).replace(/<[^>]+>/g, '');
  };

  /* -------------------------------------------------------------- citações - */

  /** Sobrenome(s) para a chamada, ex.: "SILVA; SOUZA" ou "SILVA et al.". */
  function callAuthors(list, caps) {
    var arr = M.parseAuthors(list || []);
    if (!arr.length) return '';
    function nm(a) {
      var s = U.trim(a.sobrenome);
      return caps ? U.upper(s) : U.titleCase(s.toLowerCase());
    }
    if (arr.length > ET_AL_LIMIT) return nm(arr[0]) + ' et al.';
    return arr.map(nm).join(caps ? '; ' : '; ');
  }

  /** Entidade responsável de qualquer tipo de referência. */
  A.callName = function (ref, caps) {
    var c = ref.campos || {};
    var direto = c.jurisdicao || c.instituicao;
    if (direto) return caps ? U.upper(U.trim(direto)) : U.titleCase(U.trim(direto).toLowerCase());
    var au = callAuthors(c.autores, caps);
    if (au) return au;
    var t = U.trim(c.titulo || c.tituloObra);
    if (!t) return caps ? 'AUTOR DESCONHECIDO' : 'Autor desconhecido';
    var first = t.split(/\s+/)[0];
    return (caps ? U.upper(first) : first) + '...';
  };

  A.refYear = function (ref) {
    return U.trim((ref.campos || {}).ano) || U.trim((ref.campos || {}).anoEvento) || 's.d.';
  };

  /** Citação indireta: (SILVA, 2026) — opcionalmente com página. */
  A.citeIndirect = function (ref, pagina) {
    return '(' + A.callName(ref, true) + ', ' + A.refYear(ref) + (pagina ? ', p. ' + pagina : '') + ')';
  };

  /** Citação narrativa: Silva (2026). */
  A.citeNarrative = function (ref, pagina) {
    return A.callName(ref, false) + ' (' + A.refYear(ref) + (pagina ? ', p. ' + pagina : '') + ')';
  };

  P.ABNT = A;
})(window.Portal = window.Portal || {});
