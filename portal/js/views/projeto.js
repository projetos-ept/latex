/* ==========================================================================
   Tela: Dados do trabalho (metadados, opções de saída, gestão de projetos)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;

  function field(label, name, value, opts) {
    opts = opts || {};
    return '<div class="field' + (opts.span ? ' span-2' : '') + '">' +
      '<label>' + U.esc(label) + (opts.req ? ' <span class="req">*</span>' : '') + '</label>' +
      (opts.textarea
        ? '<textarea name="' + name + '" rows="' + (opts.rows || 4) + '" placeholder="' + U.esc(opts.ph || '') + '">' + U.esc(value) + '</textarea>'
        : '<input name="' + name + '" value="' + U.esc(value) + '" placeholder="' + U.esc(opts.ph || '') + '">') +
      (opts.help ? '<div class="help">' + opts.help + '</div>' : '') +
      '</div>';
  }

  function check(label, name, checked, help) {
    return '<label class="check"><input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + '>' +
      '<span>' + U.esc(label) + (help ? '<br><span class="muted small">' + U.esc(help) + '</span>' : '') + '</span></label>';
  }

  P.Views.projeto = {
    titulo: 'Dados do trabalho',
    render: function (root) {
      var S = P.Store;
      var prj = S.activeProject();
      if (!prj) {
        root.innerHTML = '<div class="empty"><h3>Nenhum trabalho selecionado</h3>' +
          '<p>Crie um trabalho para preencher a capa, a folha de rosto e as opções de saída.</p>' +
          '<button class="btn btn-primary" data-act="novo">Criar trabalho</button></div>';
        U.on(root, 'click', '[data-act="novo"]', P.App.newProjectDialog);
        return;
      }

      var m = prj.meta, op = prj.opcoes;
      var nivel = M.nivel(m.nivel);

      root.innerHTML =
        '<div class="page-head"><h1>Dados do trabalho</h1>' +
        '<p>Estes campos alimentam a capa, a folha de rosto e o preâmbulo gerados automaticamente no LaTeX.</p></div>' +

        '<div class="split"><div class="stack">' +
          '<div class="card pad-lg" id="metaForm">' +
            '<h2>Identificação</h2>' +
            '<div class="form-grid">' +
              '<div class="field span-2"><label>Nível</label><select name="nivel">' +
                Object.keys(M.NIVEIS).map(function (k) {
                  return '<option value="' + k + '"' + (k === m.nivel ? ' selected' : '') + '>' + U.esc(M.NIVEIS[k].label) + '</option>';
                }).join('') +
              '</select><div class="help">Altera o texto padrão do preâmbulo e o tipo de trabalho. A estrutura já criada é preservada.</div></div>' +
              field('Título', 'titulo', m.titulo, { span: true, req: true }) +
              field('Subtítulo', 'subtitulo', m.subtitulo, { span: true }) +
              field('Autor', 'autor', m.autor, { req: true }) +
              field('Ano', 'ano', m.ano) +
              field('Tipo de trabalho', 'tipoTrabalho', m.tipoTrabalho, { help: 'Padrão do nível: ' + U.esc(nivel.tipoTrabalho) }) +
              field('Título obtido', 'grau', m.grau, { help: 'Ex.: Bacharel, Especialista, Mestre, Doutor' }) +
            '</div>' +

            '<div class="divider-label">Vínculo institucional</div>' +
            '<div class="form-grid">' +
              field('Instituição', 'instituicao', m.instituicao, { span: true, req: true }) +
              field('Unidade / Faculdade', 'unidade', m.unidade, { span: true }) +
              field('Curso / Programa', 'curso', m.curso) +
              field('Área de concentração', 'area', m.area) +
              field('Cidade', 'cidade', m.cidade) +
              field('Departamento', 'departamento', m.departamento || '') +
            '</div>' +

            '<div class="divider-label">Orientação</div>' +
            '<div class="form-grid">' +
              field('Titulação do orientador', 'orientadorTitulo', m.orientadorTitulo, { help: 'Ex.: Prof. Dr.' }) +
              field('Orientador', 'orientador', m.orientador) +
              field('Titulação do coorientador', 'coorientadorTitulo', m.coorientadorTitulo) +
              field('Coorientador', 'coorientador', m.coorientador) +
            '</div>' +

            '<div class="divider-label">Preâmbulo da folha de rosto</div>' +
            field('Texto do preâmbulo', 'preambulo', m.preambulo, {
              span: true, textarea: true, rows: 3,
              ph: nivel.preambulo,
              help: 'Deixe vazio para usar o padrão do nível. Marcadores disponíveis: <code>{curso}</code>, <code>{instituicao}</code>, <code>{grau}</code>, <code>{area}</code>.'
            }) +
            '<div class="row end"><button class="btn btn-primary" data-act="salvar">Salvar dados</button></div>' +
          '</div>' +

          '<div class="card pad-lg" id="opcoesForm">' +
            '<h2>Saída LaTeX</h2>' +
            '<div class="form-grid">' +
              '<div class="field"><label>Modelo (classe)</label><select name="engine">' +
                '<option value="abntex2"' + (op.engine === 'abntex2' ? ' selected' : '') + '>abnTeX2 (recomendado, pronto no Overleaf)</option>' +
                '<option value="uspsc"' + (op.engine === 'uspsc' ? ' selected' : '') + '>Modelo USPSC (requer pasta USPSC-classe)</option>' +
              '</select></div>' +
              '<div class="field"><label>Sistema de citação</label><select name="citacao">' +
                '<option value="alf"' + (op.citacao === 'alf' ? ' selected' : '') + '>Autor-data — (SILVA, 2026)</option>' +
                '<option value="num"' + (op.citacao === 'num' ? ' selected' : '') + '>Numérico — [1]</option>' +
              '</select></div>' +
            '</div>' +
            '<div class="divider-label">Elementos opcionais</div>' +
            '<div class="form-grid">' +
              '<div>' +
                check('Impressão frente e verso', 'frenteEVerso', op.frenteEVerso, 'twoside — usual em mestrado e doutorado') +
                check('Lista de ilustrações (figuras)', 'listaFiguras', op.listaFiguras) +
                check('Lista de tabelas', 'listaTabelas', op.listaTabelas) +
              '</div>' +
              '<div>' +
                check('Lista de abreviaturas e siglas', 'listaSiglas', op.listaSiglas) +
                check('Lista de símbolos', 'listaSimbolos', op.listaSimbolos) +
                check('Errata', 'errata', op.errata) +
                check('Ficha catalográfica', 'fichaCatalografica', op.fichaCatalografica, 'fornecida pela biblioteca da instituição') +
              '</div>' +
            '</div>' +
            '<div class="row end"><button class="btn btn-primary" data-act="salvar-opcoes">Salvar opções</button></div>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card">' +
            '<h2>Trabalhos</h2>' +
            '<div class="stack" style="gap:8px">' +
            S.projects().map(function (p) {
              var ativo = p.id === prj.id;
              var st = S.projectStats(p);
              return '<div class="card clickable" data-prj="' + p.id + '" style="padding:11px' + (ativo ? ';border-color:var(--accent)' : '') + '">' +
                '<div class="row tight" style="justify-content:space-between"><strong class="truncate">' + U.esc(p.meta.titulo) + '</strong>' +
                (ativo ? '<span class="chip accent">ativo</span>' : '') + '</div>' +
                '<div class="muted small">' + U.esc(M.nivel(p.meta.nivel).curto) + ' · ' + st.words.toLocaleString('pt-BR') + ' palavras · ' + U.fromNow(p.updatedAt) + '</div>' +
                '</div>';
            }).join('') +
            '</div>' +
            '<div class="row tight" style="margin-top:12px">' +
              '<button class="btn btn-sm" data-act="duplicar">Duplicar atual</button>' +
              '<button class="btn btn-sm btn-danger" data-act="excluir">Excluir atual</button>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<h2>Estrutura</h2>' +
            '<p class="muted small">' + prj.blocks.length + ' blocos: ' +
              prj.blocks.filter(function (b) { return b.tipo === 'pretextual'; }).length + ' pré-textuais, ' +
              prj.blocks.filter(function (b) { return b.tipo === 'capitulo'; }).length + ' textuais, ' +
              prj.blocks.filter(function (b) { return b.tipo === 'postextual'; }).length + ' pós-textuais.</p>' +
            '<button class="btn btn-sm btn-block" data-act="reaplicar">Reaplicar estrutura do nível</button>' +
            '<div class="help" style="margin-top:6px">Adiciona os blocos padrão do nível que ainda não existem. Nada é apagado.</div>' +
          '</div>' +
        '</div></div>';

      /* -------------------------------------------------------- handlers -- */

      U.on(root, 'click', '[data-act="salvar"]', function () {
        var form = U.qs('#metaForm', root);
        var data = {};
        U.qsa('[name]', form).forEach(function (i) { data[i.name] = U.trim(i.value); });
        S.updateProject(prj.id, function (p) {
          Object.assign(p.meta, data);
          if (data.nivel && data.nivel !== m.nivel) {
            var n = M.nivel(data.nivel);
            if (!U.trim(data.tipoTrabalho) || data.tipoTrabalho === M.nivel(m.nivel).tipoTrabalho) p.meta.tipoTrabalho = n.tipoTrabalho;
            if (!U.trim(data.grau) || data.grau === M.nivel(m.nivel).grau) p.meta.grau = n.grau;
          }
        }, 'Dados do trabalho atualizados');
        U.toast('Dados salvos', 'ok');
        P.App.refresh();
      });

      U.on(root, 'click', '[data-act="salvar-opcoes"]', function () {
        var form = U.qs('#opcoesForm', root);
        S.updateProject(prj.id, function (p) {
          U.qsa('[name]', form).forEach(function (i) {
            p.opcoes[i.name] = i.type === 'checkbox' ? i.checked : U.trim(i.value);
          });
        }, 'Opções de saída atualizadas');
        U.toast('Opções salvas', 'ok');
        P.App.refresh();
      });

      U.on(root, 'click', '[data-prj]', function (ev, el) {
        S.setActive(el.getAttribute('data-prj'));
        P.App.refresh();
      });

      U.on(root, 'click', '[data-act="duplicar"]', function () {
        var copy = S.duplicateProject(prj.id);
        U.toast('Trabalho duplicado', 'ok');
        S.setActive(copy.id);
        P.App.refresh();
      });

      U.on(root, 'click', '[data-act="excluir"]', function () {
        U.confirm('Excluir "' + prj.meta.titulo + '" e todos os seus blocos? A biblioteca de referências não é afetada.', function () {
          S.deleteProject(prj.id);
          U.toast('Trabalho excluído');
          P.App.refresh();
        }, { okLabel: 'Excluir' });
      });

      U.on(root, 'click', '[data-act="reaplicar"]', function () {
        var existentes = {};
        prj.blocks.forEach(function (b) { existentes[b.key] = true; });
        var novos = P.Templates.buildBlocks(prj.meta.nivel).filter(function (b) { return !existentes[b.key]; });
        if (!novos.length) { U.toast('A estrutura já está completa'); return; }
        S.updateProject(prj.id, function (p) { p.blocks = p.blocks.concat(novos); },
          novos.length + ' bloco(s) adicionados pela estrutura do nível');
        U.toast(novos.length + ' bloco(s) adicionados', 'ok');
        P.App.refresh();
      });
    }
  };
})(window.Portal = window.Portal || {});
