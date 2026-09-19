-- =============================================================================
-- Portal TCC ABNT — dados iniciais
-- O Worker também cria esta linha sozinho ao gravar a primeira referência,
-- então aplicar este arquivo é recomendado, mas não obrigatório.
-- wrangler d1 execute portal-tcc --file=database/migrations/0002_seed.sql
-- =============================================================================

INSERT OR IGNORE INTO users (id, nome, email, papel)
VALUES ('usr_admin', 'Administrador', NULL, 'admin');
