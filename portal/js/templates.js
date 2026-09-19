/* ==========================================================================
   Portal TCC ABNT - estruturas prontas de trabalho
   Cada nível (graduação, especialização, mestrado, doutorado) tem uma
   estrutura de blocos conforme a ABNT NBR 14724:2011.
   dica    -> texto de apoio exibido no editor (não vai para o LaTeX)
   roteiro -> esqueleto opcional que o autor pode inserir com um clique
   ========================================================================== */
(function (P) {
  'use strict';

  var T = {};

  function b(titulo, opts) {
    return Object.assign({ titulo: titulo, tipo: 'capitulo', nivel: 1 }, opts || {});
  }

  /* ------------------------------------------------------------ comuns ---- */

  var PRE = [
    b('Dedicatória', {
      tipo: 'pretextual', nivel: 1, arquivo: 'dedicatoria', obrigatorio: false, incluir: false,
      dica: 'Elemento opcional. Uma ou duas frases de homenagem, alinhadas à direita na parte inferior da página.'
    }),
    b('Agradecimentos', {
      tipo: 'pretextual', nivel: 1, arquivo: 'agradecimentos', obrigatorio: false, incluir: true,
      dica: 'Elemento opcional. Agradeça a quem contribuiu com a pesquisa: orientador, banca, instituição, agências de fomento (obrigatório citar bolsa/financiamento), família.'
    }),
    b('Epígrafe', {
      tipo: 'pretextual', nivel: 1, arquivo: 'epigrafe', obrigatorio: false, incluir: false,
      dica: 'Elemento opcional. Citação curta relacionada ao tema, com indicação de autoria.'
    })
  ];

  var POS = [
    b('Instrumento de coleta de dados', {
      tipo: 'postextual', nivel: 1, arquivo: 'apendices', obrigatorio: false, incluir: false,
      dica: 'Apêndice = material elaborado pelo próprio autor (questionário, roteiro de entrevista, termo de consentimento). O rótulo "APÊNDICE A" é gerado automaticamente: escreva só o título.'
    }),
    b('Documento complementar', {
      tipo: 'postextual', nivel: 1, arquivo: 'anexos', obrigatorio: false, incluir: false,
      dica: 'Anexo = material NÃO elaborado pelo autor (parecer do comitê de ética, tabelas de terceiros, legislação). O rótulo "ANEXO A" é gerado automaticamente.'
    })
  ];

  /* -------------------------------------------------------- introdução ---- */

  function introducao() {
    return [
      b('Introdução', {
        arquivo: 'introducao', obrigatorio: true,
        dica: 'Apresente o tema, o problema, os objetivos, a justificativa e a organização do trabalho. Escreva a introdução por último, quando o restante já estiver pronto.',
        roteiro: [
          'Contextualize o tema em dois ou três parágrafos, do geral para o específico, sempre com apoio da literatura [@chave].',
          '',
          '## Problema de pesquisa',
          '',
          'Formule o problema como pergunta clara e delimitada.',
          '',
          '## Objetivos',
          '',
          '### Objetivo geral',
          '',
          'Analisar/avaliar/propor ... (um único verbo no infinitivo).',
          '',
          '### Objetivos específicos',
          '',
          '- Identificar ...',
          '- Descrever ...',
          '- Comparar ...',
          '',
          '## Justificativa',
          '',
          'Explique a relevância científica, social e pessoal da pesquisa.',
          '',
          '## Organização do trabalho',
          '',
          'Descreva em um parágrafo o que cada capítulo apresenta.'
        ].join('\n')
      })
    ];
  }

  /* ------------------------------------------------------------ níveis ---- */

  var GRAD = introducao().concat([
    b('Fundamentação Teórica', {
      arquivo: 'fundamentacao', obrigatorio: true,
      dica: 'Revisão da literatura que sustenta a pesquisa. Organize por conceitos, não por autores. Toda afirmação precisa de citação: use [@chave] ou [@@chave].',
      roteiro: [
        '## Conceitos fundamentais',
        '',
        'Segundo [@@chave], o conceito de ... consolidou-se a partir de ...',
        '',
        '> Citação com mais de três linhas entra recuada em 4 cm, em corpo 10 e espaçamento simples [@chave, p. 45].',
        '',
        '## Trabalhos relacionados',
        '',
        '| Autor | Abordagem | Resultado |',
        '| Silva (2024) | Estudo de caso | Ganho de 18% |',
        '',
        '## Síntese da fundamentação',
        '',
        'Feche o capítulo mostrando a lacuna que a sua pesquisa preenche.'
      ].join('\n')
    }),
    b('Metodologia', {
      arquivo: 'metodologia', obrigatorio: true,
      dica: 'Descreva COMO a pesquisa foi feita, com detalhe suficiente para ser reproduzida. Use verbos no passado.',
      roteiro: [
        '## Classificação da pesquisa',
        '',
        'Quanto à natureza, abordagem (qualitativa/quantitativa), objetivos e procedimentos.',
        '',
        '## Local e participantes',
        '',
        '## Instrumentos e coleta de dados',
        '',
        '## Procedimentos de análise',
        '',
        '## Aspectos éticos',
        '',
        'Registre a aprovação do comitê de ética, quando aplicável.'
      ].join('\n')
    }),
    b('Resultados e Discussão', {
      arquivo: 'resultados', obrigatorio: true,
      dica: 'Apresente os dados (tabelas, quadros, figuras) e discuta-os confrontando com a fundamentação teórica.',
      roteiro: [
        '## Caracterização da amostra',
        '',
        '[tab: Perfil dos participantes | Dados da pesquisa (2026)]',
        '| Variável | n | % |',
        '| Feminino | 34 | 56,7 |',
        '| Masculino | 26 | 43,3 |',
        '',
        '## Análise dos resultados',
        '',
        '[fig: grafico-1.png | Distribuição dos resultados | Elaborado pelo autor (2026)]',
        '',
        '## Discussão',
        '',
        'Compare os achados com [@chave] e explique convergências e divergências.'
      ].join('\n')
    }),
    b('Considerações Finais', {
      arquivo: 'consideracoes', obrigatorio: true,
      dica: 'Retome o problema e os objetivos, sintetize as contribuições, aponte limitações e sugira trabalhos futuros. Não introduza citações novas nem dados inéditos.',
      roteiro: [
        'Retome o objetivo geral e responda ao problema de pesquisa.',
        '',
        '## Contribuições',
        '',
        '## Limitações',
        '',
        '## Trabalhos futuros'
      ].join('\n')
    })
  ]);

  var ESPEC = introducao().concat([
    b('Referencial Teórico', {
      arquivo: 'referencial', obrigatorio: true,
      dica: 'Na especialização o referencial costuma ser mais aplicado: privilegie literatura recente e documentos técnicos da área.'
    }),
    b('Percurso Metodológico', {
      arquivo: 'metodologia', obrigatorio: true,
      dica: 'Descreva o desenho do estudo, o campo, os sujeitos, os instrumentos e a análise.'
    }),
    b('Resultados e Discussão', { arquivo: 'resultados', obrigatorio: true,
      dica: 'Relacione os achados com a prática profissional da área.' }),
    b('Considerações Finais', { arquivo: 'consideracoes', obrigatorio: true,
      dica: 'Destaque as implicações práticas do estudo para o campo de atuação.' }),
    b('Produto Técnico-Tecnológico', {
      arquivo: 'produto', obrigatorio: false, incluir: false,
      dica: 'Alguns cursos lato sensu exigem um produto (cartilha, protocolo, curso). Descreva-o aqui.'
    })
  ]);

  var MEST = introducao().concat([
    b('Revisão da Literatura', {
      arquivo: 'revisao', obrigatorio: true,
      dica: 'Mapeie o estado da arte. Explicite as bases consultadas, o período e os critérios de inclusão/exclusão quando a revisão for sistemática ou integrativa.',
      roteiro: [
        '## Estratégia de busca',
        '',
        '| Base | Descritores | Período | Registros |',
        '| Scopus | "termo A" AND "termo B" | 2015-2026 | 214 |',
        '',
        '## Panorama dos estudos',
        '',
        '## Lacunas identificadas'
      ].join('\n')
    }),
    b('Fundamentação Teórica', { arquivo: 'fundamentacao', obrigatorio: true,
      dica: 'Aprofunde o arcabouço conceitual e os modelos teóricos que sustentam as hipóteses.' }),
    b('Materiais e Métodos', {
      arquivo: 'metodologia', obrigatorio: true,
      dica: 'Detalhe delineamento, amostragem, variáveis, instrumentos, protocolos, softwares e testes estatísticos (com nível de significância).',
      roteiro: [
        '## Delineamento do estudo',
        '',
        '## Amostra e amostragem',
        '',
        '## Variáveis e instrumentos',
        '',
        '## Procedimentos experimentais',
        '',
        '## Análise estatística',
        '',
        'Os dados foram analisados no software ..., adotando-se $p < 0{,}05$.',
        '',
        '## Aspectos éticos'
      ].join('\n')
    }),
    b('Resultados', { arquivo: 'resultados', obrigatorio: true,
      dica: 'Apenas os achados, sem interpretação. Cada tabela e figura deve ser chamada no texto.' }),
    b('Discussão', { arquivo: 'discussao', obrigatorio: true,
      dica: 'Interprete os resultados frente à literatura, aponte mecanismos explicativos e limitações metodológicas.' }),
    b('Conclusões', { arquivo: 'conclusoes', obrigatorio: true,
      dica: 'Conclusões diretas e ancoradas nos objetivos, seguidas de perspectivas futuras.' })
  ]);

  var DOUT = introducao().concat([
    b('Revisão da Literatura', { arquivo: 'revisao', obrigatorio: true,
      dica: 'Revisão ampla e crítica, capaz de sustentar o ineditismo da tese.' }),
    b('Fundamentação Teórica', { arquivo: 'fundamentacao', obrigatorio: true,
      dica: 'Construa o referencial que fundamenta as hipóteses e o modelo proposto.' }),
    b('Hipóteses e Proposta', {
      arquivo: 'proposta', obrigatorio: true,
      dica: 'Elemento central da tese: enuncie hipóteses e a contribuição original ao conhecimento.',
      roteiro: [
        '## Hipóteses',
        '',
        '- H1: ...',
        '- H2: ...',
        '',
        '## Modelo/abordagem proposta',
        '',
        '## Originalidade e contribuição'
      ].join('\n')
    }),
    b('Materiais e Métodos', { arquivo: 'metodologia', obrigatorio: true,
      dica: 'Descreva cada estudo/experimento da tese, mantendo rastreabilidade entre objetivos e métodos.' }),
    b('Resultados', { arquivo: 'resultados', obrigatorio: true,
      dica: 'Organize os resultados por estudo ou por objetivo específico.' }),
    b('Discussão Geral', { arquivo: 'discussao', obrigatorio: true,
      dica: 'Integre os achados dos diferentes estudos em uma discussão única.' }),
    b('Conclusões e Perspectivas', { arquivo: 'conclusoes', obrigatorio: true,
      dica: 'Conclua, evidencie a contribuição original e aponte desdobramentos.' }),
    b('Produção científica do período', {
      arquivo: 'producao', tipo: 'postextual', obrigatorio: false, incluir: false, numerado: false,
      dica: 'Liste artigos, capítulos, patentes e eventos derivados da tese.'
    })
  ]);

  T.TEMPLATES = {
    graduacao: { pre: PRE, textual: GRAD, pos: POS },
    especializacao: { pre: PRE, textual: ESPEC, pos: POS },
    mestrado: { pre: PRE, textual: MEST, pos: POS },
    doutorado: { pre: PRE, textual: DOUT, pos: POS }
  };

  /** Lista de blocos (já instanciados) para um nível. */
  T.buildBlocks = function (nivelId) {
    var tpl = T.TEMPLATES[nivelId] || T.TEMPLATES.graduacao;
    var M = P.M;
    return []
      .concat(tpl.pre, tpl.textual, tpl.pos)
      .map(function (spec) { return M.newBlock(spec); });
  };

  /** Modelos de blocos que podem ser adicionados manualmente. */
  T.ADICIONAIS = [
    { titulo: 'Novo capítulo', tipo: 'capitulo', nivel: 1, dica: 'Capítulo numerado dos elementos textuais.' },
    { titulo: 'Nova seção', tipo: 'capitulo', nivel: 2, dica: 'Seção do capítulo anterior (1.1, 1.2 …).' },
    { titulo: 'Nova subseção', tipo: 'capitulo', nivel: 3, dica: 'Subseção (1.1.1, 1.1.2 …).' },
    { titulo: 'Dedicatória', tipo: 'pretextual', nivel: 1, arquivo: 'dedicatoria' },
    { titulo: 'Agradecimentos', tipo: 'pretextual', nivel: 1, arquivo: 'agradecimentos' },
    { titulo: 'Epígrafe', tipo: 'pretextual', nivel: 1, arquivo: 'epigrafe' },
    { titulo: 'Apêndice', tipo: 'postextual', nivel: 1, arquivo: 'apendices' },
    { titulo: 'Anexo', tipo: 'postextual', nivel: 1, arquivo: 'anexos' },
    { titulo: 'Glossário', tipo: 'postextual', nivel: 1, arquivo: 'glossario', numerado: false }
  ];

  P.Templates = T;
})(window.Portal = window.Portal || {});
