/**
 * =============================================================================
 * Portal TCC ABNT — verificação do LaTeX gerado
 * -----------------------------------------------------------------------------
 * Carrega os módulos do portal fora do navegador e confere o projeto gerado
 * para os quatro níveis, procurando os erros que só apareceriam na compilação:
 * quebra de linha seguida de colchete, ambientes desbalanceados, chaves
 * desbalanceadas e marcadores internos vazados.
 *
 *   node tests/verifica-geracao.js
 * =============================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ------------------------------------------------------- ambiente mínimo -- */

function carregarPortal() {
  const memoria = {};
  const sandbox = {
    console,
    Blob: global.Blob,
    TextEncoder,
    URL,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: (k) => (k in memoria ? memoria[k] : null),
      setItem: (k, v) => { memoria[k] = String(v); },
      removeItem: (k) => { delete memoria[k]; }
    },
    document: {
      readyState: 'complete',
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, click() {}, select() {} }),
      documentElement: { setAttribute() {}, removeAttribute() {} },
      body: { appendChild() {} }
    },
    navigator: {},
    location: { hash: '', protocol: 'file:' }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  const modulos = ['config', 'util', 'models', 'abnt', 'bibtex', 'latex', 'templates', 'zip', 'store', 'api'];
  for (const nome of modulos) {
    const arquivo = path.join(__dirname, '..', 'portal', 'js', nome + '.js');
    vm.runInContext(fs.readFileSync(arquivo, 'utf8'), ctx, { filename: nome + '.js' });
  }
  return sandbox.Portal;
}

/* ------------------------------------------------------------ asserções -- */

let falhas = 0;
function verifica(condicao, descricao, detalhe) {
  if (condicao) {
    console.log('  ok   ' + descricao);
  } else {
    falhas++;
    console.log('  FALHA ' + descricao + (detalhe ? '\n        ' + detalhe : ''));
  }
}

/** \\ seguido de colchete vira \\[dimensão] e aborta a compilação. */
function quebraComColchete(tex) {
  const re = /\\\\\s*\[([^\]]{0,40})\]/g;
  const achados = [];
  let m;
  while ((m = re.exec(tex))) {
    if (!/^\s*-?[\d.]+\s*(pt|mm|cm|in|ex|em|bp|pc|dd|cc|sp|\\baselineskip)?\s*$/.test(m[1])) {
      achados.push(m[0].replace(/\s+/g, ' '));
    }
  }
  return achados;
}

