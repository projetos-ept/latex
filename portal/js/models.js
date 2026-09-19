/* ==========================================================================
   Portal TCC ABNT - modelos de dados
   Define os tipos de referência (campos, rótulos e validação) e as fábricas
   de projeto / bloco / referência usadas por todo o portal.
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;
  var M = {};

  /* ------------------------------------------------------- níveis de TCC -- */

  M.NIVEIS = {
    graduacao: {
      id: 'graduacao',
      label: 'Graduação (TCC / Monografia)',
      curto: 'Graduação',
      tipoTrabalho: 'Trabalho de Conclusão de Curso',
      grau: 'Bacharel',
      preambulo: 'Trabalho de Conclusão de Curso apresentado ao curso de {curso} da {instituicao}, como requisito parcial para obtenção do título de {grau} em {area}.',
      bibType: 'mastersthesis',
      bibLabel: 'Trabalho de Conclusão de Curso (Graduação em {area})'
    },
    especializacao: {
      id: 'especializacao',
      label: 'Pós-graduação lato sensu (Especialização)',
      curto: 'Especialização',
      tipoTrabalho: 'Monografia de Especialização',
      grau: 'Especialista',
      preambulo: 'Monografia apresentada ao curso de Especialização em {area} da {instituicao}, como requisito parcial para obtenção do título de {grau} em {area}.',
      bibType: 'mastersthesis',
      bibLabel: 'Monografia (Especialização em {area})'
    },
    mestrado: {
      id: 'mestrado',
      label: 'Pós-graduação stricto sensu (Mestrado)',
      curto: 'Mestrado',
      tipoTrabalho: 'Dissertação de Mestrado',
      grau: 'Mestre',
      preambulo: 'Dissertação apresentada ao Programa de Pós-Graduação em {area} da {instituicao}, como requisito parcial para obtenção do título de {grau} em {area}.',
      bibType: 'mastersthesis',
      bibLabel: 'Dissertação (Mestrado em {area})'
    },
    doutorado: {
      id: 'doutorado',
      label: 'Pós-graduação stricto sensu (Doutorado)',
      curto: 'Doutorado',
      tipoTrabalho: 'Tese de Doutorado',
      grau: 'Doutor',
      preambulo: 'Tese apresentada ao Programa de Pós-Graduação em {area} da {instituicao}, como requisito parcial para obtenção do título de {grau} em {area}.',
      bibType: 'phdthesis',
      bibLabel: 'Tese (Doutorado em {area})'
    }
  };

  M.nivel = function (id) { return M.NIVEIS[id] || M.NIVEIS.graduacao; };

  /* --------------------------------------------------- tipos de referência */
  /* Cada campo: key, label, type, req?, hint?, span? (ocupa a linha toda)   */

  function f(key, label, type, extra) {
    return Object.assign({ key: key, label: label, type: type || 'text' }, extra || {});
  }

  var CAMPOS_WEB = [
    f('url', 'Endereço (URL)', 'url', { span: true }),
    f('acesso', 'Data de acesso', 'date'),
    f('doi', 'DOI', 'text')
  ];

  M.REF_TYPES = {
    livro: {
      id: 'livro', label: 'Livro', icon: 'book', bib: 'book',
      campos: [
        f('autores', 'Autores', 'authors', { req: true, span: true, hint: 'Um autor por linha, no formato "Sobrenome, Nome"' }),
        f('titulo', 'Título', 'text', { req: true, span: true }),
        f('subtitulo', 'Subtítulo', 'text', { span: true }),
        f('edicao', 'Edição', 'text', { hint: 'Apenas o número. Ex.: 3' }),
        f('volume', 'Volume', 'text'),
        f('local', 'Local (cidade)', 'text', { req: true }),
        f('editora', 'Editora', 'text', { req: true }),
        f('ano', 'Ano', 'text', { req: true }),
        f('totalPaginas', 'Total de páginas', 'text'),
        f('serie', 'Série / Coleção', 'text'),
        f('isbn', 'ISBN', 'text'),
        f('tradutor', 'Tradução de', 'text')
      ].concat(CAMPOS_WEB)
    },

    artigo: {
      id: 'artigo', label: 'Artigo de periódico', icon: 'book', bib: 'article',
      campos: [
        f('autores', 'Autores', 'authors', { req: true, span: true }),
        f('titulo', 'Título do artigo', 'text', { req: true, span: true }),
        f('periodico', 'Periódico / Revista', 'text', { req: true, span: true }),
        f('local', 'Local', 'text'),
        f('volume', 'Volume', 'text'),
        f('numero', 'Número / Fascículo', 'text'),
        f('paginas', 'Páginas', 'text', { hint: 'Ex.: 45-62' }),
        f('mes', 'Mês', 'text'),
        f('ano', 'Ano', 'text', { req: true }),
        f('issn', 'ISSN', 'text')
      ].concat(CAMPOS_WEB)
    },

    site: {
      id: 'site', label: 'Site / Página web', icon: 'book', bib: 'misc',
      campos: [
        f('autores', 'Autor / Responsável', 'authors', { span: true, hint: 'Pessoa, instituição ou deixe vazio para iniciar pelo título' }),
        f('titulo', 'Título da página', 'text', { req: true, span: true }),
        f('nomeSite', 'Nome do site / Publicador', 'text', { span: true }),
        f('local', 'Local', 'text'),
        f('ano', 'Ano', 'text', { req: true }),
        f('dataPublicacao', 'Data de publicação', 'text', { hint: 'Ex.: 12 mar. 2025' }),
        f('url', 'Endereço (URL)', 'url', { req: true, span: true }),
        f('acesso', 'Data de acesso', 'date', { req: true })
      ]
    },

    legislacao: {
      id: 'legislacao', label: 'Legislação', icon: 'book', bib: 'misc',
      campos: [
        f('jurisdicao', 'Jurisdição / Órgão', 'text', { req: true, span: true, hint: 'Ex.: BRASIL; SÃO PAULO (Estado)' }),
        f('tipoNorma', 'Tipo de norma', 'text', { req: true, hint: 'Lei, Decreto, Resolução, Portaria…' }),
        f('numero', 'Número', 'text', { req: true }),
        f('data', 'Data', 'text', { hint: 'Ex.: 19 de fevereiro de 1998' }),
        f('ano', 'Ano', 'text', { req: true }),
        f('ementa', 'Ementa', 'textarea', { span: true }),
        f('publicacao', 'Veículo de publicação', 'text', { span: true, hint: 'Ex.: Diário Oficial da União' }),
        f('local', 'Local', 'text'),
        f('secao', 'Seção / Página', 'text')
      ].concat(CAMPOS_WEB.slice(0, 2))
    },

    norma: {
      id: 'norma', label: 'Norma técnica', icon: 'book', bib: 'manual',
      campos: [
        f('instituicao', 'Instituição', 'text', { req: true, span: true, hint: 'Ex.: ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS' }),
        f('codigo', 'Código da norma', 'text', { req: true, hint: 'Ex.: NBR 14724' }),
        f('ano', 'Ano', 'text', { req: true }),
        f('titulo', 'Título / Objeto', 'text', { req: true, span: true }),
        f('local', 'Local', 'text'),
        f('editora', 'Editora', 'text'),
        f('totalPaginas', 'Total de páginas', 'text')
      ].concat(CAMPOS_WEB.slice(0, 2))
    },

    trabalho: {
      id: 'trabalho', label: 'Trabalho acadêmico (TCC, dissertação, tese)', icon: 'book', bib: 'thesis',
      campos: [
        f('autores', 'Autor', 'authors', { req: true, span: true }),
        f('titulo', 'Título', 'text', { req: true, span: true }),
        f('subtitulo', 'Subtítulo', 'text', { span: true }),
        f('grau', 'Natureza do trabalho', 'select', {
          req: true,
          options: ['Trabalho de Conclusão de Curso', 'Monografia', 'Dissertação', 'Tese'],
          hint: 'Aparece como "Dissertação (Mestrado em …)"'
        }),
        f('nivel', 'Nível', 'select', { options: ['Graduação', 'Especialização', 'Mestrado', 'Doutorado'] }),
        f('curso', 'Curso / Programa', 'text', { span: true }),
        f('instituicao', 'Instituição', 'text', { req: true, span: true }),
        f('local', 'Local', 'text'),
        f('ano', 'Ano', 'text', { req: true }),
        f('totalPaginas', 'Total de folhas', 'text'),
        f('orientador', 'Orientador', 'text', { span: true })
      ].concat(CAMPOS_WEB)
    },

    capitulo: {
      id: 'capitulo', label: 'Capítulo de livro', icon: 'book', bib: 'incollection',
      campos: [
        f('autores', 'Autores do capítulo', 'authors', { req: true, span: true }),
        f('titulo', 'Título do capítulo', 'text', { req: true, span: true }),
        f('organizadores', 'Organizadores da obra', 'authors', { span: true, hint: 'Deixe vazio se a obra tem os mesmos autores' }),
        f('papelOrganizador', 'Papel', 'select', { options: ['org.', 'ed.', 'coord.', 'comp.'] }),
        f('tituloObra', 'Título da obra', 'text', { req: true, span: true }),
        f('edicao', 'Edição', 'text'),
        f('volume', 'Volume', 'text'),
        f('local', 'Local', 'text', { req: true }),
        f('editora', 'Editora', 'text', { req: true }),
        f('ano', 'Ano', 'text', { req: true }),
        f('paginas', 'Páginas do capítulo', 'text', { req: true, hint: 'Ex.: 101-128' })
      ].concat(CAMPOS_WEB)
    },

    evento: {
      id: 'evento', label: 'Trabalho em evento', icon: 'book', bib: 'inproceedings',
      campos: [
        f('autores', 'Autores', 'authors', { req: true, span: true }),
        f('titulo', 'Título do trabalho', 'text', { req: true, span: true }),
        f('nomeEvento', 'Nome do evento', 'text', { req: true, span: true }),
        f('numeroEvento', 'Edição do evento', 'text', { hint: 'Ex.: 12 (para 12.)' }),
        f('anoEvento', 'Ano de realização', 'text'),
        f('localEvento', 'Local de realização', 'text'),
        f('tituloAnais', 'Publicação', 'text', { span: true, hint: 'Ex.: Anais […]; Proceedings […]' }),
        f('local', 'Local da publicação', 'text'),
        f('editora', 'Editora / Sociedade', 'text'),
        f('ano', 'Ano da publicação', 'text', { req: true }),
        f('paginas', 'Páginas', 'text')
      ].concat(CAMPOS_WEB)
    },

    video: {
      id: 'video', label: 'Vídeo / Mídia audiovisual', icon: 'book', bib: 'misc',
      campos: [
        f('autores', 'Autor / Responsável', 'authors', { span: true }),
        f('titulo', 'Título', 'text', { req: true, span: true }),
        f('plataforma', 'Plataforma / Canal', 'text', { req: true, hint: 'Ex.: YouTube, Vimeo, TV Escola' }),
        f('local', 'Local', 'text'),
        f('ano', 'Ano', 'text', { req: true }),
        f('duracao', 'Duração', 'text', { hint: 'Ex.: 14 min' }),
        f('url', 'Endereço (URL)', 'url', { req: true, span: true }),
        f('acesso', 'Data de acesso', 'date', { req: true })
      ]
    }
  };

  M.refType = function (id) { return M.REF_TYPES[id] || M.REF_TYPES.livro; };
  M.refTypeList = function () {
    return Object.keys(M.REF_TYPES).map(function (k) { return M.REF_TYPES[k]; });
  };

  /* ------------------------------------------------------------- fábricas -- */

  M.newProject = function (data) {
    data = data || {};
    var nivelId = data.nivel || 'graduacao';
    var nivel = M.nivel(nivelId);
    return {
      id: U.uid('prj'),
      createdAt: U.now(),
      updatedAt: U.now(),
      meta: {
        titulo: data.titulo || 'Novo trabalho acadêmico',
        subtitulo: data.subtitulo || '',
        autor: data.autor || '',
        nivel: nivelId,
        tipoTrabalho: data.tipoTrabalho || nivel.tipoTrabalho,
        grau: data.grau || nivel.grau,
        instituicao: data.instituicao || '',
        unidade: data.unidade || '',
        curso: data.curso || '',
        area: data.area || data.curso || '',
        orientador: data.orientador || '',
        orientadorTitulo: data.orientadorTitulo || 'Prof. Dr.',
        coorientador: data.coorientador || '',
        coorientadorTitulo: data.coorientadorTitulo || 'Prof. Dr.',
        cidade: data.cidade || '',
        ano: data.ano || String(U.year()),
        preambulo: data.preambulo || '',
        palavrasChave: data.palavrasChave || [],
        keywords: data.keywords || [],
        resumo: '',
        abstract: '',
        idioma: 'pt'
      },
      opcoes: {
        engine: (P.config && P.config.defaultEngine) || 'abntex2',
        citacao: (P.config && P.config.defaultCitationStyle) || 'alf',
        frenteEVerso: nivelId === 'mestrado' || nivelId === 'doutorado',
        listaFiguras: true,
        listaTabelas: true,
        listaQuadros: false,
        listaSiglas: true,
        listaSimbolos: false,
        errata: false,
        fichaCatalografica: nivelId === 'mestrado' || nivelId === 'doutorado'
      },
      blocks: [],
      refsUsadas: [],
      historico: []
    };
  };

  M.newBlock = function (data) {
    data = data || {};
    return {
      id: U.uid('blk'),
      key: data.key || U.slug(data.titulo || 'bloco', '_'),
      titulo: data.titulo || 'Novo bloco',
      tipo: data.tipo || 'capitulo',       // pretextual | capitulo | secao | postextual
      nivel: data.nivel || 1,              // 1 = capítulo, 2 = seção, 3 = subseção
      arquivo: data.arquivo || U.slug(data.titulo || 'bloco'),
      conteudo: data.conteudo || '',
      dica: data.dica || '',
      obrigatorio: !!data.obrigatorio,
      incluir: data.incluir !== false,
      numerado: data.numerado !== false,
      comando: data.comando || '',         // comando LaTeX especial (ex.: \\imprimircapa)
      versao: 1,
      updatedAt: U.now(),
      historico: []
    };
  };

  M.newReference = function (data) {
    data = data || {};
    return {
      id: U.uid('ref'),
      tipo: data.tipo || 'livro',
      chave: data.chave || '',
      campos: data.campos || {},
      tags: data.tags || [],
      colecao: data.colecao || '',
      notas: data.notas || '',
      favorito: !!data.favorito,
      createdAt: U.now(),
      updatedAt: U.now()
    };
  };

  /** Campos obrigatórios ausentes em uma referência. */
  M.validateReference = function (ref) {
    var tipo = M.refType(ref.tipo);
    var faltando = [];
    tipo.campos.forEach(function (campo) {
      if (!campo.req) return;
      var v = ref.campos[campo.key];
      if (campo.type === 'authors') {
        if (!v || !v.length) faltando.push(campo.label);
      } else if (!U.trim(v)) {
        faltando.push(campo.label);
      }
    });
    return faltando;
  };

  /* --------------------------------------------------------------- autores */

  /** "Silva, João Carlos" | "João Carlos Silva" -> {sobrenome, nomes, bruto} */
  M.parseAuthor = function (line) {
    var raw = U.trim(line);
    if (!raw) return null;
    if (raw.indexOf(',') > -1) {
      var parts = raw.split(',');
      return { sobrenome: U.trim(parts[0]), nomes: U.trim(parts.slice(1).join(',')), bruto: raw };
    }
    var tokens = raw.split(/\s+/);
    if (tokens.length === 1) return { sobrenome: tokens[0], nomes: '', bruto: raw, instituicao: true };
    var sobrenome = tokens.pop();
    return { sobrenome: sobrenome, nomes: tokens.join(' '), bruto: raw };
  };

  M.parseAuthors = function (text) {
    if (Array.isArray(text)) {
      return text.map(function (a) {
        return typeof a === 'string' ? M.parseAuthor(a) : a;
      }).filter(Boolean);
    }
    return String(text || '')
      .split(/\r?\n|;/)
      .map(M.parseAuthor)
      .filter(Boolean);
  };

  M.authorsToText = function (list) {
    return (list || []).map(function (a) {
      if (!a) return '';
      if (typeof a === 'string') return a;
      return a.nomes ? a.sobrenome + ', ' + a.nomes : a.sobrenome;
    }).filter(Boolean).join('\n');
  };

  P.M = M;
})(window.Portal = window.Portal || {});
