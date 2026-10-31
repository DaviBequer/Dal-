# Estilos em estudo

Cinco temas aplicados como camada sobre o app real (`data-theme` no `<html>`), usados para gerar as telas de comparação. Não são publicados no app.

- `temas/_comum.css` — ajustes de layout que valem para qualquer tema
- `temas/neon-otaku.css`, `xeque-mate.css`, `bloco-a-bloco.css`, `gibi-pow.css`, `modo-gamer.css`

Quando um tema for escolhido, ele (e o `_comum.css`) entra no `styles.css`, com as fontes hospedadas no próprio repositório para o app funcionar offline.

## Layout renovado (`renovado/`)

Protótipo funcionando do app com layout novo: navegação inferior com botão + central, topo com saudação,
anel de progresso e semana, destaque da próxima prova, agenda em linha do tempo, escola com carrossel de
provas e blocos de matéria, formulários em bottom sheet. `renovado/base.css` é o layout; `renovado/temas/`
traz cinco estilos premium (Sakura Noir, Grande Mestre, Mundo Bloco, Toon Pop, Arena RGB).

## Modo Profissional (`pro/`)

Protótipo do app com troca de modo em Configurações (Escola / Profissional). No modo Profissional:
Casa + Trabalho, Projetos, tipos Tarefa/Reunião/Entrega/Ligação/Pagamento e destaque "Próximo prazo".
Cada modo guarda as próprias tarefas (`dal.v1` para Escola, `dal.pro` para Profissional).
`pro/temas/` traz cinco designs para adultos (Executivo, Papel Branco, Bento Grafite, Oceano, Foco).
