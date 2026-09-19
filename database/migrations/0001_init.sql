-- =============================================================================
-- Portal TCC ABNT — esquema inicial (Cloudflare D1 / SQLite)
-- Aplicar com:
--   wrangler d1 execute portal-tcc --file=database/migrations/0001_init.sql
--   wrangler d1 execute portal-tcc --remote --file=database/migrations/0001_init.sql
-- =============================================================================

-- Observação: o D1 já aplica integridade referencial e recusa PRAGMAs de
-- configuração no console — por isso nenhum PRAGMA é declarado aqui.

-- ------------------------------------------------------------------ usuários --
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT UNIQUE,
  papel       TEXT NOT NULL DEFAULT 'autor',   -- admin | orientador | autor
  senha_hash  TEXT,                            -- SHA-256 (o portal usa token de sessão)
  instituicao TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------------ projetos --
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  titulo      TEXT NOT NULL,
  subtitulo   TEXT,
  nivel       TEXT NOT NULL DEFAULT 'graduacao', -- graduacao | especializacao | mestrado | doutorado
  autor       TEXT,
  instituicao TEXT,
  curso       TEXT,
  orientador  TEXT,
  ano         TEXT,
  meta        TEXT NOT NULL DEFAULT '{}',        -- metadados completos (JSON)
  opcoes      TEXT NOT NULL DEFAULT '{}',        -- opções de saída LaTeX (JSON)
  refs_usadas TEXT NOT NULL DEFAULT '[]',        -- ids de referências marcadas (JSON)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_user    ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);

-- ------------------------------------------------------ capítulos / blocos ---
CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ordem       INTEGER NOT NULL DEFAULT 0,
  chave       TEXT,
  titulo      TEXT NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'capitulo',  -- pretextual | capitulo | postextual
  nivel       INTEGER NOT NULL DEFAULT 1,        -- 1 capítulo, 2 seção, 3 subseção
  arquivo     TEXT,
  conteudo    TEXT NOT NULL DEFAULT '',
  dica        TEXT,
  incluir     INTEGER NOT NULL DEFAULT 1,
  numerado    INTEGER NOT NULL DEFAULT 1,
  comando     TEXT,
  versao      INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id, ordem);

-- -------------------------------------------------------------- referências --
CREATE TABLE IF NOT EXISTS references_tcc (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL,                     -- livro | artigo | site | ...
  chave       TEXT NOT NULL,                     -- chave de citação (silva2026)
  campos      TEXT NOT NULL DEFAULT '{}',        -- campos do tipo (JSON)
  tags        TEXT NOT NULL DEFAULT '[]',
  colecao     TEXT,
  notas       TEXT,
  favorito    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refs_chave ON references_tcc(user_id, chave);
CREATE INDEX IF NOT EXISTS idx_refs_tipo         ON references_tcc(tipo);

-- ------------------------------------------------------------------ arquivos --
CREATE TABLE IF NOT EXISTS files (
  chave       TEXT PRIMARY KEY,                  -- chave do objeto no R2
  project_id  TEXT REFERENCES projects(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  mime        TEXT,
  tamanho     INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);

-- ------------------------------------------------------------------ histórico -
CREATE TABLE IF NOT EXISTS history (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id  TEXT,
  versao      INTEGER,
  autor       TEXT,
  conteudo    TEXT,
  chars       INTEGER,
  at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_project ON history(project_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_history_chapter ON history(chapter_id, versao DESC);

-- --------------------------------------------------------------------- logs ---
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  acao       TEXT NOT NULL,
  detalhe    TEXT,
  ip         TEXT,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);
