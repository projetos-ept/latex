# Portal TCC ABNT --- Documento de Projeto Completo

## 1. Identificação do Projeto

**Nome:** Portal TCC ABNT

**Categoria:** Plataforma web para criação, organização, gerenciamento e
exportação de trabalhos acadêmicos.

**Objetivo:** Desenvolver um ambiente completo capaz de auxiliar
estudantes, pesquisadores e instituições na criação de Trabalhos de
Conclusão de Curso utilizando normas acadêmicas, ABNT, LaTeX e
integração com Overleaf.

O projeto combina:

-   editor acadêmico;
-   gerenciador de referências;
-   gerador BibTeX;
-   gerador LaTeX;
-   biblioteca documental;
-   painel administrativo;
-   arquitetura serverless;
-   publicação contínua.

------------------------------------------------------------------------

# 2. Visão Geral

O Portal TCC ABNT nasce da necessidade de simplificar a produção
acadêmica.

Atualmente muitos estudantes enfrentam dificuldades com:

-   organização de capítulos;
-   formatação ABNT;
-   criação correta de referências;
-   gerenciamento de citações;
-   configuração do LaTeX;
-   controle de versões;
-   preparação do arquivo final.

A plataforma propõe um fluxo integrado:

    Usuário
       |
       v
    Portal Acadêmico
       |
       +--> Editor de conteúdo
       |
       +--> Banco de referências
       |
       +--> Gerador BibTeX
       |
       +--> Gerador LaTeX
       |
       +--> Projeto Overleaf

------------------------------------------------------------------------

# 3. Objetivos

## Objetivo Geral

Criar uma plataforma completa para desenvolvimento de trabalhos
acadêmicos seguindo padrões ABNT.

## Objetivos Específicos

-   Automatizar criação de referências;
-   Facilitar escrita acadêmica;
-   Gerar documentos LaTeX;
-   Exportar projetos compatíveis com Overleaf;
-   Controlar arquivos acadêmicos;
-   Permitir colaboração futura;
-   Criar uma base reutilizável para instituições.

------------------------------------------------------------------------

# 4. Arquitetura Geral

A arquitetura utiliza separação de responsabilidades:

    Frontend
       |
       |
    API
       |
       |
    Banco de dados
       |
       |
    Armazenamento

## Camadas

### Frontend

Responsável por:

-   interface;
-   formulários;
-   editor;
-   visualização;
-   interação do usuário.

Tecnologias:

-   HTML5;
-   CSS3;
-   JavaScript;
-   PWA.

------------------------------------------------------------------------

### API

Responsável por:

-   autenticação;
-   regras de negócio;
-   validação;
-   comunicação com banco;
-   gerenciamento de arquivos.

Tecnologia:

-   Cloudflare Workers.

------------------------------------------------------------------------

### Banco

Responsável por:

-   usuários;
-   projetos;
-   referências;
-   capítulos;
-   histórico.

Tecnologia:

-   Cloudflare D1.

------------------------------------------------------------------------

### Arquivos

Responsável por:

-   PDFs;
-   imagens;
-   documentos;
-   projetos exportados.

Tecnologia:

-   Cloudflare R2.

------------------------------------------------------------------------

# 5. Estrutura do Projeto

    Portal-TCC-ABNT/

    ├── portal/
    │   ├── index.html
    │   ├── css/
    │   └── js/
    │
    ├── api/
    │   └── worker/
    │
    ├── database/
    │   └── migrations/
    │
    ├── dados/
    │   └── referencias.json
    │
    ├── templates/
    │
    ├── latex/
    │
    ├── projetos/
    │
    ├── documentos/
    │
    ├── historico/
    │
    └── README.md

------------------------------------------------------------------------

# 6. Módulo de Projetos Acadêmicos

Cada usuário poderá criar um projeto:

Exemplo:

    Projeto:
    Análise de Sistemas Educacionais

    Autor:
    Nome do estudante

    Instituição:
    Universidade

    Curso:
    Ciência da Computação

    Ano:
    2026

Cada projeto possui:

-   dados gerais;
-   capítulos;
-   referências;
-   arquivos;
-   histórico.

------------------------------------------------------------------------

# 7. Editor Acadêmico

O editor permite trabalhar por blocos.

Estrutura:

    Projeto

    ├── Elementos pré-textuais
    │
    ├── Introdução
    │
    ├── Fundamentação teórica
    │
    ├── Metodologia
    │
    ├── Resultados
    │
    ├── Discussão
    │
    ├── Conclusão
    │
    └── Referências

