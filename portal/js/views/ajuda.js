/* ==========================================================================
   Tela: Ajuda e normas (marcação do editor, ABNT, fluxo de trabalho)
   ========================================================================== */
(function (P) {
  'use strict';

  var U = P.U;

  var MARCACAO = [
    ['Parágrafo', 'Texto separado por linha em branco', 'parágrafo com recuo de 1,25 cm'],
    ['Seção', '## Fundamentos teóricos', '\\section{Fundamentos teóricos}'],
    ['Subseção', '### Modelos preditivos', '\\subsection{Modelos preditivos}'],
    ['Subseção sem número', '## Considerações*', '\\section*{Considerações}'],
    ['Negrito', '**termo central**', '\\textbf{termo central}'],
    ['Itálico', '*in vitro*', '\\emph{in vitro}'],
    ['Código', '`variavel`', '\\texttt{variavel}'],
    ['Citação indireta', '[@silva2026]', '\\cite{silva2026} → (SILVA, 2026)'],
    ['Citação narrativa', '[@@silva2026]', '\\citeonline{silva2026} → Silva (2026)'],
    ['Citação com página', '[@silva2026, p. 45]', '\\cite[p.~45]{silva2026}'],
    ['Várias obras', '[@silva2026; @gil2022]', '\\cite{silva2026,gil2022}'],
    ['Citação longa (+3 linhas)', '> trecho transcrito', '\\begin{citacao} … \\end{citacao}'],
    ['Lista', '- primeiro item', '\\begin{itemize}\\item …'],
    ['Lista numerada', '1. primeiro item', '\\begin{enumerate}\\item …'],
    ['Figura', '[fig: grafico.png | Distribuição | IBGE (2025)]', 'ambiente figure com \\caption e \\fonte'],
    ['Tabela', '[tab: Perfil | Dados da pesquisa]<br>| Coluna | Coluna |<br>| a | b |', 'ambiente table com booktabs'],
    ['Fórmula', '$R^2 = 0{,}87$', 'matemática preservada como está'],
    ['LaTeX puro', '\\newpage', 'linha copiada sem alteração'],
    ['Comentário', '% nota interna', 'comentário LaTeX (não aparece no PDF)']
  ];

  P.Views.ajuda = {
    titulo: 'Ajuda e normas',

    tabelaMarcacao: function () {
      return '<p class="muted small">Escreva no editor com a marcação da coluna do meio; o portal gera o LaTeX da coluna da direita.</p>' +
        '<table class="data"><thead><tr><th>Recurso</th><th>No editor</th><th>No LaTeX</th></tr></thead><tbody>' +
        MARCACAO.map(function (r) {
          return '<tr><td>' + r[0] + '</td><td class="mono">' + r[1] + '</td><td class="mono muted">' + U.esc(r[2]) + '</td></tr>';
        }).join('') +
        '</tbody></table>';
    },

    render: function (root) {
      root.innerHTML =
        '<div class="page-head"><h1>Ajuda e normas</h1>' +
        '<p>Referência rápida da marcação do editor, das normas ABNT aplicadas e do fluxo até o PDF final.</p></div>' +

        '<div class="card flush" style="margin-bottom:16px">' +
          '<div class="card-head"><h2>Marcação do editor</h2></div>' +
          '<div class="card-body">' + P.Views.ajuda.tabelaMarcacao() + '</div>' +
        '</div>' +

        '<div class="grid cols-2">' +
          '<div class="card">' +
            '<h2>Normas aplicadas</h2>' +
            '<table class="data"><tbody>' +
              norma('NBR 14724:2011', 'Estrutura do trabalho acadêmico: elementos pré-textuais, textuais e pós-textuais; margens 3/2/3/2 cm, fonte 12, espaçamento 1,5.') +
              norma('NBR 6023:2018', 'Elaboração de referências — aplicada na formatação da biblioteca e no .bib.') +
              norma('NBR 10520:2023', 'Citações: sistema autor-data ou numérico, citação direta de até 3 linhas no corpo e longa recuada em 4 cm.') +
              norma('NBR 6028:2021', 'Resumo: parágrafo único, 150 a 500 palavras em trabalhos acadêmicos, seguido de palavras-chave.') +
              norma('NBR 6027 / 6024', 'Sumário e numeração progressiva das seções — gerados automaticamente pelo abnTeX2.') +
            '</tbody></table>' +
          '</div>' +

          '<div class="card">' +
            '<h2>Fluxo recomendado</h2>' +
            '<ol class="soft small" style="margin:0;padding-left:18px;line-height:1.9">' +
              '<li><strong>Dados do trabalho:</strong> preencha capa, folha de rosto e opções de saída.</li>' +
              '<li><strong>Biblioteca:</strong> cadastre ou importe as referências antes de escrever — assim você cita com <code>[@chave]</code> sem interromper a redação.</li>' +
              '<li><strong>Editor:</strong> escreva bloco por bloco; cada bloco guarda versões próprias.</li>' +
              '<li><strong>LaTeX:</strong> revise o código gerado e copie o que precisar.</li>' +
              '<li><strong>Exportar:</strong> baixe o .zip e importe no Overleaf.</li>' +
            '</ol>' +
          '</div>' +

          '<div class="card">' +
            '<h2>Atalhos de teclado</h2>' +
            '<table class="data"><tbody>' +
              norma('Ctrl/Cmd + S', 'Força o salvamento imediato.') +
              norma('E', 'Editor de blocos.') +
              norma('B', 'Biblioteca de referências.') +
              norma('L', 'LaTeX gerado.') +
              norma('X', 'Exportar.') +
              norma('P', 'Painel.') +
            '</tbody></table>' +
            '<p class="muted small" style="margin:10px 0 0">As letras isoladas funcionam quando o cursor não está em um campo de texto.</p>' +
          '</div>' +

          '<div class="card">' +
            '<h2>Dúvidas frequentes</h2>' +
            '<h4>Onde ficam meus dados?</h4>' +
            '<p class="muted small">No seu navegador (localStorage). Nada é enviado a servidores enquanto a sincronização não for configurada. Faça backup no painel administrativo.</p>' +
            '<h4>As citações aparecem como (?) no Overleaf</h4>' +
            '<p class="muted small">Compile novamente: a sequência é pdflatex → bibtex → pdflatex → pdflatex.</p>' +
            '<h4>Preciso do modelo da minha instituição</h4>' +
            '<p class="muted small">Gere com abnTeX2 e substitua apenas o preâmbulo do <code>main.tex</code> pelo modelo institucional — os capítulos e o .bib permanecem válidos. Para o padrão USPSC, troque o modelo em Dados do trabalho.</p>' +
            '<h4>Funciona offline?</h4>' +
            '<p class="muted small">Sim. O portal é uma PWA: depois da primeira visita em HTTPS, pode ser instalado e usado sem internet.</p>' +
          '</div>' +
        '</div>';
    }
  };

  function norma(k, v) {
    return '<tr><td class="nowrap"><strong>' + U.esc(k) + '</strong></td><td class="muted small">' + U.esc(v) + '</td></tr>';
  }
})(window.Portal = window.Portal || {});
