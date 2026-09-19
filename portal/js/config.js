/* ==========================================================================
   Portal TCC ABNT - configuração
   --------------------------------------------------------------------------
   PENDENTE DE PREENCHIMENTO (ver PENDENCIAS.md):
     apiBaseUrl  -> URL pública do Cloudflare Worker (api/worker)
     r2PublicUrl -> domínio público do bucket R2, se houver
   Enquanto apiBaseUrl estiver vazio, o portal opera 100% em modo local
   (armazenamento no navegador). Nada quebra: a sincronização fica desligada
   e pode ser ligada em Configurações sem alterar código.
   ========================================================================== */
(function (P) {
  'use strict';

  var DEFAULTS = {
    appName: 'Portal TCC ABNT',
    version: '1.0.0',

    /* ---- integração remota (pendente) ---- */
    apiBaseUrl: '',          // ex.: 'https://portal-tcc-api.<subdominio>.workers.dev'
    r2PublicUrl: '',         // ex.: 'https://arquivos.seudominio.br'
    syncEnabled: false,      // ligado automaticamente quando apiBaseUrl é definido

    /* ---- comportamento ---- */
    autosaveMs: 900,
    historyLimit: 40,
    defaultEngine: 'abntex2',  // 'abntex2' | 'uspsc'
    defaultCitationStyle: 'alf' // 'alf' (autor-data) | 'num' (numérico)
  };

  // Overrides persistidos em Configurações (localStorage), aplicados sobre os defaults.
  P.config = Object.assign({}, DEFAULTS);
  P.configDefaults = DEFAULTS;

  // Registro das telas (preenchido por js/views/*.js).
  P.Views = P.Views || {};

  P.applyConfig = function (patch) {
    Object.assign(P.config, patch || {});
    P.config.syncEnabled = !!(P.config.apiBaseUrl && P.config.syncEnabled);
    return P.config;
  };
})(window.Portal = window.Portal || {});
