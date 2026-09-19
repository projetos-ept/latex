/**
 * =============================================================================
 * Portal TCC ABNT — API (Cloudflare Worker)
 * -----------------------------------------------------------------------------
 * Bindings esperados (ver wrangler.toml):
 *   DB          -> Cloudflare D1   (esquema em database/migrations/0001_init.sql)
 *   ARQUIVOS    -> Cloudflare R2   (PDFs, imagens, anexos)
 * Segredos (wrangler secret put ...):
 *   ADMIN_SENHA -> senha do login administrativo
 *   TOKEN_SEGREDO -> chave HMAC para assinar os tokens de sessão (opcional;
 *                    na ausência dela, ADMIN_SENHA é usada)
 * Variáveis opcionais:
 *   ORIGENS_PERMITIDAS -> lista separada por vírgula (padrão: "*")
 *
 * Rotas
 *   GET    /api/health
 *   POST   /api/auth/login            { senha }            -> { token, expira }
 *   GET    /api/projects                                   -> { projects: [...] }
 *   GET    /api/projects/:id                               -> { project }
 *   PUT    /api/projects/:id          projeto completo      -> { ok }
 *   DELETE /api/projects/:id
 *   GET    /api/references                                 -> { references: [...] }
 *   PUT    /api/references/:id        referência            -> { ok }
 *   DELETE /api/references/:id
 *   POST   /api/files                 multipart (file)      -> { chave, url }
 *   GET    /api/files?projectId=...                        -> { files: [...] }
 *   GET    /api/files/:chave                               -> objeto do R2
 *   DELETE /api/files/:chave
 * =============================================================================
 */

// Carimbo da versão publicada. AUMENTE a cada alteração neste arquivo: é o que
// permite confirmar, por GET /api/health, se o deploy trouxe o código novo.
const BUILD = '2026-09-19.3';

const TOKEN_TTL = 60 * 60 * 12;      // validade do token de sessão
const LOGIN_JANELA_MIN = 15;         // janela de contagem de tentativas
const LOGIN_MAX_FALHAS = 10;         // falhas por IP antes do bloqueio temporário

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env, request) });
    }

    try {
      const resposta = await rotear(request, env, url);
      const headers = cors(env, request);
      resposta.headers.forEach((v, k) => headers.set(k, v));
      return new Response(resposta.body, { status: resposta.status, headers });
    } catch (err) {
      return json({ error: err.message || 'erro interno' }, err.status || 500, env, request);
    }
  }
};

/* ------------------------------------------------------------------ router -- */

async function rotear(request, env, url) {
  const partes = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (partes[0] !== 'api') return json({ error: 'rota desconhecida' }, 404, env, request);

  const recurso = partes[1] || '';
  const id = partes.slice(2).join('/');
  const metodo = request.method;

  if (recurso === 'health') {
    return json({
      ok: true,
      servico: 'portal-tcc-abnt',
      versao: '1.0.0',
      build: BUILD,
      d1: !!env.DB,
      r2: !!env.ARQUIVOS,
      at: new Date().toISOString()
    }, 200, env, request);
  }

  if (recurso === 'auth' && id === 'login' && metodo === 'POST') {
    return await login(request, env);
  }

  // Todas as rotas seguintes exigem sessão válida.
  await exigirAuth(request, env);

  if (recurso === 'projects') {
    if (metodo === 'GET' && !id) return await listarProjetos(env);
    if (metodo === 'GET') return await obterProjeto(env, id);
    if (metodo === 'PUT') return await salvarProjeto(request, env, id);
    if (metodo === 'DELETE') return await excluirProjeto(env, id);
  }

  if (recurso === 'references') {
    if (metodo === 'GET' && !id) return await listarReferencias(env);
    if (metodo === 'PUT') return await salvarReferencia(request, env, id);
    if (metodo === 'DELETE') return await excluirReferencia(env, id);
  }

  if (recurso === 'files') {
    if (metodo === 'POST') return await enviarArquivo(request, env);
    if (metodo === 'GET' && !id) return await listarArquivos(env, url);
    if (metodo === 'GET') return await baixarArquivo(env, id);
    if (metodo === 'DELETE') return await excluirArquivo(env, id);
  }

  return json({ error: 'rota desconhecida: ' + metodo + ' ' + url.pathname }, 404, env, request);
}

/* -------------------------------------------------------------------- auth -- */

