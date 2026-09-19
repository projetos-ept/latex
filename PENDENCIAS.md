# Pendências

O portal está **funcional e completo em modo local**. As pendências abaixo são
de *infraestrutura* — nenhuma delas impede escrever, citar, gerar o LaTeX ou
exportar para o Overleaf.

---

## 1. API (Cloudflare Worker) — opcional

**Para quê:** sincronizar trabalhos e biblioteca entre computador e celular e
manter uma cópia fora do navegador.

**Estado:** código pronto em `api/worker/src/index.js`, esquema em
`database/migrations/0001_init.sql`, cliente pronto em `portal/js/api.js`.

**Falta:** criar os recursos na conta Cloudflare e colar os identificadores.

```bash
cd api/worker
npm install
wrangler login

wrangler d1 create portal-tcc
#   → copie o database_id para wrangler.toml ([[d1_databases]].database_id)
wrangler d1 execute portal-tcc --remote --file=../../database/migrations/0001_init.sql
wrangler d1 execute portal-tcc --remote --file=../../database/migrations/0002_seed.sql

wrangler r2 bucket create portal-tcc-arquivos

wrangler secret put ADMIN_SENHA     # senha do login administrativo
wrangler secret put TOKEN_SEGREDO   # string aleatória longa (assinatura das sessões)

wrangler deploy                     # imprime a URL do Worker
```

Depois, no portal: **Configurações → API (Cloudflare Worker)**

| Campo | Valor |
|---|---|
| URL do Worker | `https://portal-tcc-api.<subdominio>.workers.dev` |
| Token de sessão | preenchido pelo botão **Autenticar** |
| Sincronização | marcar |

Use **Testar conexão** (chama `/api/health`) antes de ativar.

### Dados que faltam preencher

| Arquivo | Campo | Valor |
|---|---|---|
| `api/worker/wrangler.toml` | `[[d1_databases]].database_id` | `PREENCHER-COM-O-ID-DO-D1` |
| `api/worker/wrangler.toml` | `[[r2_buckets]].bucket_name` | confirmar o nome criado |
| `api/worker/wrangler.toml` | `[vars].ORIGENS_PERMITIDAS` | trocar `*` pelo domínio do portal |
| `api/worker/wrangler.toml` | `[vars].R2_PUBLIC_URL` | só se houver domínio público no bucket |
| segredo | `ADMIN_SENHA` | `wrangler secret put` |
| segredo | `TOKEN_SEGREDO` | `wrangler secret put` |
| `portal/js/config.js` | `apiBaseUrl` | opcional: fixar a URL no código em vez de digitar em Configurações |

## 2. Armazenamento R2 — opcional

**Para quê:** guardar a ficha catalográfica, a folha de aprovação assinada e as
imagens do trabalho.

**Estado:** rotas `POST/GET/DELETE /api/files` implementadas (limite de 25 MB
por arquivo, chave normalizada, registro na tabela `files`).

**Falta:** criar o bucket (comando acima) e, se quiser servir os arquivos por
domínio próprio, publicar o bucket e preencher `R2_PUBLIC_URL`.

Sem R2, coloque as imagens direto na pasta `figuras/` do projeto no Overleaf —
o portal já gera as chamadas `\includegraphics{figuras/...}` corretas.

## 3. Publicação no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` já existe. Falta apenas ativar:
**Settings → Pages → Source: GitHub Actions**.

## 4. Documentos institucionais do trabalho

Fornecidos pela instituição, não pelo portal:

- **ficha catalográfica** — emitida pela biblioteca; inclua o PDF no Overleaf e
  descomente a linha correspondente no `main.tex`;
- **folha de aprovação assinada** — gerada após a defesa; substitui
  `pretextual/folha-de-aprovacao.tex`, que sai como modelo preenchível.

## 5. Evolução prevista (fora do escopo atual)

- multiusuário com orientadores e permissões (tabela `users` e `papel` já
  existem no esquema);
- integrações ORCID, CrossRef e DOI para preencher referências automaticamente;
- comentários do orientador por bloco;
- compilação de PDF no servidor.
