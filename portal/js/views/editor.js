/* ==========================================================================
   Tela: Editor de blocos
   Cada capítulo/seção é um bloco independente, versionado, com cópia imediata
   do LaTeX correspondente e inserção de citações da biblioteca.
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;

  var MARCAS = [
    { rot: 'Seção', ins: ['## ', ''], titulo: 'Seção (##) → \\section' },
    { rot: 'Subseção', ins: ['### ', ''], titulo: 'Subseção (###) → \\subsection' },
    { rot: 'negrito', ins: ['**', '**'], titulo: '**texto** → \\textbf' },
    { rot: 'itálico', ins: ['*', '*'], titulo: '*texto* → \\emph' },
    { rot: 'lista', ins: ['- ', ''], titulo: '- item → itemize' },
    { rot: 'numerada', ins: ['1. ', ''], titulo: '1. item → enumerate' },
    { rot: 'citação longa', ins: ['> ', ''], titulo: '> texto → \\begin{citacao}' },
    { rot: 'figura', ins: ['[fig: arquivo.png | Legenda | Fonte]', ''], titulo: 'Insere ambiente figure com legenda e fonte' },
    { rot: 'tabela', ins: ['[tab: Legenda | Fonte]\n| Coluna A | Coluna B |\n| valor | valor |', ''], titulo: 'Insere tabela com booktabs' },
    { rot: 'fórmula', ins: ['$', '$'], titulo: 'Matemática em linha' }
  ];

  function tipoLabel(b) {
    if (b.tipo === 'pretextual') return 'pré-textual';
    if (b.tipo === 'postextual') return 'pós-textual';
    return b.nivel === 1 ? 'capítulo' : b.nivel === 2 ? 'seção' : 'subseção';
  }

  /* ------------------------------------------------------- inserir no texto */

  function insertAt(ta, before, after) {
    var start = ta.selectionStart, end = ta.selectionEnd;
    var sel = ta.value.slice(start, end);
    var novo = before + sel + (after || '');
    ta.setRangeText ? ta.setRangeText(novo, start, end, 'end')
      : (ta.value = ta.value.slice(0, start) + novo + ta.value.slice(end));
    if (!sel && after) {
      var pos = start + before.length;
      ta.setSelectionRange(pos, pos);
    }
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ----------------------------------------------------------- citação ---- */

  function citacaoDialog(ta) {
    var refs = P.Store.references();
    if (!refs.length) {
      U.toast('Cadastre referências na biblioteca primeiro', 'err');
      return;
    }
    var body =
      '<div class="search-wrap" style="margin-bottom:12px">' + U.icon('search') +
      '<input id="citSearch" placeholder="Buscar por autor, título ou chave…" autofocus></div>' +
      '<div class="callout small" style="margin-bottom:12px">Clique em <strong>(Autor, ano)</strong> para citação indireta ou em <strong>Autor (ano)</strong> para citação narrativa.</div>' +
      '<div id="citList" class="card flush"></div>';

    var modal = U.modal({ title: 'Inserir citação', size: 'lg', body: body, hideCancel: true, okLabel: 'Fechar' });

    function pinta(filtro) {
      var termo = U.deburr(filtro || '').toLowerCase();
      var lista = refs.filter(function (r) {
        if (!termo) return true;
        var alvo = U.deburr(r.chave + ' ' + P.ABNT.formatPlain(r) + ' ' + (r.tags || []).join(' ')).toLowerCase();
        return alvo.indexOf(termo) > -1;
      }).slice(0, 40);

      U.qs('#citList', modal).innerHTML = lista.length ? lista.map(function (r) {
        return '<div class="ref-item"><div>' +
          '<div class="ref-abnt">' + P.ABNT.format(r) + '</div>' +
          '<div class="ref-meta"><span class="ref-key">' + U.esc(r.chave) + '</span>' +
          '<span class="chip">' + U.esc(M.refType(r.tipo).label) + '</span></div></div>' +
          '<div class="ref-tools">' +
          '<button class="btn btn-sm" data-cit="' + r.chave + '" data-modo="ind">' + U.esc(P.ABNT.citeIndirect(r)) + '</button>' +
          '<button class="btn btn-sm" data-cit="' + r.chave + '" data-modo="nar">' + U.esc(P.ABNT.citeNarrative(r)) + '</button>' +
          '</div></div>';
      }).join('') : '<div class="empty" style="border:0">Nenhuma referência encontrada.</div>';
    }

    pinta('');
    U.qs('#citSearch', modal).addEventListener('input', function () { pinta(this.value); });
    U.on(modal, 'click', '[data-cit]', function (ev, el) {
      var chave = el.getAttribute('data-cit');
      var modo = el.getAttribute('data-modo');
      insertAt(ta, (modo === 'nar' ? '[@@' : '[@') + chave + ']', '');
      U.toast('Citação inserida: ' + chave, 'ok');
      modal.close();
    });
  }

  /* ------------------------------------------------------------ histórico - */

  function historicoDialog(prj, blk) {
    var body = blk.historico.length
      ? '<table class="data"><thead><tr><th>Versão</th><th>Quando</th><th class="num">Tamanho</th><th></th></tr></thead><tbody>' +
        blk.historico.map(function (h, i) {
          return '<tr><td><strong>v' + h.versao + '</strong></td><td>' + U.fmtDateTime(h.at) + '</td>' +
            '<td class="num">' + h.chars + ' car.</td>' +
            '<td class="actions"><button class="btn btn-sm" data-ver="' + i + '">ver</button> ' +
            '<button class="btn btn-sm" data-restore="' + i + '">restaurar</button></td></tr>';
        }).join('') + '</tbody></table>'
      : '<div class="empty" style="border:0">Nenhuma versão anterior registrada. Uma versão é criada sempre que você sai do bloco após editá-lo.</div>';

    var modal = U.modal({
      title: 'Histórico — ' + blk.titulo + ' (v' + blk.versao + ')',
      size: 'lg', body: body, hideCancel: true, okLabel: 'Fechar'
    });

    U.on(modal, 'click', '[data-ver]', function (ev, el) {
      var h = blk.historico[Number(el.getAttribute('data-ver'))];
      U.modal({
        title: 'Versão ' + h.versao, size: 'lg', hideCancel: true, okLabel: 'Fechar',
        body: '<pre class="code">' + U.esc(h.conteudo || '(vazio)') + '</pre>'
      });
    });
    U.on(modal, 'click', '[data-restore]', function (ev, el) {
      var i = Number(el.getAttribute('data-restore'));
      P.Store.restoreBlockVersion(prj.id, blk.id, i);
      U.toast('Versão restaurada', 'ok');
      modal.close();
      P.App.refresh();
    });
  }

  /* --------------------------------------------------------- novo bloco --- */

  function novoBlocoDialog(prj, afterId) {
    var opcoes = P.Templates.ADICIONAIS.map(function (a, i) {
      return '<option value="' + i + '">' + U.esc(a.titulo) + ' — ' + U.esc(a.tipo === 'capitulo' ? tipoLabel(a) : a.tipo) + '</option>';
    }).join('');
    U.modal({
      title: 'Adicionar bloco',
      okLabel: 'Adicionar',
      body:
        '<div class="field"><label>Modelo</label><select name="modelo">' + opcoes + '</select></div>' +
        '<div class="field"><label>Título do bloco</label><input name="titulo" placeholder="Ex.: Análise dos dados"></div>',
      onOk: function (el) {
        var i = Number(U.qs('[name="modelo"]', el).value);
        var titulo = U.trim(U.qs('[name="titulo"]', el).value);
        var spec = Object.assign({}, P.Templates.ADICIONAIS[i]);
        if (titulo) spec.titulo = titulo;
        spec.arquivo = spec.arquivo || U.slug(spec.titulo);
        spec.key = U.slug(spec.titulo, '_') + '_' + Math.random().toString(36).slice(2, 5);
        var blk = P.Store.addBlock(prj.id, spec, afterId);
        U.toast('Bloco "' + blk.titulo + '" adicionado', 'ok');
        P.App.refresh();
        setTimeout(function () {
          var node = U.qs('[data-block="' + blk.id + '"]');
          if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
      }
    });
  }

  /* --------------------------------------------------- resumo / abstract -- */

  function resumoCard(prj) {
    var m = prj.meta;
    var pal = (m.palavrasChave || []).join('; ');
    var kw = (m.keywords || []).join('; ');
    return '<div class="block" data-resumo="1" id="bloco-resumo">' +
      '<div class="block-head"><span class="chip accent">pré-textual</span>' +
        '<strong style="flex:1">Resumo e Abstract</strong>' +
        '<span class="muted small">' + U.words(m.resumo) + ' palavras · ABNT NBR 6028: 150 a 500</span>' +
      '</div>' +
      '<div class="block-body">' +
        '<label>Resumo (português)</label>' +
        '<textarea class="block-editor" name="resumo" rows="7" placeholder="Parágrafo único, sem citações, na ordem: tema, objetivo, método, resultados e conclusão.">' + U.esc(m.resumo) + '</textarea>' +
        '<div class="form-grid">' +
          '<div class="field"><label>Palavras-chave (separadas por ;)</label><input name="palavrasChave" value="' + U.esc(pal) + '" placeholder="telemedicina; atenção primária; saúde pública"></div>' +
          '<div class="field"><label>Keywords (separadas por ;)</label><input name="keywords" value="' + U.esc(kw) + '" placeholder="telemedicine; primary care; public health"></div>' +
        '</div>' +
        '<label>Abstract (inglês)</label>' +
        '<textarea class="block-editor" name="abstract" rows="7" placeholder="Versão do resumo em língua estrangeira.">' + U.esc(m.abstract) + '</textarea>' +
      '</div>' +
      '<div class="block-foot"><span>Salvo automaticamente</span>' +
        '<div class="block-actions">' +
          '<button class="btn btn-sm" data-act="copy-resumo">' + U.icon('copy') + 'Copiar LaTeX</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------- bloco ---- */

  function blocoHtml(prj, blk) {
    var chars = U.chars(blk.conteudo);
    var refsFaltando = (P.LaTeX.citedKeys({ blocks: [blk] }) || []).filter(function (k) {
      return !P.Store.referenceByKey(k);
    });
    return '<div class="block' + (blk.incluir === false ? ' is-off' : '') + '" data-block="' + blk.id + '" id="bloco-' + blk.id + '">' +
      '<div class="block-head">' +
        '<span class="chip' + (blk.tipo === 'capitulo' ? ' accent' : '') + '">' + U.esc(tipoLabel(blk)) + '</span>' +
        '<input class="title-input" value="' + U.esc(blk.titulo) + '" data-field="titulo" aria-label="Título do bloco">' +
        '<div class="block-actions">' +
          '<button class="btn btn-sm btn-ghost" data-act="up" title="Mover para cima">↑</button>' +
          '<button class="btn btn-sm btn-ghost" data-act="down" title="Mover para baixo">↓</button>' +
          '<button class="btn btn-sm btn-ghost" data-act="toggle" title="' + (blk.incluir === false ? 'Incluir no trabalho' : 'Excluir da saída LaTeX') + '">' +
            (blk.incluir === false ? 'incluir' : 'ocultar') + '</button>' +
          '<button class="btn btn-sm btn-ghost btn-danger" data-act="del" title="Remover bloco">' + U.icon('trash') + '</button>' +
        '</div>' +
      '</div>' +
      (blk.dica ? '<div class="block-body" style="padding-bottom:0"><div class="callout small">' + U.esc(blk.dica) + '</div></div>' : '') +
      '<div class="block-body">' +
        '<div class="marks">' +
          MARCAS.map(function (mk, i) {
            return '<button class="btn btn-sm btn-ghost" data-mark="' + i + '" title="' + U.esc(mk.titulo) + '">' + U.esc(mk.rot) + '</button>';
          }).join('') +
          '<button class="btn btn-sm" data-act="cite" title="Inserir citação da biblioteca">+ citação</button>' +
        '</div>' +
        '<textarea class="block-editor" data-field="conteudo" rows="' + Math.min(26, Math.max(8, Math.ceil(chars / 90))) + '" ' +
          'placeholder="' + U.esc(blk.dica || 'Escreva aqui. Use ## para seções, [@chave] para citar e - para listas.') + '">' + U.esc(blk.conteudo) + '</textarea>' +
      '</div>' +
      '<div class="block-foot">' +
        '<span data-count>' + U.words(blk.conteudo) + ' palavras · ' + chars + ' caracteres · ' +
          String(U.pages(chars)).replace('.', ',') + ' pág.</span>' +
        '<span class="chip">v' + blk.versao + '</span>' +
        (refsFaltando.length ? '<span class="chip warn" title="Chaves citadas sem referência cadastrada">' + refsFaltando.length + ' citação(ões) sem cadastro</span>' : '') +
        '<div class="block-actions">' +
          (blk.roteiro ? '<button class="btn btn-sm" data-act="roteiro">inserir roteiro</button>' : '') +
          '<button class="btn btn-sm" data-act="hist">histórico</button>' +
          '<button class="btn btn-sm" data-act="add-after">+ bloco</button>' +
          '<button class="btn btn-sm btn-primary" data-act="copy-latex">' + U.icon('copy') + 'Copiar LaTeX</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* -------------------------------------------------------------- render -- */

  P.Views.editor = {
    titulo: 'Editor de blocos',
    wide: true,
    render: function (root, params) {
      var S = P.Store;
      var prj = S.activeProject();
      if (!prj) {
        root.innerHTML = '<div class="empty"><h3>Nenhum trabalho selecionado</h3>' +
          '<p>Crie um trabalho para começar a escrever em blocos.</p>' +
          '<button class="btn btn-primary" data-act="novo">Criar trabalho</button></div>';
        U.on(root, 'click', '[data-act="novo"]', P.App.newProjectDialog);
        return;
      }

      var stats = S.projectStats(prj);

      root.innerHTML =
        '<div class="editor-layout">' +
          '<div class="card flush outline">' +
            '<div class="card-head"><h3>Estrutura</h3><div class="spacer"></div>' +
              '<button class="btn btn-sm btn-ghost" data-act="add-block" title="Adicionar bloco">' + U.icon('plus') + '</button></div>' +
            '<ul class="outline-list">' +
              '<li><button class="outline-item" data-goto="resumo"><span class="st ' + (U.words(prj.meta.resumo) >= 150 ? 'filled' : 'off') + '"></span>' +
                '<span class="txt">Resumo e Abstract</span></button></li>' +
              prj.blocks.map(function (b) {
                var st = b.incluir === false ? 'off' : (U.chars(b.conteudo) > 200 ? 'filled' : '');
                return '<li><button class="outline-item lvl-' + b.nivel + '" data-goto="' + b.id + '">' +
                  '<span class="st ' + st + '"></span><span class="txt">' + U.esc(b.titulo) + '</span></button></li>';
              }).join('') +
            '</ul>' +
            '<div class="card-foot small muted">' + stats.words.toLocaleString('pt-BR') + ' palavras · ' +
              String(stats.pages).replace('.', ',') + ' páginas estimadas</div>' +
          '</div>' +

          '<div>' +
            '<div class="toolbar">' +
              '<button class="btn btn-sm" data-act="copy-all">' + U.icon('copy') + 'Copiar todo o texto em LaTeX</button>' +
              '<a class="btn btn-sm" href="#/latex">Ver LaTeX gerado</a>' +
              '<a class="btn btn-sm" href="#/biblioteca">' + U.icon('library') + 'Biblioteca</a>' +
              '<div class="spacer"></div>' +
              '<button class="btn btn-sm btn-ghost" data-act="ajuda-marcacao">' + U.icon('help') + 'Marcação</button>' +
              '<span class="chip ok" id="saveState">salvo</span>' +
            '</div>' +
            resumoCard(prj) +
            prj.blocks.map(function (b) { return blocoHtml(prj, b); }).join('') +
            '<div class="row" style="justify-content:center;margin:18px 0 40px">' +
              '<button class="btn" data-act="add-block">' + U.icon('plus') + 'Adicionar bloco ao final</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      /* ------------------------------------------------------- utilidades - */

      function blocoDe(el) {
        var node = el.closest('[data-block]');
        return node ? S.block(prj.id, node.getAttribute('data-block')) : null;
      }

      function marcaSalvo(texto, kind) {
        var chip = U.qs('#saveState', root);
        if (!chip) return;
        chip.className = 'chip ' + (kind || 'ok');
        chip.textContent = texto;
      }

      /* --------------------------------------------------------- autosave - */

      var salvar = U.debounce(function (blockId, patch) {
        S.updateBlock(prj.id, blockId, patch, { skipHistory: true });
        marcaSalvo('salvo');
      }, P.config.autosaveMs);

      root.addEventListener('input', function (ev) {
        var t = ev.target;
        var node = t.closest('[data-block]');

        if (node) {
          var blockId = node.getAttribute('data-block');
          var field = t.getAttribute('data-field');
          if (!field) return;
          marcaSalvo('salvando…', 'warn');
          var patch = {};
          patch[field] = t.value;
          salvar(blockId, patch);
          if (field === 'conteudo') {
            var chars = U.chars(t.value);
            var foot = U.qs('[data-count]', node);
            if (foot) {
              foot.textContent = U.words(t.value) + ' palavras · ' + chars + ' caracteres · ' +
                String(U.pages(chars)).replace('.', ',') + ' pág.';
            }
          }
          return;
        }

        if (t.closest('[data-resumo]')) {
          marcaSalvo('salvando…', 'warn');
          var nome = t.getAttribute('name');
          var valor = t.value;
          salvarResumo(nome, valor);
        }
      });

      var salvarResumo = U.debounce(function (nome, valor) {
        S.updateProject(prj.id, function (p) {
          if (nome === 'palavrasChave' || nome === 'keywords') {
            p.meta[nome] = valor.split(/[;,]/).map(U.trim).filter(Boolean);
          } else {
            p.meta[nome] = valor;
          }
        });
        marcaSalvo('salvo');
      }, P.config.autosaveMs);

      /* ------------------------------------------------- versões (blur) --- */

      var focusValues = {};
      root.addEventListener('focusin', function (ev) {
        var node = ev.target.closest('[data-block]');
        if (node) node.classList.add('is-focus');
        if (node && ev.target.getAttribute('data-field') === 'conteudo') {
          focusValues[node.getAttribute('data-block')] = ev.target.value;
        }
      });
      root.addEventListener('focusout', function (ev) {
        var node = ev.target.closest('[data-block]');
        if (node) node.classList.remove('is-focus');
        if (node && ev.target.getAttribute('data-field') === 'conteudo') {
          var id = node.getAttribute('data-block');
          var antes = focusValues[id];
          if (antes != null && antes !== ev.target.value) {
            S.updateBlock(prj.id, id, { conteudo: ev.target.value }, { skipHistory: true });
            S.snapshotBlock(prj.id, id, antes);
            var chip = U.qsa('.chip', node).filter(function (c) { return /^v\d+$/.test(c.textContent); })[0];
            var blk = S.block(prj.id, id);
            if (chip && blk) chip.textContent = 'v' + blk.versao;
          }
          delete focusValues[id];
        }
      });

      /* ---------------------------------------------------------- ações --- */

      U.on(root, 'click', '[data-goto]', function (ev, el) {
        var id = el.getAttribute('data-goto');
        var node = U.qs(id === 'resumo' ? '#bloco-resumo' : '#bloco-' + id, root);
        if (node) {
          node.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var ta = U.qs('textarea', node);
          if (ta) setTimeout(function () { ta.focus(); }, 320);
        }
        U.qsa('.outline-item', root).forEach(function (b) { b.classList.remove('is-active'); });
        el.classList.add('is-active');
      });

      U.on(root, 'click', '[data-mark]', function (ev, el) {
        var mk = MARCAS[Number(el.getAttribute('data-mark'))];
        var ta = U.qs('[data-field="conteudo"]', el.closest('[data-block]'));
        insertAt(ta, mk.ins[0], mk.ins[1]);
      });

      U.on(root, 'click', '[data-act="cite"]', function (ev, el) {
        citacaoDialog(U.qs('[data-field="conteudo"]', el.closest('[data-block]')));
      });

      U.on(root, 'click', '[data-act="copy-latex"]', function (ev, el) {
        var blk = blocoDe(el);
        U.copy(P.LaTeX.block(blk), 'LaTeX de "' + blk.titulo + '"');
      });

      U.on(root, 'click', '[data-act="copy-resumo"]', function () {
        var build = P.LaTeX.buildProject(prj, S.references());
        var m = /\\begin\{resumo\}[\s\S]*?\\end\{resumo\}\s*\n\\begin\{resumo\}\[Abstract\][\s\S]*?\\end\{resumo\}/.exec(build.main);
        U.copy(m ? m[0] : '', 'Resumo/Abstract em LaTeX');
      });

      U.on(root, 'click', '[data-act="copy-all"]', function () {
        var texto = P.LaTeX.chapterFiles(prj).map(function (fl) {
          return '% ==== ' + fl.titulo + ' (capitulos/' + fl.nome + '.tex) ====\n' + fl.conteudo;
        }).join('\n\n');
        U.copy(texto, 'Texto completo em LaTeX');
      });

      U.on(root, 'click', '[data-act="roteiro"]', function (ev, el) {
        var blk = blocoDe(el);
        var ta = U.qs('[data-field="conteudo"]', el.closest('[data-block]'));
        if (U.trim(ta.value)) {
          U.confirm('O bloco já tem conteúdo. Inserir o roteiro ao final?', function () {
            ta.value = ta.value.replace(/\s+$/, '') + '\n\n' + blk.roteiro;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          });
        } else {
          ta.value = blk.roteiro;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      U.on(root, 'click', '[data-act="hist"]', function (ev, el) {
        historicoDialog(prj, blocoDe(el));
      });

      U.on(root, 'click', '[data-act="up"]', function (ev, el) {
        S.moveBlock(prj.id, blocoDe(el).id, -1);
        P.App.refresh();
      });
      U.on(root, 'click', '[data-act="down"]', function (ev, el) {
        S.moveBlock(prj.id, blocoDe(el).id, 1);
        P.App.refresh();
      });

      U.on(root, 'click', '[data-act="toggle"]', function (ev, el) {
        var blk = blocoDe(el);
        S.updateBlock(prj.id, blk.id, { incluir: blk.incluir === false }, { skipHistory: true });
        P.App.refresh();
      });

      U.on(root, 'click', '[data-act="del"]', function (ev, el) {
        var blk = blocoDe(el);
        U.confirm('Remover o bloco "' + blk.titulo + '"? O conteúdo e o histórico serão perdidos.', function () {
          S.removeBlock(prj.id, blk.id);
          P.App.refresh();
        }, { okLabel: 'Remover' });
      });

      U.on(root, 'click', '[data-act="add-after"]', function (ev, el) {
        novoBlocoDialog(prj, blocoDe(el).id);
      });
      U.on(root, 'click', '[data-act="add-block"]', function () {
        novoBlocoDialog(prj, null);
      });

      U.on(root, 'click', '[data-act="ajuda-marcacao"]', function () {
        U.modal({
          title: 'Marcação do editor', size: 'lg', hideCancel: true, okLabel: 'Fechar',
          body: P.Views.ajuda.tabelaMarcacao()
        });
      });

      /* ------------------------------------------------- rolagem inicial -- */

      if (params && params[0]) {
        var alvo = U.qs('#bloco-' + params[0], root);
        if (alvo) setTimeout(function () { alvo.scrollIntoView({ block: 'start' }); }, 40);
      }
    }
  };
})(window.Portal = window.Portal || {});