async function login(request, env) {
  const corpo = await lerJson(request);
  if (!env.ADMIN_SENHA) {
    return json({ error: 'ADMIN_SENHA não configurada no Worker' }, 503, env, request);
  }
  if (await bloqueadoPorTentativas(env, request)) {
    await registrar(env, 'login_bloqueado', request);
    return json({
      error: 'muitas tentativas. Aguarde ' + LOGIN_JANELA_MIN + ' minutos e tente novamente.'
    }, 429, env, request);
  }
  if (!corpo.senha || !igualdadeConstante(String(corpo.senha), env.ADMIN_SENHA)) {
    await registrar(env, 'login_falhou', request);
    return json({ error: 'senha inválida' }, 401, env, request);
  }
  const expira = Math.floor(Date.now() / 1000) + TOKEN_TTL;
  const token = await assinarToken('usr_admin', expira, env);
  await registrar(env, 'login_ok', request);
  return json({ token, expira, papel: 'admin' }, 200, env, request);
}

/** Conta falhas recentes do mesmo IP para frear tentativa de força bruta. */
async function bloqueadoPorTentativas(env, request) {
  if (!env.DB) return false;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!ip) return false;
  try {
    const linha = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM audit_log
        WHERE acao = 'login_falhou' AND ip = ?1
          AND at > datetime('now', ?2)`
    ).bind(ip, '-' + LOGIN_JANELA_MIN + ' minutes').first();
    return !!linha && linha.n >= LOGIN_MAX_FALHAS;
  } catch (e) {
    return false; // indisponibilidade do log nunca deve impedir o login legítimo
  }
}

/** Comparação em tempo constante, para não vazar o tamanho/prefixo da senha. */
function igualdadeConstante(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length, 1);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function exigirAuth(request, env) {
  const cabecalho = request.headers.get('Authorization') || '';
  const token = cabecalho.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw httpError(401, 'token ausente');
  const ok = await validarToken(token, env);
  if (!ok) throw httpError(401, 'token inválido ou expirado');
  return ok;
}

function segredo(env) {
  return env.TOKEN_SEGREDO || env.ADMIN_SENHA || 'portal-tcc-sem-segredo';
}

async function hmac(dados, env) {
  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segredo(env)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const assinatura = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(dados));
  return b64url(assinatura);
}

async function assinarToken(sub, expira, env) {
  const payload = sub + '.' + expira;
  return payload + '.' + await hmac(payload, env);
}

async function validarToken(token, env) {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [sub, expira, assinatura] = partes;
  if (Number(expira) < Math.floor(Date.now() / 1000)) return null;
  const esperada = await hmac(sub + '.' + expira, env);
  if (esperada.length !== assinatura.length) return null;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ assinatura.charCodeAt(i);
  return diff === 0 ? { sub } : null;
}

function b64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ---------------------------------------------------------------- projetos -- */

async function listarProjetos(env) {
  const db = exigirDb(env);
  const { results } = await db.prepare(
    'SELECT * FROM projects ORDER BY updated_at DESC LIMIT 200'
  ).all();
  const projetos = [];
  for (const linha of results || []) {
    projetos.push(await montarProjeto(db, linha));
  }
  return respostaJson({ projects: projetos });
}

async function obterProjeto(env, id) {
  const db = exigirDb(env);
  const linha = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!linha) throw httpError(404, 'projeto não encontrado');
  return respostaJson({ project: await montarProjeto(db, linha) });
}

async function montarProjeto(db, linha) {
  const { results } = await db.prepare(
    'SELECT * FROM chapters WHERE project_id = ? ORDER BY ordem ASC'
  ).bind(linha.id).all();

  return {
    id: linha.id,
    createdAt: linha.created_at,
    updatedAt: linha.updated_at,
    meta: parse(linha.meta, {}),
    opcoes: parse(linha.opcoes, {}),
    refsUsadas: parse(linha.refs_usadas, []),
    historico: [],
    blocks: (results || []).map((c) => ({
      id: c.id,
      key: c.chave,
      titulo: c.titulo,
      tipo: c.tipo,
      nivel: c.nivel,
      arquivo: c.arquivo,
      conteudo: c.conteudo,
      dica: c.dica || '',
      incluir: !!c.incluir,
      numerado: !!c.numerado,
      comando: c.comando || '',
      versao: c.versao,
      updatedAt: c.updated_at,
      historico: []
    }))
  };
}

async function salvarProjeto(request, env, id) {
  const db = exigirDb(env);
  const prj = await lerJson(request);
  if (!prj || !prj.meta) throw httpError(400, 'projeto inválido');
  const meta = prj.meta;
  const agora = prj.updatedAt || new Date().toISOString();

  await db.prepare(
    `INSERT INTO projects
       (id, titulo, subtitulo, nivel, autor, instituicao, curso, orientador, ano,
        meta, opcoes, refs_usadas, created_at, updated_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)
     ON CONFLICT(id) DO UPDATE SET
       titulo = ?2, subtitulo = ?3, nivel = ?4, autor = ?5, instituicao = ?6,
       curso = ?7, orientador = ?8, ano = ?9, meta = ?10, opcoes = ?11,
       refs_usadas = ?12, updated_at = ?14`
  ).bind(
    id, meta.titulo || '(sem título)', meta.subtitulo || '', meta.nivel || 'graduacao',
    meta.autor || '', meta.instituicao || '', meta.curso || '', meta.orientador || '',
    String(meta.ano || ''), JSON.stringify(meta), JSON.stringify(prj.opcoes || {}),
    JSON.stringify(prj.refsUsadas || []), prj.createdAt || agora, agora
  ).run();

  const blocos = Array.isArray(prj.blocks) ? prj.blocks : [];
  const idsMantidos = blocos.map((b) => b.id);

  const comandos = blocos.map((b, i) => db.prepare(
    `INSERT INTO chapters
       (id, project_id, ordem, chave, titulo, tipo, nivel, arquivo, conteudo, dica,
        incluir, numerado, comando, versao, updated_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
     ON CONFLICT(id) DO UPDATE SET
       ordem = ?3, chave = ?4, titulo = ?5, tipo = ?6, nivel = ?7, arquivo = ?8,
       conteudo = ?9, dica = ?10, incluir = ?11, numerado = ?12, comando = ?13,
       versao = ?14, updated_at = ?15`
  ).bind(
    b.id, id, i, b.key || '', b.titulo || '', b.tipo || 'capitulo', b.nivel || 1,
    b.arquivo || '', b.conteudo || '', b.dica || '',
    b.incluir === false ? 0 : 1, b.numerado === false ? 0 : 1, b.comando || '',
    b.versao || 1, b.updatedAt || agora
  ));

  // Remove blocos apagados no cliente.
  if (idsMantidos.length) {
    const marcas = idsMantidos.map(() => '?').join(',');
    comandos.push(db.prepare(
      `DELETE FROM chapters WHERE project_id = ? AND id NOT IN (${marcas})`
    ).bind(id, ...idsMantidos));
  } else {
    comandos.push(db.prepare('DELETE FROM chapters WHERE project_id = ?').bind(id));
  }

  // Histórico: grava as versões enviadas que ainda não existem.
  for (const b of blocos) {
    for (const h of (b.historico || []).slice(0, 10)) {
      comandos.push(db.prepare(
        `INSERT OR IGNORE INTO history (id, project_id, chapter_id, versao, autor, conteudo, chars, at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`
      ).bind(
        b.id + ':' + h.versao, id, b.id, h.versao || 0, h.autor || '',
        h.conteudo || '', h.chars || 0, h.at || agora
      ));
    }
  }

  await db.batch(comandos);
  return respostaJson({ ok: true, id, blocos: blocos.length });
}

async function excluirProjeto(env, id) {
  const db = exigirDb(env);
  await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  return respostaJson({ ok: true });
}

/* ------------------------------------------------------------- referências -- */

async function listarReferencias(env) {
  const db = exigirDb(env);
  const { results } = await db.prepare(
    'SELECT * FROM references_tcc ORDER BY chave ASC LIMIT 2000'
  ).all();
  return respostaJson({
    references: (results || []).map((r) => ({
      id: r.id,
      tipo: r.tipo,
      chave: r.chave,
      campos: parse(r.campos, {}),
      tags: parse(r.tags, []),
      colecao: r.colecao || '',
      notas: r.notas || '',
      favorito: !!r.favorito,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  });
}

async function salvarReferencia(request, env, id) {
  const db = exigirDb(env);
  const ref = await lerJson(request);
  if (!ref || !ref.tipo) throw httpError(400, 'referência inválida');
  const agora = ref.updatedAt || new Date().toISOString();
  await db.prepare(
    `INSERT INTO references_tcc
       (id, user_id, tipo, chave, campos, tags, colecao, notas, favorito, created_at, updated_at)
     VALUES (?1,'usr_admin',?2,?3,?4,?5,?6,?7,?8,?9,?10)
     ON CONFLICT(id) DO UPDATE SET
       tipo = ?2, chave = ?3, campos = ?4, tags = ?5, colecao = ?6,
       notas = ?7, favorito = ?8, updated_at = ?10`
  ).bind(
    id, ref.tipo, ref.chave || id, JSON.stringify(ref.campos || {}),
    JSON.stringify(ref.tags || []), ref.colecao || '', ref.notas || '',
    ref.favorito ? 1 : 0, ref.createdAt || agora, agora
  ).run();
  return respostaJson({ ok: true, id });
}

async function excluirReferencia(env, id) {
  const db = exigirDb(env);
  await db.prepare('DELETE FROM references_tcc WHERE id = ?').bind(id).run();
  return respostaJson({ ok: true });
}

/* ---------------------------------------------------------------- arquivos -- */

async function enviarArquivo(request, env) {
  const bucket = exigirBucket(env);
  const form = await request.formData();
  const arquivo = form.get('file');
  if (!arquivo || typeof arquivo === 'string') throw httpError(400, 'campo "file" ausente');

  const projectId = form.get('projectId') || null;
  const limite = 25 * 1024 * 1024; // 25 MB
  if (arquivo.size > limite) throw httpError(413, 'arquivo acima de 25 MB');

  // files.project_id tem chave estrangeira: enviar antes de sincronizar o
  // projeto gravaria um objeto no R2 que o banco recusaria depois.
  if (projectId && env.DB) {
    const existe = await env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first();
    if (!existe) {
      throw httpError(409, 'projeto ainda não sincronizado no servidor: sincronize antes de enviar arquivos');
    }
  }

  const nome = (arquivo.name || 'arquivo').replace(/[^\w.\-]+/g, '_');
  const chave = (projectId ? projectId + '/' : 'geral/') + Date.now().toString(36) + '-' + nome;

  await bucket.put(chave, arquivo.stream(), {
    httpMetadata: { contentType: arquivo.type || 'application/octet-stream' }
  });

  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO files (chave, project_id, nome, mime, tamanho)
         VALUES (?1,?2,?3,?4,?5)`
      ).bind(chave, projectId, nome, arquivo.type || '', arquivo.size).run();
    } catch (err) {
      // Desfaz o envio para não deixar objeto órfão no bucket.
      await bucket.delete(chave).catch(() => {});
      throw httpError(500, 'falha ao registrar o arquivo: ' + err.message);
    }
  }

  const urlPublica = env.R2_PUBLIC_URL
    ? env.R2_PUBLIC_URL.replace(/\/+$/, '') + '/' + chave
    : '/api/files/' + encodeURIComponent(chave);

  return respostaJson({ ok: true, chave, nome, tamanho: arquivo.size, url: urlPublica });
}

