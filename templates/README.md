# templates/

Estruturas de trabalho acadêmico aplicadas pelo portal.

- **`estruturas-abnt.json`** — exportação legível das estruturas de graduação,
  especialização, mestrado e doutorado (títulos dos blocos, tipo, nível,
  arquivo de destino e orientação exibida no editor). É um **arquivo derivado**
  de `portal/js/templates.js`, útil para o Worker, para relatórios ou para
  outras ferramentas; o portal não o lê em tempo de execução.

Para alterar a estrutura padrão de um nível, edite `portal/js/templates.js` e
regenere este arquivo.
