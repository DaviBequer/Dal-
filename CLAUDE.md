# Dalê Tarefas

App web estático (sem build) de tarefas e agenda, publicado como PWA no GitHub Pages:
https://davibequer.github.io/Dal-/

Público: um adolescente, usando no **Android** (Chrome). iPhone não é prioridade.

## Regra de versão (obrigatória)

Toda alteração no app precisa aumentar a versão, que é um **número inteiro**:

1. Some 1 em `self.APP_VERSION` em `version.js` (1 → 2 → 3…). O app mostra `v<número>` ao lado do nome.
2. Adicione a entrada `## v<número> — <data>` no topo de `CHANGELOG.md`.

A versão dá nome ao cache do service worker (`sw.js`); sem aumentá-la, quem já instalou o
PWA não recebe a atualização. Se criar um arquivo novo que o app usa, inclua-o em `ASSETS`
no `sw.js`. A atualização é automática no aparelho (sem botão): o service worker busca
primeiro na rede (abre sempre a versão publicada) e usa o cache só sem internet.

Não use `confirm()`, `alert()` nem inputs nativos de data, hora ou cor: no Android eles abrem
janelas pretas do sistema. Use as janelas próprias do app (`askConfirm`, `#dateBtn`, `#timeBtn`, `pickColor`).

## Um modo só: Escola

O app tem apenas o modo Escola: dados em `localStorage['dal.v1']`, tema Grande Mestre (`:root` e
`html:root` no `styles.css`, com as animações de xadrez). Os textos ficam no objeto `M` do `app.js`.
O antigo modo Profissional foi removido na v11 (não recriar sem o usuário pedir).

## Quando publicar direto e quando perguntar (pedido do usuário)

- Pedido **específico** ("muda isso", "adiciona aquilo"): implementar, testar, aumentar a
  versão e fazer push direto — o deploy é automático. Não precisa pedir confirmação.
- Mudança **muito grande**, ou quando o usuário pede **ideias/opções**: apresentar a
  proposta e só publicar depois que ele aprovar.

## Publicação

O workflow `.github/workflows/pages.yml` (GitHub Actions) publica a branch padrão no
GitHub Pages a cada push (Settings → Pages → Source: GitHub Actions) e cria a tag
`v<versão>` quando a versão é nova. Ele falha se o app mudou sem a versão ter sido alterada.

## Orbe (app separado, pasta `orbe/`)

Outro PWA do mesmo usuário, independente do Dalê Tarefas: https://davibequer.github.io/Dal-/orbe/
Tarefas com matriz de Eisenhower, agenda, áreas da vida (Vida) com partes e anotações, e Números.
Visual: preto, branco e petróleo (#0F5463), fonte Outfit fina, ícones Material Symbols Rounded (peso 200).
Dados em `localStorage['orbe.v1']`. O workflow copia a pasta para `_site/orbe/`.
Versão própria: some 1 em `orbe/version.js` e registre em `orbe/CHANGELOG.md` a cada mudança no Orbe
(o cache do `orbe/sw.js` usa essa versão). Mesmas regras de janelas próprias (sem `confirm()`/inputs nativos de data e hora).
O Supabase fica para depois, quando o usuário pedir.
