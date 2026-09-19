# latex/

Referências de modelos LaTeX usados pelo portal.

## Modelos suportados

| Modelo | Quando usar | Observação |
|---|---|---|
| **abnTeX2** (padrão) | qualquer TCC, dissertação ou tese | a classe já existe no Overleaf e no TeX Live; nada a instalar |
| **USPSC** | unidades do campus USP de São Carlos (EESC, IAU, ICMC, IFSC, IQSC) | exige a pasta `USPSC-classe/` do Pacote USPSC oficial |

O modelo é escolhido em **Dados do trabalho → Saída LaTeX** e muda apenas o
`main.tex` gerado: capítulos, `referencias.bib` e figuras permanecem iguais.

## Arquivo de referência no repositório

`../USPSC-TCC-modelo-ICMCp.tex` é o modelo oficial do Pacote USPSC (versão
ICMC), mantido aqui como referência do preâmbulo institucional completo — ele
não é consumido pelo portal, que gera o seu próprio `main.tex`.

Para usar o modelo USPSC no Overleaf:

1. baixe o Pacote USPSC em <https://www.tema.sc.usp.br/index.php/modelos-latex>;
2. copie a pasta `USPSC-classe/` para a raiz do projeto exportado pelo portal;
3. compile com `pdfLaTeX`.

## Estrutura gerada pelo portal

```
main.tex            preâmbulo, capa, folha de rosto, montagem do documento
capitulos/          um arquivo .tex por capítulo (\include)
pretextual/         dedicatória, agradecimentos, epígrafe, folha de aprovação
postextual/         apêndices e anexos
referencias.bib     referências em BibTeX (ABNT NBR 6023 via abntex2cite)
figuras/            imagens referenciadas com [fig: arquivo | legenda | fonte]
```

## Compilação

```bash
pdflatex main
bibtex main
pdflatex main
pdflatex main
```