async function listarArquivos(env, url) {
  const db = exigirDb(env);
  const projectId = url.searchParams.get('projectId');
  const consulta = projectId
    ? db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC').bind(projectId)
    : db.prepare('SELECT * FROM files ORDER BY created_at DESC LIMIT 200');
  const { results } = await consulta.all();
  return respostaJson({ files: results || [] });
}

async function baixarArquivo(env, chave) {
  const bucket = exigirBucket(env);
  const objeto = await bucket.get(decodeURIComponent(chave));
  if (!objeto) throw httpError(404, 'arquivo não encontrado');
  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('etag', objeto.httpEtag);
  headers.set('Cache-Control', 'private, max-age=600');
  return new Response(objeto.body, { status: 200, headers });
}

async function excluirArquivo(env, chave) {
  const bucket = exigirBucket(env);
  await bucket.delete(decodeURIComponent(chave));
  if (env.DB) {
    await env.DB.prepare('DELETE FROM files WHERE chave = ?').bind(decodeURIComponent(chave)).run();
  }
  return respostaJson({ ok: true });
}

/* ------------------------------------------------------------------ apoio --- */

function exigirDb(env) {
  if (!env.DB) throw httpError(503, 'binding D1 "DB" não configurado no wrangler.toml');
  return env.DB;
}