Cada bloco possui:

-   título;
-   conteúdo;
-   versão;
-   autor;
-   data.

------------------------------------------------------------------------

# 8. Gerenciamento de Referências

O sistema suporta:

## Livro

Campos:

-   autor;
-   título;
-   edição;
-   editora;
-   ano.

## Artigo

Campos:

-   autores;
-   revista;
-   volume;
-   páginas;
-   ano.

## Site

Campos:

-   autor;
-   endereço;
-   data de acesso.

## Legislação

Campos:

-   órgão;
-   número;
-   data;
-   publicação.

## Norma Técnica

Campos:

-   instituição;
-   código;
-   ano.

## Trabalho acadêmico

Campos:

-   autor;
-   instituição;
-   curso;
-   orientador.

## Capítulo

Campos:

-   autor;
-   obra;
-   páginas.

## Evento

Campos:

-   evento;
-   local;
-   ano.

## Vídeo

Campos:

-   autor;
-   plataforma;
-   endereço.

------------------------------------------------------------------------

# 9. Motor BibTeX

O sistema converte automaticamente:

Entrada:

    Autor:
    Silva

    Título:
    Pesquisa Acadêmica

    Ano:
    2026

Saída:

``` bibtex
@book{silva2026,
author={Silva},
title={Pesquisa Acadêmica},
year={2026}
}
```

------------------------------------------------------------------------

# 10. Sistema de Citações

Geração automática:

Citação indireta:

``` latex
\cite{silva2026}
```

Citação narrativa:

``` latex
\textcite{silva2026}
```

------------------------------------------------------------------------

# 11. Geração LaTeX

O sistema gera:

    main.tex

    capitulos/

    introducao.tex

    metodologia.tex

    conclusao.tex

    referencias.bib

Compatível com:

-   abnTeX2;
-   Overleaf;
-   modelos institucionais.

------------------------------------------------------------------------

# 12. Exportação Overleaf

O usuário recebe:

    Projeto_TCC.zip

Conteúdo:

    main.tex

    capitulos/

    referencias/

    figuras/

    README.md

Processo:

1.  baixar arquivo;
2.  importar no Overleaf;
3.  compilar;
4.  gerar PDF.

------------------------------------------------------------------------

# 13. Painel Administrativo

Funções:

-   gerenciamento de usuários;
-   controle de projetos;
-   biblioteca;
-   configurações;
-   relatórios.

------------------------------------------------------------------------

# 14. Autenticação

Modelo inicial:

-   administrador;
-   sessão temporária;
-   controle por token.

Evolução:

-   múltiplos usuários;
-   permissões;
-   grupos;
-   orientadores.

------------------------------------------------------------------------

# 15. Histórico e Versionamento

Cada alteração gera:

    Versão 01

    Versão 02

    Versão 03

Registro:

-   usuário;
-   data;
-   alteração;
-   conteúdo anterior.

------------------------------------------------------------------------

# 16. Banco de Dados

Principais tabelas:

## users

Usuários.

## projects

Projetos acadêmicos.

## chapters

Capítulos.

## references

Referências.

## files

Arquivos.

## history

Histórico.

------------------------------------------------------------------------

# 17. Segurança

Princípios:

-   nenhum segredo no frontend;
-   validação no backend;
-   arquivos privados;
-   controle de acesso;
-   logs.

Proteções:

-   autenticação;
-   CORS;
-   validação de arquivos;
-   controle de permissões.

------------------------------------------------------------------------

# 18. Deploy

Arquitetura:

    GitHub
     |
     +--> Actions
     |
     +--> GitHub Pages

    Cloudflare Worker

    Cloudflare D1

    Cloudflare R2

------------------------------------------------------------------------

# 19. PWA

Recursos:

-   instalação no celular;
-   cache offline;
-   funcionamento básico sem internet;
-   atualização automática.

------------------------------------------------------------------------

# 20. Roadmap

## Versão 1

Base do portal.

## Versão 2

Editor completo.

## Versão 3

Integração institucional.

## Versão 4

Assistente acadêmico inteligente.

------------------------------------------------------------------------

# 21. Futuras Integrações

Possibilidades:

-   ORCID;
-   CrossRef;
-   Google Scholar;
-   bibliotecas digitais;
-   sistemas institucionais.

------------------------------------------------------------------------

# 22. Resultado Esperado

O Portal TCC ABNT será uma plataforma completa capaz de transformar
informações acadêmicas em documentos estruturados, reduzindo erros,
aumentando produtividade e simplificando o processo de criação
científica.
