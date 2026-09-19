/* ==========================================================================
   Portal TCC ABNT - cliente da API (Cloudflare Worker + D1 + R2)
   --------------------------------------------------------------------------
   Este módulo já está completo: o que falta é apenas APONTAR a URL do Worker
   em Configurações (ou em js/config.js). Sem URL, o portal permanece em modo
   local e nenhuma chamada é feita.
   Contrato implementado pelo Worker em api/worker/src/index.js.
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;
  var A = { online: null, lastError: null };

  function cfg() { return P.config; }

  A.configured = function () { return !!U.trim(cfg().apiBaseUrl); };
  A.enabled = function () { return A.configured() && !!cfg().syncEnabled; };

  function url(path) {
    var base = U.trim(cfg().apiBaseUrl).replace(/\/+$/, '');
    return base + (path.charAt(0) === '/' ? path : '/' + path);
  }

  function request(method, path, body) {
    if (!A.configured()) {
      return Promise.reject(new Error('API não configurada. Informe a URL do Worker em Configurações.'));
    }
    var headers = { 'Content-Type': 'application/json' };
    var token = U.trim((P.Store.settings() || {}).apiToken);
    if (token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(url(path), {
      method: method,
      headers: headers,
      body: body == null ? undefined : JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
        if (!res.ok) {
          var msg = (data && (data.error || data.message)) || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    }).then(function (data) {
      A.online = true;
      A.lastError = null;
      return data;
    }, function (err) {
      A.online = false;
      A.lastError = err.message;
      throw err;
    });
  }

  A.get = function (path) { return request('GET', path); };
  A.post = function (path, body) { return request('POST', path, body); };
  A.put = function (path, body) { return request('PUT', path, body); };
  A.del = function (path) { return request('DELETE', path); };

  /* ---------------------------------------------------------------- rotas -- */

  A.health = function () { return A.get('/api/health'); };

  A.login = function (senha) {
    return A.post('/api/auth/login', { senha: senha }).then(function (data) {
      if (data && data.token) P.Store.updateSettings({ apiToken: data.token });
      return data;
    });
  };

  A.listProjects = function () { return A.get('/api/projects'); };
  A.getProject = function (id) { return A.get('/api/projects/' + encodeURIComponent(id)); };
  A.saveProject = function (prj) { return A.put('/api/projects/' + encodeURIComponent(prj.id), prj); };
  A.deleteProject = function (id) { return A.del('/api/projects/' + encodeURIComponent(id)); };

  A.listReferences = function () { return A.get('/api/references'); };
  A.saveReference = function (ref) { return A.put('/api/references/' + encodeURIComponent(ref.id), ref); };
  A.deleteReference = function (id) { return A.del('/api/references/' + encodeURIComponent(id)); };

  /** Envio de arquivo para o R2 através do Worker (multipart simples). */
  A.uploadFile = function (file, projectId) {
    if (!A.configured()) return Promise.reject(new Error('API não configurada.'));
    var form = new FormData();
    form.append('file', file);
    if (projectId) form.append('projectId', projectId);
    var headers = {};
    var token = U.trim((P.Store.settings() || {}).apiToken);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(url('/api/files'), { method: 'POST', headers: headers, body: form })
      .then(function (res) {
        if (!res.ok) throw new Error('Falha no upload (HTTP ' + res.status + ')');
        return res.json();
      });
  };

  A.listFiles = function (projectId) {
    return A.get('/api/files' + (projectId ? '?projectId=' + encodeURIComponent(projectId) : ''));
  };

  A.fileUrl = function (chave) {
    var pub = U.trim(cfg().r2PublicUrl);
    if (pub) return pub.replace(/\/+$/, '') + '/' + chave;
    return url('/api/files/' + encodeURIComponent(chave));
  };

  /* ------------------------------------------------------- sincronização --- */

  /**
   * Sincronização simples do tipo "último a escrever vence" por updatedAt.
   * Retorna um resumo do que foi enviado/baixado.
   */
  A.sync = function () {
    if (!A.enabled()) return Promise.reject(new Error('Sincronização desligada.'));
    var S = P.Store;
    var resumo = { enviados: 0, baixados: 0, refsEnviadas: 0, refsBaixadas: 0 };

    return A.health()
      .then(A.listProjects)
      .then(function (remoto) {
        var remotos = (remoto && remoto.projects) || [];
        var porId = {};
        remotos.forEach(function (p) { porId[p.id] = p; });

        var envios = S.projects().filter(function (local) {
          var r = porId[local.id];
          return !r || String(local.updatedAt) > String(r.updatedAt);
        });
        var baixar = remotos.filter(function (r) {
          var local = S.project(r.id);
          return !local || String(r.updatedAt) > String(local.updatedAt);
        });

        baixar.forEach(function (r) {
          var i = S.state.projects.findIndex(function (p) { return p.id === r.id; });
          if (i > -1) S.state.projects[i] = r; else S.state.projects.push(r);
          resumo.baixados++;
        });
        if (baixar.length) S.saveNow();

        return Promise.all(envios.map(function (p) {
          return A.saveProject(p).then(function () { resumo.enviados++; });
        }));
      })
      .then(A.listReferences)
      .then(function (remoto) {
        var remotas = (remoto && remoto.references) || [];
        var porId = {};
        remotas.forEach(function (r) { porId[r.id] = r; });
        remotas.forEach(function (r) {
          if (!P.Store.reference(r.id)) {
            P.Store.state.references.push(r);
            resumo.refsBaixadas++;
          }
        });
        var envios = P.Store.references().filter(function (local) {
          var r = porId[local.id];
          return !r || String(local.updatedAt) > String(r.updatedAt);
        });
        if (resumo.refsBaixadas) P.Store.saveNow();
        return Promise.all(envios.map(function (r) {
          return A.saveReference(r).then(function () { resumo.refsEnviadas++; });
        }));
      })
      .then(function () {
        P.Store.log('Sincronização concluída', resumo);
        P.Store.emit('projects');
        P.Store.emit('references');
        return resumo;
      });
  };

  P.Api = A;
})(window.Portal = window.Portal || {});