function exigirBucket(env) {
  if (!env.ARQUIVOS) throw httpError(503, 'binding R2 "ARQUIVOS" não configurado no wrangler.toml');
  return env.ARQUIVOS;
}

function httpError(status, mensagem) {
  const err = new Error(mensagem);
  err.status = status;
  return err;
}

function parse(texto, padrao) {
  try { return texto ? JSON.parse(texto) : padrao; } catch (e) { return padrao; }
}

async function lerJson(request) {
  try { return await request.json(); } catch (e) { throw httpError(400, 'JSON inválido'); }
}

async function registrar(env, acao, request) {
  if (!env.DB) return;
  try {
    await env.DB.prepare('INSERT INTO audit_log (acao, ip) VALUES (?1, ?2)')
      .bind(acao, request.headers.get('CF-Connecting-IP') || '').run();
  } catch (e) { /* log não deve derrubar a requisição */ }
}

function respostaJson(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function json(dados, status, env, request) {
  const headers = cors(env, request);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(dados), { status: status || 200, headers });
}

function cors(env, request) {
  const permitidas = (env && env.ORIGENS_PERMITIDAS ? env.ORIGENS_PERMITIDAS : '*')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const origem = request ? request.headers.get('Origin') : null;
  const liberada = permitidas.includes('*')
    ? (origem || '*')
    : (origem && permitidas.includes(origem) ? origem : permitidas[0] || '');

  const headers = new Headers();
  if (liberada) headers.set('Access-Control-Allow-Origin', liberada);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}
