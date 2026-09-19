/* ==========================================================================
   Portal TCC ABNT - configuração
   --------------------------------------------------------------------------
   apiBaseUrl  -> URL pública do Cloudflare Worker (api/worker)
   r2PublicUrl -> domínio público do bucket R2, se houver
   Os valores abaixo são apenas o padrão: o que for salvo em Configurações
   tem precedência. Com apiBaseUrl vazio, o portal opera 100% em modo local
   (armazenamento no navegador) e nenhuma chamada de rede é feita.
   ========================================================================== */
(function (P) {
  'use strict';

  var DEFAULTS = {
    appName: 'Portal TCC ABNT',
    version: '1.0.0',

    /* ---- integração remota ---- */
    // Worker publicado em 19/09/2026 (Cloudflare D1 + R2).
    apiBaseUrl: 'https://portal-tcc-api.lucas-batista-biomedico.workers.dev',
    r2PublicUrl: '',         // bucket privado: os arquivos são servidos pelo Worker
    syncEnabled: false,      // ligue em Configurações após autenticar

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
