-- =============================================================================
-- Portal TCC ABNT — dados iniciais (opcional)
-- wrangler d1 execute portal-tcc --file=database/migrations/0002_seed.sql
-- =============================================================================

INSERT OR IGNORE INTO users (id, nome, email, papel)
VALUES ('usr_admin', 'Administrador', NULL, 'admin');
