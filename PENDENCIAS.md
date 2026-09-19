# Pendências

Infraestrutura Cloudflare **provisionada e testada em 19/09/2026**. O que resta
está listado no topo; o histórico de implantação fica logo abaixo, como
referência para recriar o ambiente.

---

## Em aberto

### 1. Publicar o Worker a partir do repositório (elimina a colagem manual)

O Worker hoje é atualizado colando `api/worker/src/index.js` no editor do
dashboard. Isso já corrompeu o código duas vezes: uma colagem quebrou os
acentos e outra perdeu um parêntese, exigindo conserto à mão dentro do editor —
ou seja, não há garantia de que o que está no ar seja idêntico à fonte.

Solução definitiva, em *Workers & Pages → portal-tcc-api → Settings → Build*:
conecte o repositório `projetos-ept/latex`, branch `main`, **diretório raiz
`api/worker`**. A partir daí cada push publica a versão exata do repositório.

Pontos de atenção:

- as `[vars]` do `wrangler.toml` passam a mandar e **sobrescrevem** o que estiver
  no dashboard — por isso `ORIGENS_PERMITIDAS` já está com o valor correto lá;
- os segredos (`ADMIN_SENHA`, `TOKEN_SEGREDO`) **não** são tocados pelo deploy:
  continuam como foram cadastrados;
- o `database_id` no `wrangler.toml` já é o real, então os bindings vêm do
  arquivo.

**Como saber qual código está no ar:** `GET /api/health` devolve o campo
`build`. O valor atual do repositório é `2026-09-19.3`. Se a resposta trouxer
valor diferente (ou nenhum), o deploy não subiu a versão corrente.

### 2. Publicar o portal no GitHub Pages

Em *Settings → Pages*, defina **Source: GitHub Actions**. O workflow
`.github/workflows/deploy-pages.yml` publica a pasta `portal/` como raiz do
site, de modo que o endereço final é `https://projetos-ept.github.io/latex/` —
exatamente a origem já autorizada no Worker. O workflow dispara em push para
`main`, ou seja, após o merge do PR.

### 3. Ativar a sincronização no portal

No portal: **Configurações → API (Cloudflare Worker)** → *Testar conexão* →
*Autenticar* (digite a `ADMIN_SENHA`) → marque **Sincronização**. A URL do
Worker já vem preenchida por `portal/js/config.js`.

### 4. Documentos institucionais do trabalho

Fornecidos pela instituição, não pelo portal:

- **ficha catalográfica** — emitida pela biblioteca; inclua o PDF no Overleaf e
  descomente a linha correspondente no `main.tex`;
- **folha de aprovação assinada** — gerada após a defesa; substitui
  `pretextual/folha-de-aprovacao.tex`, que sai como modelo preenchível.

### 5. Evolução prevista (fora do escopo atual)

- multiusuário com orientadores e permissões (tabela `users` e `papel` já
  existem no esquema);
- integrações ORCID, CrossRef e DOI para preencher referências automaticamente;
- comentários do orientador por bloco;
- compilação de PDF no servidor.

---

## Ambiente provisionado

| Recurso | Valor |
|---|---|
| Worker | `portal-tcc-api` — https://portal-tcc-api.lucas-batista-biomedico.workers.dev |
| Banco D1 | `portal-tcc` — `aec7a4a3-b1ec-47fc-9a18-18c17cccd8b0` (7 tabelas) |
| Bucket R2 | `portal-tcc-arquivos` — privado, servido pelo Worker |
| Bindings | `DB` → D1, `ARQUIVOS` → R2 |
| Variáveis | `ORIGENS_PERMITIDAS = https://projetos-ept.github.io`, `R2_PUBLIC_URL` vazio |
| Segredos | `ADMIN_SENHA`, `TOKEN_SEGREDO` (criptografados no Worker) |

Verificação na implantação: `/api/health` respondeu `d1: true` e `r2: true`;
`/api/projects` sem token respondeu `401`; senha incorreta respondeu `401`
(e não `503`, o que confirma o segredo lido corretamente).

## Como recriar o ambiente por linha de comando

O `wrangler.toml` já contém os identificadores reais, então basta:

```bash
cd api/worker
npm install
wrangler login

# só se for um ambiente novo:
wrangler d1 create portal-tcc      # e atualize database_id no wrangler.toml
wrangler d1 execute portal-tcc --remote --file=../../database/migrations/0001_init.sql
wrangler d1 execute portal-tcc --remote --file=../../database/migrations/0002_seed.sql
wrangler r2 bucket create portal-tcc-arquivos

wrangler secret put ADMIN_SENHA
wrangler secret put TOKEN_SEGREDO
wrangler deploy
```
