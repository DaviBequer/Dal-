# Dal

App web estático (sem build) de tarefas e agenda, publicado como PWA no GitHub Pages:
https://davibequer.github.io/Dal-/

## Regra de versão (obrigatória)

Toda alteração no app precisa aumentar o número da versão:

1. Atualize `self.APP_VERSION` em `version.js` (semver: correção → 1.0.1, novidade → 1.1.0).
2. Adicione a entrada correspondente no topo de `CHANGELOG.md`.

A versão aparece no app e dá nome ao cache do service worker (`sw.js`); sem aumentá-la,
quem já instalou o PWA não recebe a atualização. Se criar um arquivo novo que o app usa,
inclua-o em `ASSETS` no `sw.js`.

## Publicação

O workflow `.github/workflows/pages.yml` (GitHub Actions) publica a branch padrão no
GitHub Pages a cada push (Settings → Pages → Source: GitHub Actions) e cria a tag
`v<versão>` quando a versão é nova. Ele falha se o app mudou sem a versão ter sido alterada.
