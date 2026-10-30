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
no `sw.js`. A atualização é automática no aparelho (sem botão).

## Quando publicar direto e quando perguntar (pedido do usuário)

- Pedido **específico** ("muda isso", "adiciona aquilo"): implementar, testar, aumentar a
  versão e fazer push direto — o deploy é automático. Não precisa pedir confirmação.
- Mudança **muito grande**, ou quando o usuário pede **ideias/opções**: apresentar a
  proposta e só publicar depois que ele aprovar.

## Publicação

O workflow `.github/workflows/pages.yml` (GitHub Actions) publica a branch padrão no
GitHub Pages a cada push (Settings → Pages → Source: GitHub Actions) e cria a tag
`v<versão>` quando a versão é nova. Ele falha se o app mudou sem a versão ter sido alterada.
