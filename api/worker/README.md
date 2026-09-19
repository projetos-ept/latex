# API do Portal TCC ABNT — Cloudflare Worker

API serverless que dá persistência multi-dispositivo ao portal: banco **D1**
(projetos, blocos, referências, histórico) e armazenamento **R2** (PDFs, imagens,
anexos). **O portal funciona sem ela** — o Worker só é necessário para
sincronizar entre dispositivos e para enviar arquivos.

## Requisitos

- Conta Cloudflare (o plano gratuito é suficiente)
- Node.js 18+
- `npm install -g wrangler` (ou `npx wrangler`)

## Implantação

> Ambiente atual: publicado pelo dashboard em 19/09/2026 (ver `PENDENCIAS.md`).
> Ao alterar `src/index.js`, republique — colando o arquivo no editor do
> dashboard ou conectando o repositório em *Settings → Build*.

```bash
cd api/worker
npm install
wrangler login

# 1. banco de dados
wrangler d1 create portal-tcc
#    copie o database_id retornado para wrangler.toml
wrangler d1 execute portal-tcc --remote --file=../../database/migrations/0001_init.sql
wrangler d1 execute portal-tcc --remote --file=../../database/migrations/0002_seed.sql

# 2. armazenamento de arquivos
wrangler r2 bucket create portal-tcc-arquivos

# 3. segredos
wrangler secret put ADMIN_SENHA      # senha do login administrativo
wrangler secret put TOKEN_SEGREDO    # chave aleatória para assinar as sessões

# 4. publicar
wrangler deploy
```

O deploy imprime a URL (`https://portal-tcc-api.<subdominio>.workers.dev`).
Cole-a no portal em **Configurações → API (Cloudflare Worker)**, clique em
**Testar conexão**, depois em **Autenticar** e marque **Sincronização**.

Para desenvolvimento local:

```bash
npm run db:local
wrangler dev          # http://localhost:8787
```

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | diagnóstico: responde se D1 e R2 estão ligados |
| POST | `/api/auth/login` | `{ senha }` → `{ token, expira }` (HMAC-SHA256, 12 h) |
| GET | `/api/projects` | lista projetos com seus blocos |
| GET | `/api/projects/:id` | um projeto |
| PUT | `/api/projects/:id` | grava projeto + blocos + histórico (upsert) |
| DELETE | `/api/projects/:id` | remove projeto e blocos (cascade) |
| GET | `/api/references` | biblioteca completa |
| PUT | `/api/references/:id` | grava referência |
| DELETE | `/api/references/:id` | remove referência |
| POST | `/api/files` | upload multipart (campo `file`, opcional `projectId`) |
| GET | `/api/files?projectId=` | lista arquivos |
| GET | `/api/files/:chave` | baixa o objeto do R2 |
| DELETE | `/api/files/:chave` | remove o objeto |

Todas as rotas, exceto `/api/health` e `/api/auth/login`, exigem
`Authorization: Bearer <token>`.

## Segurança

- Nenhum segredo no frontend: a senha nunca é armazenada no navegador, apenas o
  token de sessão assinado, com validade de 12 horas.
- Tokens são HMAC-SHA256 (`sub.exp.assinatura`), comparados em tempo constante.
- `ORIGENS_PERMITIDAS` deve ser restringido ao domínio do portal em produção
  (ex.: `https://usuario.github.io`).
- Upload limitado a 25 MB por arquivo; o nome é normalizado antes de virar chave.
- `audit_log` registra tentativas de login.
- Força bruta: 10 falhas do mesmo IP em 15 minutos passam a responder `429`
  até a janela expirar (contagem feita sobre `audit_log`; se o banco estiver
  indisponível, o login legítimo não é bloqueado).
- A senha é comparada em tempo constante, sem vazar tamanho ou prefixo.
- Upload valida se o projeto já existe no banco antes de gravar no R2 e desfaz
  o objeto caso o registro em `files` falhe, evitando arquivos órfãos.

## Modelo de dados

Ver `database/migrations/0001_init.sql`. O projeto é gravado de forma híbrida:
colunas consultáveis (`titulo`, `nivel`, `autor`, `updated_at`) mais os
metadados completos em JSON, e cada bloco em uma linha de `chapters` — assim o
banco permanece consultável por SQL sem travar a evolução do formato.

## Estratégia de sincronização

“Último a salvar vence”, comparando `updatedAt` de cada projeto/referência. O
cliente (`portal/js/api.js`) envia o que é mais novo localmente e baixa o que é
mais novo no servidor. Não há merge de conteúdo — para trabalho simultâneo, use
um projeto por autor.
