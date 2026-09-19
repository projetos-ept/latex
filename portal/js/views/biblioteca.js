/* ==========================================================================
   Tela: Biblioteca de referências
   Biblioteca pessoal reutilizável entre trabalhos, com formatação ABNT
   NBR 6023, geração de BibTeX e importação de arquivos .bib.
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;
  var estado = { busca: '', tipo: '', colecao: '', ordem: 'alfabetica', apenasUsadas: false };

  /* ------------------------------------------------------ formulário ------ */

  function campoHtml(campo, valor) {
    var id = 'f_' + campo.key;
    var comum = 'name="' + campo.key + '" id="' + id + '"';
    var html = '<div class="field' + (campo.span ? ' span-2' : '') + '">' +
      '<label for="' + id + '">' + U.esc(campo.label) + (campo.req ? ' <span class="req">*</span>' : '') + '</label>';

    if (campo.type === 'authors') {
      html += '<textarea ' + comum + ' rows="3" placeholder="Sobrenome, Nome&#10;Outro Sobrenome, Nome">' +
        U.esc(M.authorsToText(valor)) + '</textarea>';
    } else if (campo.type === 'textarea') {
      html += '<textarea ' + comum + ' rows="3">' + U.esc(valor || '') + '</textarea>';
    } else if (campo.type === 'select') {
      html += '<select ' + comum + '><option value=""></option>' +
        (campo.options || []).map(function (o) {
          return '<option value="' + U.esc(o) + '"' + (o === valor ? ' selected' : '') + '>' + U.esc(o) + '</option>';
        }).join('') + '</select>';
    } else {
      var tipo = campo.type === 'date' ? 'date' : campo.type === 'url' ? 'url' : 'text';
      html += '<input type="' + tipo + '" ' + comum + ' value="' + U.esc(valor || '') + '">';
    }
    if (campo.hint) html += '<div class="help">' + U.esc(campo.hint) + '</div>';
    return html + '</div>';
  }

  function formularioHtml(ref) {
    var tipo = M.refType(ref.tipo);
    var colecoes = P.Store.state.colecoes || [];
    return '<div class="field"><label>Tipo de referência</label><select id="refTipo">' +
        M.refTypeList().map(function (t) {
          return '<option value="' + t.id + '"' + (t.id === ref.tipo ? ' selected' : '') + '>' + U.esc(t.label) + '</option>';
        }).join('') +
      '</select></div>' +
      '<div id="refCampos" class="form-grid">' +
        tipo.campos.map(function (c) { return campoHtml(c, ref.campos[c.key]); }).join('') +
      '</div>' +
      '<div class="divider-label">Organização</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label>Chave de citação</label>' +
          '<input name="__chave" id="refChave" value="' + U.esc(ref.chave) + '" placeholder="silva2026">' +
          '<div class="help">Usada em <code>[@chave]</code> e no <code>.bib</code>. Deixe vazio para gerar automaticamente.</div></div>' +
        '<div class="field"><label>Coleção</label><input name="__colecao" list="colecoesList" value="' + U.esc(ref.colecao) + '" placeholder="Ex.: Fundamentação">' +
          '<datalist id="colecoesList">' + colecoes.map(function (c) { return '<option value="' + U.esc(c) + '">'; }).join('') + '</datalist></div>' +
        '<div class="field span-2"><label>Tags (separadas por ;)</label><input name="__tags" value="' + U.esc((ref.tags || []).join('; ')) + '"></div>' +
        '<div class="field span-2"><label>Notas de leitura</label><textarea name="__notas" rows="3" placeholder="Fichamento, trechos úteis, página das citações…">' + U.esc(ref.notas) + '</textarea></div>' +
      '</div>' +
      '<div class="divider-label">Pré-visualização ABNT</div>' +
      '<div class="ref-abnt card" id="refPreview" style="background:var(--bg-inset)"></div>';
  }

  function coletar(el, tipoId) {
    var tipo = M.refType(tipoId);
    var campos = {};
    tipo.campos.forEach(function (c) {
      var input = U.qs('[name="' + c.key + '"]', el);
      if (!input) return;
      campos[c.key] = c.type === 'authors' ? M.parseAuthors(input.value) : U.trim(input.value);
    });
    return campos;
  }

  function editarDialog(ref, onSaved) {
    var novo = !ref;
    ref = ref || M.newReference({});
    var modal = U.modal({
      title: novo ? 'Nova referência' : 'Editar referência',
      size: 'lg',
      okLabel: novo ? 'Adicionar à biblioteca' : 'Salvar alterações',
      body: formularioHtml(ref),
      onOk: function (el) {
        var tipoId = U.qs('#refTipo', el).value;
        var dados = {
          tipo: tipoId,
          campos: coletar(el, tipoId),
          chave: U.trim(U.qs('[name="__chave"]', el).value),
          colecao: U.trim(U.qs('[name="__colecao"]', el).value),
          tags: U.qs('[name="__tags"]', el).value.split(/[;,]/).map(U.trim).filter(Boolean),
          notas: U.trim(U.qs('[name="__notas"]', el).value)
        };
        var provisoria = Object.assign({}, ref, dados);
        var faltando = M.validateReference(provisoria);
        if (faltando.length) {
          U.toast('Campos obrigatórios: ' + faltando.join(', '), 'err');
          return false;
        }
        if (novo) {
          var criada = M.newReference(dados);
          P.Store.addReference(criada);
          U.toast('Referência adicionada: ' + criada.chave, 'ok');
        } else {
          if (!dados.chave) dados.chave = P.BibTeX.makeKey(provisoria, P.Store.references());
          P.Store.updateReference(ref.id, dados);
          U.toast('Referência atualizada', 'ok');
        }
        if (onSaved) onSaved();
      }
    });

    function atualizaPreview() {
      var tipoId = U.qs('#refTipo', modal).value;
      var provisoria = { tipo: tipoId, campos: coletar(modal, tipoId) };
      U.qs('#refPreview', modal).innerHTML = P.ABNT.format(provisoria) || '<span class="muted">preencha os campos…</span>';
      var chaveInput = U.qs('#refChave', modal);
      if (!U.trim(chaveInput.value) || chaveInput.dataset.auto === '1') {
        chaveInput.value = P.BibTeX.makeKey(Object.assign({ id: ref.id }, provisoria), P.Store.references());
        chaveInput.dataset.auto = '1';
      }
    }

    U.qs('#refTipo', modal).addEventListener('change', function () {
      var tipo = M.refType(this.value);
      var atuais = coletar(modal, ref.tipo);
      U.qs('#refCampos', modal).innerHTML = tipo.campos.map(function (c) {
        return campoHtml(c, atuais[c.key] != null ? atuais[c.key] : ref.campos[c.key]);
      }).join('');
      ref.tipo = this.value;
      atualizaPreview();
    });
    modal.addEventListener('input', function (ev) {
      if (ev.target.id === 'refChave') ev.target.dataset.auto = '0';
      atualizaPreview();
    });
    atualizaPreview();
  }

  /* ------------------------------------------------------- importação ----- */

  function importarDialog(onDone) {
    var modal = U.modal({
      title: 'Importar referências',
      size: 'lg',
      okLabel: 'Importar',
      body:
        '<div class="callout small" style="margin-bottom:12px">Cole o conteúdo de um arquivo <code>.bib</code> (Google Acadêmico, Scopus, Zotero, Mendeley) ou use o botão para selecionar o arquivo. Entradas com chave já existente são ignoradas.</div>' +
        '<div class="row" style="margin-bottom:10px">' +
          '<button class="btn btn-sm" data-act="arquivo">Selecionar arquivo .bib</button>' +
          '<button class="btn btn-sm" data-act="exemplo">Carregar exemplo</button>' +
        '</div>' +
        '<textarea id="bibInput" rows="12" class="mono" placeholder="@book{silva2026, author = {Silva, João}, title = {...}, year = {2026} }"></textarea>' +
        '<div id="bibResumo" class="small muted" style="margin-top:8px"></div>',
      onOk: function (el) {
        var texto = U.qs('#bibInput', el).value;
        if (!U.trim(texto)) { U.toast('Nada para importar', 'err'); return false; }
        var refs = P.BibTeX.import(texto);
        if (!refs.length) { U.toast('Nenhuma entrada BibTeX reconhecida', 'err'); return false; }
        var r = P.Store.importReferences(refs);
        U.toast(r.novas + ' referência(s) importada(s), ' + r.duplicadas + ' ignorada(s)', 'ok');
        if (onDone) onDone();
      }
    });

    // Os handlers ficam no próprio modal: assim morrem junto com ele.
    U.on(modal, 'click', '[data-act="arquivo"]', function () {
      U.pickFile('.bib,.txt', function (texto) {
        var ta = U.qs('#bibInput', modal);
        if (ta) {
          ta.value = texto;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    U.on(modal, 'click', '[data-act="exemplo"]', function () {
      var ta = U.qs('#bibInput', modal);
      if (ta) {
        ta.value = EXEMPLO_BIB;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    modal.addEventListener('input', function (ev) {
      if (ev.target.id !== 'bibInput') return;
      var refs = P.BibTeX.parse(ev.target.value);
      var resumo = U.qs('#bibResumo', modal);
      if (resumo) resumo.textContent = refs.length + ' entrada(s) reconhecida(s): ' +
        refs.slice(0, 8).map(function (e) { return e.key; }).join(', ') + (refs.length > 8 ? '…' : '');
    });
  }

  var EXEMPLO_BIB = [
    '@book{gil2022,',
    '  author    = {Gil, Antonio Carlos},',
    '  title     = {Como elaborar projetos de pesquisa},',
    '  edition   = {7},',
    '  address   = {São Paulo},',
    '  publisher = {Atlas},',
    '  year      = {2022}',
    '}',
    '',
    '@article{lakatos2021,',
    '  author  = {Lakatos, Eva Maria and Marconi, Marina de Andrade},',
    '  title   = {Fundamentos de metodologia científica},',
    '  journal = {Revista Brasileira de Metodologia},',
    '  volume  = {12},',
    '  number  = {2},',
    '  pages   = {45--62},',
    '  year    = {2021}',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------- listagem - */

  function filtrar(refs, prj) {
    var termo = U.deburr(estado.busca).toLowerCase();
    var citadas = prj ? P.LaTeX.citedKeys(prj) : [];
    return refs.filter(function (r) {
      if (estado.tipo && r.tipo !== estado.tipo) return false;
      if (estado.colecao && r.colecao !== estado.colecao) return false;
      if (estado.apenasUsadas && citadas.indexOf(r.chave) === -1) return false;
      if (!termo) return true;
      var alvo = U.deburr([r.chave, P.ABNT.formatPlain(r), (r.tags || []).join(' '), r.notas].join(' ')).toLowerCase();
      return alvo.indexOf(termo) > -1;
    }).sort(function (a, b) {
      if (estado.ordem === 'recentes') return String(b.createdAt).localeCompare(String(a.createdAt));
      if (estado.ordem === 'ano') return String((b.campos.ano || '')).localeCompare(String(a.campos.ano || ''));
      return P.ABNT.formatPlain(a).localeCompare(P.ABNT.formatPlain(b), 'pt-BR');
    });
  }

  P.Views.biblioteca = {
    titulo: 'Biblioteca de referências',
    wide: true,
    render: function (root) {
      var S = P.Store;
      var prj = S.activeProject();
      var todas = S.references();
      var lista = filtrar(todas, prj);
      var citadas = prj ? P.LaTeX.citedKeys(prj) : [];
      var faltando = prj ? S.missingCitations(prj) : [];
      var porTipo = {};
      todas.forEach(function (r) { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1; });

      root.innerHTML =
        '<div class="page-head"><div class="row"><div class="grow">' +
          '<h1>Biblioteca de referências</h1>' +
          '<p>' + todas.length + ' referência(s) cadastradas · ' + citadas.length + ' citada(s) no trabalho atual. ' +
          'A biblioteca é pessoal e vale para todos os seus trabalhos.</p></div>' +
          '<div class="row tight">' +
            '<button class="btn" data-act="importar">Importar .bib</button>' +
            '<button class="btn" data-act="exportar">Exportar .bib</button>' +
            '<button class="btn btn-primary" data-act="nova">' + U.icon('plus') + 'Nova referência</button>' +
          '</div>' +
        '</div></div>' +

        (faltando.length ? '<div class="callout warn" style="margin-bottom:14px"><strong>Citações sem cadastro:</strong> ' +
          faltando.map(function (k) {
            return '<button class="btn btn-sm" data-criar="' + U.esc(k) + '">' + U.esc(k) + ' +</button>';
          }).join(' ') + '</div>' : '') +

        '<div class="toolbar">' +
          '<div class="search-wrap">' + U.icon('search') +
            '<input id="buscaRef" placeholder="Buscar autor, título, chave, tag ou nota…" value="' + U.esc(estado.busca) + '"></div>' +
          '<select id="filtroTipo" style="max-width:210px"><option value="">Todos os tipos (' + todas.length + ')</option>' +
            M.refTypeList().map(function (t) {
              return '<option value="' + t.id + '"' + (estado.tipo === t.id ? ' selected' : '') + '>' +
                U.esc(t.label) + ' (' + (porTipo[t.id] || 0) + ')</option>';
            }).join('') +
          '</select>' +
          '<select id="filtroColecao" style="max-width:180px"><option value="">Todas as coleções</option>' +
            (S.state.colecoes || []).map(function (c) {
              return '<option value="' + U.esc(c) + '"' + (estado.colecao === c ? ' selected' : '') + '>' + U.esc(c) + '</option>';
            }).join('') +
          '</select>' +
          '<select id="ordem" style="max-width:170px">' +
            '<option value="alfabetica"' + (estado.ordem === 'alfabetica' ? ' selected' : '') + '>A–Z (ABNT)</option>' +
            '<option value="recentes"' + (estado.ordem === 'recentes' ? ' selected' : '') + '>Mais recentes</option>' +
            '<option value="ano"' + (estado.ordem === 'ano' ? ' selected' : '') + '>Ano (desc.)</option>' +
          '</select>' +
          '<label class="check" style="margin:0"><input type="checkbox" id="apenasUsadas"' + (estado.apenasUsadas ? ' checked' : '') + '>' +
            '<span>apenas citadas</span></label>' +
        '</div>' +

        (lista.length
          ? '<div class="card flush">' + lista.map(function (r) { return itemHtml(r, citadas); }).join('') + '</div>'
          : '<div class="empty"><h3>' + (todas.length ? 'Nenhuma referência para este filtro' : 'Biblioteca vazia') + '</h3>' +
            '<p>' + (todas.length ? 'Ajuste a busca ou os filtros.' : 'Cadastre manualmente ou importe um arquivo .bib do Google Acadêmico, Zotero ou Mendeley.') + '</p>' +
            '<div class="row" style="justify-content:center">' +
              '<button class="btn btn-primary" data-act="nova">Nova referência</button>' +
              '<button class="btn" data-act="importar">Importar .bib</button>' +
            '</div></div>');

      /* ---------------------------------------------------------- eventos - */

      function recarrega() { P.App.refresh(); }

      U.qs('#buscaRef', root).addEventListener('input', U.debounce(function () {
        estado.busca = this.value;
        recarrega();
        var input = U.qs('#buscaRef');
        if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }, 260));

      ['filtroTipo', 'filtroColecao', 'ordem'].forEach(function (id) {
        var el = U.qs('#' + id, root);
        if (!el) return;
        el.addEventListener('change', function () {
          estado[id === 'filtroTipo' ? 'tipo' : id === 'filtroColecao' ? 'colecao' : 'ordem'] = this.value;
          recarrega();
        });
      });
      var chk = U.qs('#apenasUsadas', root);
      if (chk) chk.addEventListener('change', function () { estado.apenasUsadas = this.checked; recarrega(); });

      U.on(root, 'click', '[data-act="nova"]', function () { editarDialog(null, recarrega); });
      U.on(root, 'click', '[data-act="importar"]', function () { importarDialog(recarrega); });
      U.on(root, 'click', '[data-act="exportar"]', function () {
        U.download('referencias.bib', P.BibTeX.file(todas, 'Biblioteca completa'), 'text/plain;charset=utf-8');
      });

      U.on(root, 'click', '[data-criar]', function (ev, el) {
        var chave = el.getAttribute('data-criar');
        var ref = M.newReference({ chave: chave });
        var ano = /(\d{4})/.exec(chave);
        if (ano) ref.campos.ano = ano[1];
        var sobrenome = chave.replace(/\d+[a-z]?$/, '');
        if (sobrenome) ref.campos.autores = M.parseAuthors([U.titleCase(sobrenome)]);
        editarDialog(ref, recarrega);
      });

      U.on(root, 'click', '[data-ref]', function (ev, el) {
        var ref = S.reference(el.closest('[data-ref]').getAttribute('data-ref'));
        var act = el.getAttribute('data-act');
        if (!ref || !act) return;
        if (act === 'copy-abnt') U.copy(P.ABNT.formatPlain(ref), 'Referência ABNT');
        else if (act === 'copy-cite') U.copy('\\cite{' + ref.chave + '}', '\\cite{' + ref.chave + '}');
        else if (act === 'copy-textcite') U.copy('\\citeonline{' + ref.chave + '}', '\\citeonline{' + ref.chave + '}');
        else if (act === 'copy-mark') U.copy('[@' + ref.chave + ']', 'Marcação [@' + ref.chave + ']');
        else if (act === 'copy-bib') U.copy(P.BibTeX.entry(ref), 'Entrada BibTeX');
        else if (act === 'editar') editarDialog(ref, recarrega);
        else if (act === 'duplicar') {
          var copia = M.newReference({ tipo: ref.tipo, campos: JSON.parse(JSON.stringify(ref.campos)), tags: ref.tags.slice(), colecao: ref.colecao });
          S.addReference(copia);
          recarrega();
        } else if (act === 'excluir') {
          U.confirm('Excluir a referência "' + ref.chave + '" da biblioteca?', function () {
            S.deleteReference(ref.id);
            U.toast('Referência excluída');
            recarrega();
          }, { okLabel: 'Excluir' });
        }
      });
    }
  };

  function itemHtml(ref, citadas) {
    var usada = citadas.indexOf(ref.chave) > -1;
    var faltando = M.validateReference(ref);
    return '<div class="ref-item" data-ref="' + ref.id + '">' +
      '<div>' +
        '<div class="ref-abnt">' + P.ABNT.format(ref) + '</div>' +
        '<div class="ref-meta">' +
          '<span class="ref-key">' + U.esc(ref.chave) + '</span>' +
          '<span class="chip">' + U.esc(M.refType(ref.tipo).label) + '</span>' +
          (usada ? '<span class="chip ok">citada no trabalho</span>' : '') +
          (ref.colecao ? '<span class="chip outline">' + U.esc(ref.colecao) + '</span>' : '') +
          (ref.tags || []).map(function (t) { return '<span class="chip">' + U.esc(t) + '</span>'; }).join('') +
          (faltando.length ? '<span class="chip warn" title="' + U.esc(faltando.join(', ')) + '">incompleta</span>' : '') +
        '</div>' +
        (ref.notas ? '<div class="muted small" style="margin-top:6px">' + U.esc(ref.notas) + '</div>' : '') +
      '</div>' +
      '<div class="ref-tools">' +
        '<button class="btn btn-sm" data-act="copy-mark" title="Copiar marcação para o editor">[@chave]</button>' +
        '<button class="btn btn-sm" data-act="copy-cite" title="Copiar \\cite">\\cite</button>' +
        '<button class="btn btn-sm" data-act="copy-bib" title="Copiar entrada BibTeX">.bib</button>' +
        '<button class="btn btn-sm" data-act="copy-abnt" title="Copiar referência formatada">ABNT</button>' +
        '<button class="btn btn-sm" data-act="editar">editar</button>' +
        '<button class="btn btn-sm btn-ghost" data-act="duplicar" title="Duplicar">+</button>' +
        '<button class="btn btn-sm btn-ghost btn-danger" data-act="excluir" title="Excluir">' + U.icon('trash') + '</button>' +
      '</div>' +
    '</div>';
  }
})(window.Portal = window.Portal || {});
