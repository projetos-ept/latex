# Pendências

Infraestrutura Cloudflare **provisionada e testada em 19/09/2026**. O que resta
está listado no topo; o histórico de implantação fica logo abaixo, como
referência para recriar o ambiente.

---

## Em aberto

### 1. Republicar o Worker após mudanças no código

O Worker foi implantado colando `api/worker/src/index.js` no editor do
dashboard. **Sempre que esse arquivo mudar no repositório, é preciso colar a
versão nova e clicar em Deploy** — o dashboard não acompanha o Git.

Pendente agora: as correções de 19/09/2026 (bloqueio de força bruta no login e
tratamento de upload sem projeto sincronizado) ainda não estão publicadas.

Alternativa definitiva, que elimina a colagem manual: em *Workers & Pages →
portal-tcc-api → Settings → Build*, conectar o repositório GitHub com diretório
raiz `api/worker`. A partir daí o `wrangler.toml` deste repositório (que já tem
o `database_id` correto) passa a comandar os deploys.

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
