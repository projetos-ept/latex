/* ==========================================================================
   Portal TCC ABNT - estado e persistência
   Fonte de verdade do portal. Persiste em localStorage (modo offline) e, se
   a API do Worker estiver configurada, sincroniza sob demanda.
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U, M = P.M;
  var KEY = 'portal-tcc-abnt/v1';

  var mem = null; // fallback quando localStorage não está disponível (file://)

  function readRaw() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return mem;
    }
  }

  function writeRaw(data) {
    mem = data;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  var S = {
    state: null,
    listeners: {},
    dirty: false,
    lastSaved: null,
    storageOk: true
  };

  /* --------------------------------------------------------------- eventos - */

  S.on = function (evt, fn) {
    (S.listeners[evt] = S.listeners[evt] || []).push(fn);
    return function () {
      S.listeners[evt] = S.listeners[evt].filter(function (f) { return f !== fn; });
    };
  };

  S.emit = function (evt, payload) {
    (S.listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('[store]', evt, e); }
    });
    if (evt !== '*') S.emit('*', { evt: evt, payload: payload });
  };

  /* ------------------------------------------------------------- ciclo ----- */

  function blank() {
    return {
      version: 1,
      createdAt: U.now(),
      projects: [],
      references: [],
      colecoes: ['Geral'],
      activeProjectId: null,
      settings: {
        apiBaseUrl: '',
        apiToken: '',
        r2PublicUrl: '',
        syncEnabled: false,
        tema: 'auto',
        autor: '',
        instituicao: '',
        curso: '',
        orientador: '',
        cidade: ''
      },
      log: []
    };
  }

  S.init = function () {
    var data = readRaw();
    S.state = data && data.projects ? data : blank();
    // Migrações futuras entram aqui (S.state.version).
    S.storageOk = writeRaw(S.state);
    P.applyConfig({
      apiBaseUrl: S.state.settings.apiBaseUrl || P.configDefaults.apiBaseUrl,
      r2PublicUrl: S.state.settings.r2PublicUrl || P.configDefaults.r2PublicUrl,
      syncEnabled: !!S.state.settings.syncEnabled
    });
    return S.state;
  };

  var persist = U.debounce(function () {
    S.storageOk = writeRaw(S.state);
    S.lastSaved = U.now();
    S.dirty = false;
    S.emit('saved', S.lastSaved);
  }, 350);

  S.save = function (reason) {
    S.dirty = true;
    if (reason) S.log(reason);
    persist();
  };

  S.saveNow = function () {
    S.storageOk = writeRaw(S.state);
    S.lastSaved = U.now();
    S.dirty = false;
    S.emit('saved', S.lastSaved);
  };

  S.log = function (mensagem, extra) {
    S.state.log.unshift(Object.assign({ at: U.now(), mensagem: mensagem }, extra || {}));
    if (S.state.log.length > 300) S.state.log.length = 300;
  };

  /* ---------------------------------------------------------- configurações */

  S.settings = function () { return S.state.settings; };

  S.updateSettings = function (patch) {
    Object.assign(S.state.settings, patch || {});
    P.applyConfig({
      apiBaseUrl: S.state.settings.apiBaseUrl,
      r2PublicUrl: S.state.settings.r2PublicUrl,
      syncEnabled: !!S.state.settings.syncEnabled
    });
    S.save('Configurações atualizadas');
    S.emit('settings', S.state.settings);
  };

  /* -------------------------------------------------------------- projetos - */

  S.projects = function () {
    return S.state.projects.slice().sort(function (a, b) {
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
  };

  S.project = function (id) {
    return S.state.projects.filter(function (p) { return p.id === id; })[0] || null;
  };

  S.activeProject = function () {
    return S.project(S.state.activeProjectId) || S.projects()[0] || null;
  };

  S.setActive = function (id) {
    S.state.activeProjectId = id;
    S.save();
    S.emit('active', id);
  };

  S.createProject = function (data) {
    var prj = M.newProject(data);
    var settings = S.state.settings;
    ['autor', 'instituicao', 'curso', 'orientador', 'cidade'].forEach(function (k) {
      if (!U.trim(prj.meta[k]) && U.trim(settings[k])) prj.meta[k] = settings[k];
    });
    if (!U.trim(prj.meta.area)) prj.meta.area = prj.meta.curso;
    prj.blocks = P.Templates.buildBlocks(prj.meta.nivel);
    S.state.projects.push(prj);
    S.state.activeProjectId = prj.id;
    S.save('Projeto criado: ' + prj.meta.titulo);
    S.emit('projects');
    return prj;
  };

  S.updateProject = function (id, mutator, reason) {
    var prj = S.project(id);
    if (!prj) return null;
    mutator(prj);
    prj.updatedAt = U.now();
    S.save(reason);
    S.emit('project', prj);
    return prj;
  };

  S.deleteProject = function (id) {
    var prj = S.project(id);
    S.state.projects = S.state.projects.filter(function (p) { return p.id !== id; });
    if (S.state.activeProjectId === id) S.state.activeProjectId = (S.state.projects[0] || {}).id || null;
    S.save('Projeto removido: ' + (prj ? prj.meta.titulo : id));
    S.emit('projects');
  };

  S.duplicateProject = function (id) {
    var prj = S.project(id);
    if (!prj) return null;
    var copy = JSON.parse(JSON.stringify(prj));
    copy.id = U.uid('prj');
    copy.meta.titulo = prj.meta.titulo + ' (cópia)';
    copy.createdAt = copy.updatedAt = U.now();
    copy.blocks.forEach(function (b) { b.id = U.uid('blk'); b.historico = []; });
    copy.historico = [];
    S.state.projects.push(copy);
    S.save('Projeto duplicado: ' + copy.meta.titulo);
    S.emit('projects');
    return copy;
  };

  /* ---------------------------------------------------------------- blocos - */

  S.block = function (projectId, blockId) {
    var prj = S.project(projectId);
    if (!prj) return null;
    return prj.blocks.filter(function (b) { return b.id === blockId; })[0] || null;
  };

  /** Salva conteúdo/título do bloco criando versão no histórico. */
  S.updateBlock = function (projectId, blockId, patch, options) {
    options = options || {};
    var prj = S.project(projectId);
    var blk = S.block(projectId, blockId);
    if (!prj || !blk) return null;

    var mudouConteudo = patch.conteudo != null && patch.conteudo !== blk.conteudo;
    if (mudouConteudo && !options.skipHistory) {
      blk.historico.unshift({
        versao: blk.versao,
        at: blk.updatedAt,
        autor: prj.meta.autor || S.state.settings.autor || 'autor',
        conteudo: blk.conteudo,
        chars: U.chars(blk.conteudo)
      });
      var limite = (P.config.historyLimit || 40);
      if (blk.historico.length > limite) blk.historico.length = limite;
      blk.versao += 1;
    }

    Object.assign(blk, patch);
    blk.updatedAt = U.now();
    prj.updatedAt = blk.updatedAt;

    // O autosave (skipHistory) não gera linha na atividade do projeto: quem
    // registra é o snapshot criado ao sair do bloco, evitando entradas dobradas.
    if (mudouConteudo && !options.skipHistory) {
      prj.historico.unshift({
        at: blk.updatedAt, blockId: blk.id, titulo: blk.titulo,
        versao: blk.versao, chars: U.chars(blk.conteudo)
      });
      if (prj.historico.length > 200) prj.historico.length = 200;
    }
    S.save();
    S.emit('block', { projectId: projectId, blockId: blockId });
    return blk;
  };

  /**
   * Registra uma versão no histórico a partir do conteúdo anterior.
   * Usado pelo editor: o autosave grava sem histórico e a versão é criada
   * quando o autor sai do bloco, evitando dezenas de versões por parágrafo.
   */
  S.snapshotBlock = function (projectId, blockId, conteudoAnterior) {
    var prj = S.project(projectId);
    var blk = S.block(projectId, blockId);
    if (!prj || !blk) return null;
    if (conteudoAnterior == null || conteudoAnterior === blk.conteudo) return blk;
    blk.historico.unshift({
      versao: blk.versao,
      at: blk.updatedAt,
      autor: prj.meta.autor || S.state.settings.autor || 'autor',
      conteudo: conteudoAnterior,
      chars: U.chars(conteudoAnterior)
    });
    var limite = (P.config.historyLimit || 40);
    if (blk.historico.length > limite) blk.historico.length = limite;
    blk.versao += 1;
    blk.updatedAt = U.now();
    prj.updatedAt = blk.updatedAt;
    prj.historico.unshift({
      at: blk.updatedAt, blockId: blk.id, titulo: blk.titulo,
      versao: blk.versao, chars: U.chars(blk.conteudo)
    });
    if (prj.historico.length > 200) prj.historico.length = 200;
    S.save();
    S.emit('block', { projectId: projectId, blockId: blockId });
    return blk;
  };

  S.restoreBlockVersion = function (projectId, blockId, index) {
    var blk = S.block(projectId, blockId);
    if (!blk || !blk.historico[index]) return null;
    var snap = blk.historico[index];
    S.updateBlock(projectId, blockId, { conteudo: snap.conteudo });
    S.log('Versão ' + snap.versao + ' restaurada em "' + blk.titulo + '"');
    return blk;
  };

  S.addBlock = function (projectId, spec, afterId) {
    var prj = S.project(projectId);
    if (!prj) return null;
    var blk = M.newBlock(spec);
    var idx = afterId ? prj.blocks.findIndex(function (b) { return b.id === afterId; }) : -1;
    if (idx > -1) prj.blocks.splice(idx + 1, 0, blk);
    else prj.blocks.push(blk);
    prj.updatedAt = U.now();
    S.save('Bloco adicionado: ' + blk.titulo);
    S.emit('blocks', projectId);
    return blk;
  };

  S.removeBlock = function (projectId, blockId) {
    var prj = S.project(projectId);
    if (!prj) return;
    var blk = S.block(projectId, blockId);
    prj.blocks = prj.blocks.filter(function (b) { return b.id !== blockId; });
    prj.updatedAt = U.now();
    S.save('Bloco removido: ' + (blk ? blk.titulo : blockId));
    S.emit('blocks', projectId);
  };

  S.moveBlock = function (projectId, blockId, delta) {
    var prj = S.project(projectId);
    if (!prj) return;
    var i = prj.blocks.findIndex(function (b) { return b.id === blockId; });
    var j = i + delta;
    if (i < 0 || j < 0 || j >= prj.blocks.length) return;
    var tmp = prj.blocks[i];
    prj.blocks[i] = prj.blocks[j];
    prj.blocks[j] = tmp;
    prj.updatedAt = U.now();
    S.save();
    S.emit('blocks', projectId);
  };

  /* ----------------------------------------------------------- referências - */

  S.references = function () {
    return S.state.references.slice().sort(function (a, b) {
      return String(a.chave || '').localeCompare(String(b.chave || ''));
    });
  };

  S.reference = function (id) {
    return S.state.references.filter(function (r) { return r.id === id; })[0] || null;
  };

  S.referenceByKey = function (chave) {
    return S.state.references.filter(function (r) { return r.chave === chave; })[0] || null;
  };

  S.addReference = function (ref) {
    if (!ref.chave) ref.chave = P.BibTeX.makeKey(ref, S.state.references);
    else if (S.state.references.some(function (r) { return r.chave === ref.chave && r.id !== ref.id; })) {
      ref.chave = P.BibTeX.makeKey(ref, S.state.references);
    }
    S.state.references.push(ref);
    if (ref.colecao && S.state.colecoes.indexOf(ref.colecao) === -1) S.state.colecoes.push(ref.colecao);
    S.save('Referência adicionada: ' + ref.chave);
    S.emit('references');
    return ref;
  };

  S.updateReference = function (id, patch) {
    var ref = S.reference(id);
    if (!ref) return null;
    Object.assign(ref, patch);
    ref.updatedAt = U.now();
    if (ref.colecao && S.state.colecoes.indexOf(ref.colecao) === -1) S.state.colecoes.push(ref.colecao);
    S.save('Referência atualizada: ' + ref.chave);
    S.emit('references');
    return ref;
  };

  S.deleteReference = function (id) {
    var ref = S.reference(id);
    S.state.references = S.state.references.filter(function (r) { return r.id !== id; });
    S.state.projects.forEach(function (p) {
      p.refsUsadas = (p.refsUsadas || []).filter(function (rid) { return rid !== id; });
    });
    S.save('Referência removida: ' + (ref ? ref.chave : id));
    S.emit('references');
  };

  S.importReferences = function (list) {
    var novas = 0, duplicadas = 0;
    (list || []).forEach(function (ref) {
      var existente = ref.chave && S.referenceByKey(ref.chave);
      if (existente) { duplicadas++; return; }
      if (!ref.chave) ref.chave = P.BibTeX.makeKey(ref, S.state.references);
      S.state.references.push(ref);
      novas++;
    });
    S.save('Importação de referências: ' + novas + ' nova(s), ' + duplicadas + ' duplicada(s)');
    S.emit('references');
    return { novas: novas, duplicadas: duplicadas };
  };

  /** Marca/desmarca uma referência como usada no projeto. */
  S.toggleRefUsada = function (projectId, refId) {
    var prj = S.project(projectId);
    if (!prj) return;
    prj.refsUsadas = prj.refsUsadas || [];
    var i = prj.refsUsadas.indexOf(refId);
    if (i > -1) prj.refsUsadas.splice(i, 1); else prj.refsUsadas.push(refId);
    prj.updatedAt = U.now();
    S.save();
    S.emit('project', prj);
  };

  /* -------------------------------------------------------------- métricas - */

  S.projectStats = function (prj) {
    if (!prj) return { chars: 0, words: 0, pages: 0, blocos: 0, preenchidos: 0, progresso: 0, citacoes: 0 };
    var chars = 0, words = 0, preenchidos = 0, textuais = 0;
    (prj.blocks || []).forEach(function (b) {
      if (b.incluir === false) return;
      var c = U.chars(b.conteudo);
      chars += c;
      words += U.words(b.conteudo);
      if (b.tipo === 'capitulo') {
        textuais++;
        if (c > 200) preenchidos++;
      }
    });
    var citadas = P.LaTeX.citedKeys(prj);
    return {
      chars: chars,
      words: words,
      pages: U.pages(chars),
      blocos: (prj.blocks || []).length,
      textuais: textuais,
      preenchidos: preenchidos,
      progresso: textuais ? Math.round((preenchidos / textuais) * 100) : 0,
      citacoes: citadas.length
    };
  };

  /** Chaves citadas que não existem na biblioteca. */
  S.missingCitations = function (prj) {
    var keys = P.LaTeX.citedKeys(prj);
    return keys.filter(function (k) { return !S.referenceByKey(k); });
  };

  /* --------------------------------------------------------- backup total -- */

  S.exportAll = function () {
    return JSON.stringify(S.state, null, 2);
  };

  S.importAll = function (json) {
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || !Array.isArray(data.projects)) throw new Error('Arquivo de backup inválido.');
    S.state = Object.assign(blank(), data);
    S.saveNow();
    S.emit('projects');
    S.emit('references');
    return S.state;
  };

  S.reset = function () {
    S.state = blank();
    S.saveNow();
    S.emit('projects');
    S.emit('references');
  };

  P.Store = S;
})(window.Portal = window.Portal || {});
