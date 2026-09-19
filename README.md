# Portal TCC ABNT

Plataforma web para escrever **TCC de graduação, monografia de especialização,
dissertação de mestrado e tese de doutorado** em blocos editáveis, com
biblioteca de referências própria, geração de LaTeX em conformidade com a ABNT e
exportação pronta para o Overleaf.

> Funciona inteiramente no navegador: basta abrir `portal/index.html`. Não há
> build, dependências, CDN ou servidor obrigatório — os dados ficam no seu
> computador até que você opte por sincronizar.

---

## O que o portal faz

| Módulo | Entrega |
|---|---|
| **Estrutura automática** | ao criar o trabalho, a estrutura ABNT NBR 14724 do nível escolhido é montada capítulo a capítulo, com orientação de conteúdo em cada bloco |
| **Editor de blocos** | cada capítulo/seção é um bloco independente, com autosave, contagem de palavras, estimativa de páginas e histórico de versões |
| **Cópia rápida para LaTeX** | um clique copia o LaTeX de um bloco, do texto inteiro, do `main.tex` ou do `referencias.bib` |
| **Biblioteca de referências** | 9 tipos (livro, artigo, site, legislação, norma técnica, trabalho acadêmico, capítulo, evento, vídeo), formatação ABNT NBR 6023 em tempo real, coleções, tags e notas de leitura |
| **Motor BibTeX** | gera e importa `.bib` (Google Acadêmico, Zotero, Mendeley, Scopus) com chaves de citação sem colisão |
| **Citações** | `[@chave]` → `\cite` e `[@@chave]` → `\citeonline`, com seletor de citação dentro do editor e alerta de citação sem cadastro |
| **Gerador LaTeX** | `main.tex` + `capitulos/` + `pretextual/` + `postextual/` + `referencias.bib`, nos modelos abnTeX2 ou USPSC |
| **Exportação Overleaf** | `.zip` gerado no navegador, sem dependências externas |
| **Painel administrativo** | trabalhos, relatórios, registro de atividades, backup e restauração |
| **PWA** | instalável no celular e utilizável offline |

## Uso imediato

```bash
git clone https://github.com/projetos-ept/latex.git
cd latex
# abra portal/index.html no navegador — ou sirva localmente:
python3 -m http.server 8080 --directory portal
```

Para publicar: **Settings → Pages → Source: GitHub Actions**. O workflow
`.github/workflows/deploy-pages.yml` verifica os módulos e publica a pasta
`portal/`.

### Primeiros passos no portal

1. **Novo trabalho** — escolha o nível; a estrutura é criada automaticamente.
2. **Biblioteca** — cadastre as referências ou importe `dados/referencias-exemplo.bib`.
3. **Editor** — escreva bloco a bloco, citando com o botão **+ citação**.
4. **LaTeX** — confira o código gerado.
5. **Exportar** — baixe o `.zip` e importe no Overleaf (*New Project → Upload Project*).

### Marcação do editor

| No editor | No LaTeX |
|---|---|
| `## Título` / `### Título` | `\section{}` / `\subsection{}` |
| `**negrito**`, `*itálico*` | `\textbf{}`, `\emph{}` |
| `[@silva2026]` | `\cite{silva2026}` → (SILVA, 2026) |
| `[@@silva2026]` | `\citeonline{silva2026}` → Silva (2026) |
| `[@silva2026, p. 45]` | `\cite[p.~45]{silva2026}` |
| `> trecho` | `\begin{citacao}` (citação longa recuada) |
| `- item` / `1. item` | `itemize` / `enumerate` |
| `[fig: img.png \| legenda \| fonte]` | ambiente `figure` com `\caption` e `\fonte` |
| `[tab: legenda \| fonte]` + linhas `\| a \| b \|` | ambiente `table` com `booktabs` |
| `$x^2$` | matemática preservada |
| linha iniciada por `\` | LaTeX copiado sem alteração |

A referência completa está na tela **Ajuda e normas** do portal.

## Estrutura do repositório

```
portal/                 aplicação (HTML + CSS + JS, sem build)
  index.html            casca da interface
  css/                  tokens, layout e componentes
  js/                   núcleo: models, abnt, bibtex, latex, templates, zip, store, api
  js/views/             telas: painel, projeto, editor, biblioteca, latex, exportar, admin, config, ajuda
  sw.js                 service worker (PWA)
api/worker/             API Cloudflare Worker (D1 + R2) — opcional
database/migrations/    esquema SQL do D1
dados/                  biblioteca de exemplo (.bib e .json)
templates/              estruturas ABNT por nível (JSON derivado)
latex/                  notas sobre os modelos abnTeX2 e USPSC
```

## Arquitetura

```
Navegador (PWA)                Cloudflare (opcional)
┌────────────────────┐         ┌────────────────────┐
│ portal/            │  HTTPS  │ Worker  /api/*     │
│  editor de blocos  │────────▶│  auth (HMAC)       │
│  biblioteca ABNT   │         │  projetos + blocos │──▶ D1 (SQLite)
│  motor LaTeX/BibTeX│         │  referências       │
│  ZIP no cliente    │         │  arquivos          │──▶ R2 (objetos)
│  localStorage      │         └────────────────────┘
└────────────────────┘
```

Sem Worker configurado, tudo permanece no `localStorage` — nenhuma chamada de
rede é feita.

## Normas aplicadas

- **NBR 14724:2011** — estrutura do trabalho acadêmico
- **NBR 6023:2018** — referências
- **NBR 10520:2023** — citações
- **NBR 6028:2021** — resumo
- **NBR 6027 / 6024** — sumário e numeração progressiva

## Situação atual

Frontend, motores ABNT/BibTeX/LaTeX, exportação e Worker estão **implementados**.
A infraestrutura Cloudflare está **provisionada e testada**: Worker
`portal-tcc-api`, banco D1 `portal-tcc` e bucket R2 `portal-tcc-arquivos`, com
os segredos cadastrados. O portal já aponta para essa API por padrão, mas a
sincronização só liga quando você autenticar em **Configurações**.

O que ainda depende de um clique seu está em **[PENDENCIAS.md](PENDENCIAS.md)**
(publicar o Pages, republicar o Worker após mudanças no código e ativar a
sincronização).

## Documentação

- [PENDENCIAS.md](PENDENCIAS.md) — o que falta configurar, passo a passo
- [api/worker/README.md](api/worker/README.md) — implantação e rotas da API
- [Portal_TCC_ABNT_Projeto_Documentacao_Completa.md](Portal_TCC_ABNT_Projeto_Documentacao_Completa.md) — documento de projeto original
- [latex/README.md](latex/README.md) — modelos LaTeX suportados

## Licença

MIT — ver [LICENSE](LICENSE).
