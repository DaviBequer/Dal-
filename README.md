# Dalê Tarefas

App de tarefas com agenda, focado nas tarefas do **dia a dia** e da **escola**.
Funciona direto no navegador, sem instalação e sem servidor: os dados ficam salvos no próprio navegador (`localStorage`).

## Como usar

Acesse **https://davibequer.github.io/Dal-/** e instale como app:

- **Android (Chrome):** menu ⋮ → *Instalar app* / *Adicionar à tela inicial*.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

O app funciona offline e se atualiza sozinho quando sai uma versão nova.

## Notificações

Toque no 🔔 no topo e permita as notificações. Como o app não tem servidor, o navegador decide quando ele pode rodar:

- **Com o app aberto** (ou em uma aba aberta): o lembrete chega na hora certa.
- **App fechado, Android/Chrome com o app instalado:** o app confere os lembretes em segundo plano periodicamente (o Chrome decide a frequência, em geral algumas vezes por dia), então o aviso pode chegar com atraso.

Lembretes perdidos há até 12 horas aparecem assim que o app é aberto.

## Versões

A versão é um número inteiro (v1, v2, v3…) definido em `version.js`; aparece ao lado do nome e sobe a cada atualização.
O histórico está em [`CHANGELOG.md`](CHANGELOG.md). Cada push na branch principal publica o app
automaticamente no GitHub Pages e cria a tag `v<versão>`.

## Funcionalidades

- **Hoje** — resumo do dia: tarefas de hoje, atrasadas, próximos 7 dias, tarefas sem data e contador de provas.
- **Agenda** — calendário mensal com marcadores coloridos (dia a dia, escola e provas). Toque em um dia para ver e adicionar tarefas.
- **Escola** — tarefas agrupadas por matéria, com destaque para as próximas provas e contagem regressiva.
- **Todas** — busca e filtros por categoria e status; limpar concluídas.
- Tarefas com categoria (🏠 Dia a dia / 🎒 Escola), matéria, tipo (lição, trabalho, prova, estudar), data, horário, prioridade, anotações e repetição (diária ou semanal).
- **Lembretes** por tarefa (na hora, 10 min, 30 min, 1 hora ou 1 dia antes), com notificações. Ative no botão 🔔 do topo.
- Matérias personalizáveis (nome e cor).
- Tema claro e escuro automático, layout adaptado para celular.

## Arquivos

- `index.html` — estrutura da página
- `styles.css` — visual
- `app.js` — lógica do app
