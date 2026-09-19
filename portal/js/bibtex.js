/* ==========================================================================
   Portal TCC ABNT - motor BibTeX
   Converte referências do portal em entradas .bib compatíveis com abntex2cite
   e importa arquivos .bib existentes para a biblioteca.
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;
  var B = {};

  /* ---------------------------------------------------------------- chaves - */

  /** Gera a chave de citação (ex.: silva2026) evitando colisões. */
  B.makeKey = function (ref, existing) {
    var c = ref.campos || {};
    var base = '';
    var au = M.parseAuthors(c.autores || []);
    if (au.length) base = U.slug(au[0].sobrenome, '');
    if (!base) base = U.slug(c.jurisdicao || c.instituicao || c.plataforma || c.titulo || 'ref', '');
    base = base.replace(/[^a-z0-9]/g, '').slice(0, 18) || 'ref';
    var ano = U.trim(c.ano).replace(/[^\d]/g, '') || 'sd';
    var key = base + ano;
    var taken = {};
    (existing || []).forEach(function (r) {
      if (r.id !== ref.id && r.chave) taken[r.chave] = true;
    });
    if (!taken[key]) return key;
    var letters = 'abcdefghijklmnopqrstuvwxyz';
    for (var i = 0; i < letters.length; i++) {
      if (!taken[key + letters[i]]) return key + letters[i];
    }
    return key + Date.now().toString(36).slice(-3);
  };

  /* ------------------------------------------------------------- mapeamento */

  function bibAuthors(list) {
    var arr = M.parseAuthors(list || []);
    return arr.map(function (a) {
      return a.nomes ? a.sobrenome + ', ' + a.nomes : '{' + a.sobrenome + '}';
    }).join(' and ');
  }

  function clean(v) {
    return U.trim(v).replace(/[{}]/g, '').replace(/\s+/g, ' ');
  }

  function fullTitle(c) {
    var t = clean(c.titulo);
    return U.trim(c.subtitulo) ? t + ': ' + clean(c.subtitulo) : t;
  }

  function common(c, fields) {
    if (U.trim(c.doi)) fields.doi = clean(c.doi);
    if (U.trim(c.url)) fields.url = U.trim(c.url);
    if (U.trim(c.acesso)) fields.urlaccessdate = U.fmtAcesso(c.acesso);
    return fields;
  }

  var MAP = {
    livro: function (c) {
      return { type: 'book', fields: common(c, {
        author: bibAuthors(c.autores),
        title: fullTitle(c),
        edition: clean(c.edicao),
        volume: clean(c.volume),
        series: clean(c.serie),
        address: clean(c.local),
        publisher: clean(c.editora),
        year: clean(c.ano),
        pages: clean(c.totalPaginas),
        isbn: clean(c.isbn),
        translator: clean(c.tradutor)
      }) };
    },

    artigo: function (c) {
      return { type: 'article', fields: common(c, {
        author: bibAuthors(c.autores),
        title: fullTitle(c),
        journal: clean(c.periodico),
        address: clean(c.local),
        volume: clean(c.volume),
        number: clean(c.numero),
        pages: clean(c.paginas).replace(/[–—]/g, '--'),
        month: clean(c.mes),
        year: clean(c.ano),
        issn: clean(c.issn)
      }) };
    },

    site: function (c) {
      return { type: 'misc', fields: common(c, {
        author: bibAuthors(c.autores),
        title: fullTitle(c),
        organization: clean(c.nomeSite),
        address: clean(c.local),
        year: clean(c.ano),
        note: clean(c.dataPublicacao)
      }) };
    },

    legislacao: function (c) {
      var titulo = [clean(c.tipoNorma), clean(c.numero) ? 'nº ' + clean(c.numero) : '']
        .filter(Boolean).join(' ');
      if (U.trim(c.data)) titulo += ', de ' + clean(c.data);
      return { type: 'misc', fields: common(c, {
        author: '{' + clean(c.jurisdicao) + '}',
        title: titulo,
        note: clean(c.ementa),
        journal: clean(c.publicacao),
        address: clean(c.local),
        year: clean(c.ano),
        pages: clean(c.secao)
      }) };
    },

    norma: function (c) {
      return { type: 'manual', fields: common(c, {
        organization: clean(c.instituicao),
        author: '{' + clean(c.instituicao) + '}',
        title: clean(c.codigo) + (U.trim(c.titulo) ? ': ' + clean(c.titulo) : ''),
        address: clean(c.local),
        year: clean(c.ano),
        pages: clean(c.totalPaginas)
      }) };
    },

    trabalho: function (c) {
      var nivel = U.trim(c.nivel).toLowerCase();
      var type = nivel.indexOf('doutor') > -1 ? 'phdthesis' : 'mastersthesis';
      var natureza = clean(c.grau) || 'Trabalho de Conclusão de Curso';
      var qual = natureza;
      if (U.trim(c.nivel) || U.trim(c.curso)) {
        qual += ' (' + [clean(c.nivel), U.trim(c.curso) ? 'em ' + clean(c.curso) : '']
          .filter(Boolean).join(' ') + ')';
      }
      return { type: type, fields: common(c, {
        author: bibAuthors(c.autores),
        title: fullTitle(c),
        type: qual,
        school: clean(c.instituicao),
        address: clean(c.local),
        year: clean(c.ano),
        pages: clean(c.totalPaginas)
      }) };
    },

    capitulo: function (c) {
      var orgs = c.organizadores && (Array.isArray(c.organizadores) ? c.organizadores.length : U.trim(c.organizadores))
        ? bibAuthors(c.organizadores) : '';
      return { type: 'incollection', fields: common(c, {
        author: bibAuthors(c.autores),
        title: fullTitle(c),
        editor: orgs,
        booktitle: clean(c.tituloObra),
        edition: clean(c.edicao),
        volume: clean(c.volume),
        address: clean(c.local),
        publisher: clean(c.editora),
        year: clean(c.ano),
        pages: clean(c.paginas).replace(/[–—]/g, '--')
      }) };
    },

    evento: function (c) {
      var evento = clean(c.nomeEvento);
      if (U.trim(c.numeroEvento)) evento = clean(c.numeroEvento) + '. ' + evento;
      return { type: 'inproceedings', fields: common(c, {
        author: bibAuthors(c.autores),
        title: fullTitle(c),
        booktitle: (clean(c.tituloAnais) || 'Anais') + (evento ? ' do ' + evento : ''),
        organization: clean(c.editora),
        address: clean(c.localEvento) || clean(c.local),
        year: clean(c.ano) || clean(c.anoEvento),
        pages: clean(c.paginas).replace(/[–—]/g, '--')
      }) };
    },

    video: function (c) {
      return { type: 'misc', fields: common(c, {
        author: bibAuthors(c.autores),
        title: fullTitle(c),
        organization: clean(c.plataforma),
        address: clean(c.local),
        year: clean(c.ano),
        note: U.trim(c.duracao) ? 'Vídeo (' + clean(c.duracao) + ')' : 'Vídeo'
      }) };
    }
  };

  /** Uma entrada .bib formatada. */
  B.entry = function (ref) {
    var mapper = MAP[ref.tipo] || MAP.livro;
    var out = mapper(ref.campos || {});
    var key = ref.chave || B.makeKey(ref, []);
    var keys = Object.keys(out.fields).filter(function (k) { return U.trim(out.fields[k]); });
    var width = keys.reduce(function (m, k) { return Math.max(m, k.length); }, 0);
    var lines = keys.map(function (k) {
      var pad = new Array(width - k.length + 1).join(' ');
      return '  ' + k + pad + ' = {' + out.fields[k] + '}';
    });
    return '@' + out.type + '{' + key + ',\n' + lines.join(',\n') + '\n}';
  };

  /** Arquivo .bib completo para uma lista de referências. */
  B.file = function (refs, header) {
    var head = [
      '% ---------------------------------------------------------------',
      '% Arquivo de referências gerado pelo Portal TCC ABNT',
      '% ' + (header || 'Biblioteca de referências'),
      '% Gerado em: ' + U.fmtDateTime(U.now()),
      '% Padrão: ABNT NBR 6023:2018 via abntex2cite',
      '% ---------------------------------------------------------------',
      ''
    ].join('\n');
    return head + '\n' + (refs || []).map(B.entry).join('\n\n') + '\n';
  };

  /* --------------------------------------------------------------- importar */

  var BIB_TO_TIPO = {
    book: 'livro', inbook: 'capitulo', incollection: 'capitulo',
    article: 'artigo', misc: 'site', manual: 'norma',
    mastersthesis: 'trabalho', phdthesis: 'trabalho', monography: 'trabalho',
    inproceedings: 'evento', conference: 'evento', proceedings: 'evento',
    techreport: 'norma', unpublished: 'site', online: 'site', electronic: 'site'
  };

  /** Extrai as entradas de um texto .bib. Retorna [{type, key, fields}]. */
  B.parse = function (text) {
    var src = String(text || '');
    var entries = [];
    var re = /@(\w+)\s*\{/g;
    var m;
    while ((m = re.exec(src))) {
      var type = m[1].toLowerCase();
      if (type === 'comment' || type === 'preamble' || type === 'string') continue;
      var i = re.lastIndex, depth = 1, body = '';
      while (i < src.length && depth > 0) {
        var ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (!depth) break; }
        body += ch;
        i++;
      }
      re.lastIndex = i;
      var comma = body.indexOf(',');
      var key = U.trim(comma > -1 ? body.slice(0, comma) : body);
      var rest = comma > -1 ? body.slice(comma + 1) : '';
      entries.push({ type: type, key: key, fields: parseFields(rest) });
    }
    return entries;
  };

  function parseFields(body) {
    var fields = {};
    var i = 0;
    while (i < body.length) {
      while (i < body.length && /[\s,]/.test(body[i])) i++;
      var start = i;
      while (i < body.length && body[i] !== '=' && body[i] !== ',') i++;
      var name = U.trim(body.slice(start, i)).toLowerCase();
      if (body[i] !== '=') { i++; continue; }
      i++; // pula '='
      while (i < body.length && /\s/.test(body[i])) i++;
      var value = '';
      if (body[i] === '{') {
        var depth = 1; i++;
        while (i < body.length && depth > 0) {
          if (body[i] === '{') depth++;
          else if (body[i] === '}') { depth--; if (!depth) { i++; break; } }
          value += body[i]; i++;
        }
      } else if (body[i] === '"') {
        i++;
        while (i < body.length && body[i] !== '"') { value += body[i]; i++; }
        i++;
      } else {
        while (i < body.length && body[i] !== ',') { value += body[i]; i++; }
      }
      if (name) fields[name] = U.trim(value).replace(/\s+/g, ' ');
    }
    return fields;
  }

  /** Converte uma entrada .bib crua em referência do portal. */
  var RE_LEGISLACAO = /^(lei|decreto|portaria|resolu[çc][ãa]o|medida provis[óo]ria|emenda|instru[çc][ãa]o normativa)\b/i;

  B.toReference = function (entry) {
    var f = entry.fields || {};
    var tipo = BIB_TO_TIPO[entry.type] || 'livro';
    if (tipo === 'site' && !f.url && f.publisher) tipo = 'livro';
    if (tipo === 'site' && (RE_LEGISLACAO.test(U.trim(f.title)) || /di[áa]rio oficial/i.test(f.journal || ''))) {
      tipo = 'legislacao';
    }

    var titulo = f.title || '', subtitulo = '', codigo = '';
    var sep = titulo.indexOf(': ');
    if (tipo === 'norma') {
      // "NBR 14724: informação e documentação…" -> código + objeto da norma
      codigo = sep > -1 ? U.trim(titulo.slice(0, sep)) : U.trim(titulo);
      titulo = sep > -1 ? U.trim(titulo.slice(sep + 2)) : '';
    } else if (sep > -1) {
      subtitulo = U.trim(titulo.slice(sep + 2));
      titulo = U.trim(titulo.slice(0, sep));
    }

    // Autores entre chaves são entidades ("{Ministério da Saúde}") e não devem
    // ser quebrados em sobrenome/nome.
    var autores = (f.author || '').split(/\s+and\s+/)
      .map(function (s) { return U.trim(s); })
      .filter(Boolean)
      .map(function (s) {
        var entidade = /^\{.*\}$/.test(s);
        var limpo = s.replace(/^\{|\}$/g, '');
        return entidade ? { sobrenome: limpo, nomes: '', bruto: limpo, instituicao: true } : limpo;
      });

    // "Dissertação (Mestrado em Enfermagem)" -> natureza + nível + curso
    var grau = f.type || (entry.type === 'phdthesis' ? 'Tese' : entry.type === 'mastersthesis' ? 'Dissertação' : '');
    var nivelTrab = entry.type === 'phdthesis' ? 'Doutorado' : entry.type === 'mastersthesis' ? 'Mestrado' : '';
    var cursoTrab = '';
    var mGrau = /^([^(]+)\(([^)]*)\)/.exec(grau);
    if (mGrau) {
      grau = U.trim(mGrau[1]);
      var dentro = U.trim(mGrau[2]);
      var mEm = /^(.*?)\s+em\s+(.*)$/i.exec(dentro);
      if (mEm) { nivelTrab = U.trim(mEm[1]); cursoTrab = U.trim(mEm[2]); }
      else nivelTrab = dentro;
    }

    // Legislação: "Lei nº 9.394, de 20 de dezembro de 1996"
    var tipoNorma = '', numero = '', dataNorma = '';
    if (tipo === 'legislacao') {
      var mLei = /^([^\d]*?)\s*n?[ºo°.]*\s*([\d.\/-]+)?\s*(?:,\s*de\s+(.*))?$/i.exec(U.trim(f.title || ''));
      if (mLei) {
        tipoNorma = U.trim(mLei[1]);
        numero = U.trim(mLei[2] || '');
        dataNorma = U.trim(mLei[3] || '');
      }
    }

    var campos = {
      autores: M.parseAuthors(autores),
      titulo: titulo,
      subtitulo: subtitulo,
      ano: (f.year || '').replace(/[^\d]/g, ''),
      local: f.address || '',
      editora: f.publisher || f.organization || '',
      edicao: f.edition || '',
      volume: f.volume || '',
      numero: f.number || '',
      paginas: (f.pages || '').replace(/--/g, '-'),
      periodico: tipo === 'artigo' ? (f.journal || '') : '',
      curso: cursoTrab,
      totalPaginas: /^\d+$/.test(f.pages || '') ? f.pages : '',
      serie: f.series || '',
      isbn: f.isbn || '',
      issn: f.issn || '',
      doi: f.doi || '',
      url: f.url || '',
      acesso: f.urlaccessdate || '',
      nomeSite: tipo === 'site' ? (f.organization || f.publisher || '') : '',
      instituicao: f.school || (tipo === 'norma' ? (f.organization || '') : ''),
      jurisdicao: tipo === 'legislacao' ? U.trim((f.author || '').replace(/[{}]/g, '')) : '',
      tipoNorma: tipoNorma,
      numero: tipo === 'legislacao' ? numero : (f.number || ''),
      data: dataNorma,
      ementa: tipo === 'legislacao' ? (f.note || '') : '',
      publicacao: tipo === 'legislacao' ? (f.journal || '') : '',
      codigo: codigo,
      tituloObra: tipo === 'capitulo' ? (f.booktitle || '') : '',
      organizadores: f.editor ? M.parseAuthors(f.editor.split(/\s+and\s+/)) : [],
      nomeEvento: tipo === 'evento'
        ? U.trim(String(f.booktitle || '').replace(/^(anais|proceedings|atas)\s+(d[aoe]|of)\s+/i, '')) : '',
      tituloAnais: tipo === 'evento' && /^(anais|proceedings|atas)\b/i.test(f.booktitle || '')
        ? U.trim(String(f.booktitle).split(/\s+(d[aoe]|of)\s+/i)[0]) + ' [...]' : '',
      grau: grau,
      nivel: nivelTrab,
      plataforma: f.organization || '',
      notas: f.note || ''
    };

    var ref = M.newReference({ tipo: tipo, chave: entry.key, campos: campos, tags: ['importado'] });
    ref.notas = f.note || '';
    return ref;
  };

  B.import = function (text) {
    return B.parse(text).map(B.toReference);
  };

  P.BibTeX = B;
})(window.Portal = window.Portal || {});