function desbalanceados(tex) {
  const abre = (tex.match(/\\begin\{/g) || []).length;
  const fecha = (tex.match(/\\end\{/g) || []).length;
  const chaves = (tex.match(/(?<!\\)\{/g) || []).length - (tex.match(/(?<!\\)\}/g) || []).length;
  return { ambientes: abre - fecha, chaves: chaves };
}

/* -------------------------------------------------------------- cenários -- */

const P = carregarPortal();
const U = P.U, M = P.M;
P.Store.init();

const CENARIOS = [
  {
    nome: 'graduação com dados completos',
    dados: {
      titulo: 'Análise do esfregaço sanguíneo', subtitulo: 'um estudo de caso',
      autor: 'Maria Silva', nivel: 'graduacao', instituicao: 'Universidade Federal de Exemplo',
      curso: 'Biomedicina', orientador: 'Ana Souza', cidade: 'Recife', ano: '2026'
    }
  },
  {
    nome: 'mestrado sem nenhum dado preenchido',
    dados: { titulo: '', autor: '', nivel: 'mestrado', instituicao: '', curso: '', orientador: '', cidade: '', ano: '' }
  },
  {
    nome: 'doutorado com titulação digitada no nome',
    dados: {
      titulo: 'Modelos preditivos', autor: 'João Lima', nivel: 'doutorado',
      instituicao: 'USP', curso: 'Engenharia', orientador: 'Prof. Me. Jorge Nunes',
      cidade: 'São Carlos', ano: '2027'
    }
  },
  {
    nome: 'especialização com caracteres especiais',
    dados: {
      titulo: 'Custo & eficiência: 100% dos casos', autor: 'Ana_Paula', nivel: 'especializacao',
      instituicao: 'Instituto #1', curso: 'Gestão', orientador: 'Dra. Rita Alves',
      cidade: 'Salvador', ano: '2026'
    }
  }
];

const referencia = M.newReference({
  tipo: 'livro',
  campos: {
    autores: M.parseAuthors('Gil, Antonio Carlos'),
    titulo: 'Como elaborar projetos de pesquisa',
    edicao: '7', local: 'São Paulo', editora: 'Atlas', ano: '2022'
  }
});
P.Store.addReference(referencia);

CENARIOS.forEach((cenario) => {
  console.log('\n== ' + cenario.nome + ' ==');
  const prj = P.Store.createProject(cenario.dados);

  // conteúdo com marcação variada em todos os blocos incluídos
  prj.blocks.forEach((b) => {
    P.Store.updateBlock(prj.id, b.id, {
      incluir: true,
      conteudo: [
        'Parágrafo com citação [@gil2022] e narrativa [@@gil2022].',
        '',
        '## Seção & símbolos: 50%, custo_total, R$ 10',
        '',
        '> Citação longa recuada [@gil2022, p. 45].',
        '',
        '- item de lista',
        '',
        '[fig: grafico.png | Legenda da figura | Fonte: autor]',
        '',
        '[tab: Legenda da tabela | Fonte: pesquisa]',
        '| Coluna A | Coluna B |',
        '| 1 | 2 |'
      ].join('\n')
    }, { skipHistory: true });
  });
  P.Store.updateProject(prj.id, (p) => {
    p.meta.resumo = 'Resumo de teste. '.repeat(20);
    p.meta.abstract = 'Abstract. '.repeat(20);
    p.meta.palavrasChave = ['a', 'b', 'c'];
    p.meta.keywords = ['x', 'y'];
    p.opcoes.errata = true;
  });

  ['abntex2', 'uspsc'].forEach((engine) => {
    P.Store.updateProject(prj.id, (p) => { p.opcoes.engine = engine; });
    const build = P.LaTeX.buildProject(P.Store.project(prj.id), P.Store.references());
    const tex = build.files
      .filter((f) => f.path.endsWith('.tex'))
      .map((f) => f.content)
      .join('\n');

    const colchetes = quebraComColchete(tex);
    verifica(colchetes.length === 0, engine + ': sem quebra de linha seguida de colchete',
      colchetes.join(' | '));

    const saldo = desbalanceados(tex);
    verifica(saldo.ambientes === 0, engine + ': ambientes begin/end equilibrados', 'saldo ' + saldo.ambientes);
    verifica(saldo.chaves === 0, engine + ': chaves equilibradas', 'saldo ' + saldo.chaves);
    verifica(!/[\u0001\u0002\u0003]/.test(tex), engine + ': sem marcadores internos vazados');
    verifica(/\\documentclass\[/.test(build.main) && /\\begin\{document\}/.test(build.main) &&
      /\\end\{document\}/.test(build.main), engine + ': documento completo');
    verifica(/\\bibliography\{referencias\}/.test(build.main), engine + ': bibliografia declarada');
  });

  // titulação não pode aparecer duplicada
  const build = P.LaTeX.buildProject(P.Store.project(prj.id), P.Store.references());
  const orientador = /\\orientador\{([^}]*)\}/.exec(build.main);
  verifica(!orientador || !/(Prof\.?\s*(Dr|Me|Ma)\.?\s*){2,}/i.test(orientador[1]),
    'titulação do orientador sem duplicação',
    orientador ? orientador[1] : '(ausente)');

  P.Store.deleteProject(prj.id);
});

/* ---------------------------------------------------------------- resumo -- */

console.log('\n' + (falhas ? '### ' + falhas + ' falha(s) na geração do LaTeX' : '### geração do LaTeX verificada'));
process.exit(falhas ? 1 : 0);
