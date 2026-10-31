"""Monta a página de demonstração ao vivo das 5 versões do Oceano a partir do app atual."""
import re, shutil, os, sys

ROOT = '/home/user/Dal-/'
OUT = sys.argv[1]
os.makedirs(OUT + '/fonts', exist_ok=True)

html = open(ROOT + 'index.html').read()
body = html[html.index('<body>') + 6: html.index('</body>')]
# espaços para as criaturas dentro da camada de efeitos do topo
body = body.replace('<i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
                    '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><b class="sea s1"></b><b class="sea s2"></b><b class="sea s3"></b></div>', 1)
assert 'sea s1' in body
body = body.replace('<script src="version.js"></script>', '<script src="version.js"></script>\n  <script src="demo-seed.js"></script>')

page = '''<title>Oceano Profissional</title>
<meta name="theme-color" content="#0f4c5c">
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="variantes.css">
<link rel="stylesheet" href="demo.css">
<script>
  // Demonstração: sempre no modo Profissional, com a versão escolhida no seletor
  document.documentElement.dataset.mode = 'pro';
  try { document.documentElement.dataset.otheme = localStorage.getItem('demo.otheme') || 'abismo'; } catch (e) { document.documentElement.dataset.otheme = 'abismo'; }
</script>
<div class="demo-switch" role="tablist" aria-label="Versões do Oceano">
  <button type="button" data-o="abismo"><b>O1</b> Abismo</button>
  <button type="button" data-o="barbatana"><b>O2</b> Barbatana</button>
  <button type="button" data-o="arraia"><b>O3</b> Arraia</button>
  <button type="button" data-o="kraken"><b>O4</b> Kraken</button>
  <button type="button" data-o="marinha"><b>O5</b> Marinha</button>
</div>
''' + body + '''
<script>
  (function () {
    const mark = () => document.querySelectorAll('.demo-switch button').forEach((b) => b.classList.toggle('on', b.dataset.o === document.documentElement.dataset.otheme));
    document.querySelector('.demo-switch').addEventListener('click', (e) => {
      const b = e.target.closest('[data-o]');
      if (!b) return;
      document.documentElement.dataset.otheme = b.dataset.o;
      try { localStorage.setItem('demo.otheme', b.dataset.o); } catch (err) { /* ignora */ }
      mark();
    });
    mark();
  })();
</script>
'''
open(OUT + '/oceano.html', 'w').write(page)

seed = r'''// Tarefas de exemplo da demonstração (modo Profissional)
(function () {
  try {
    localStorage.setItem('dal.mode', 'pro');
    if (!localStorage.getItem('dal.name')) localStorage.setItem('dal.name', 'Davi');
    if (localStorage.getItem('dal.pro.demo')) return;
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    let n = 0;
    const t = (o) => Object.assign({ id: 'd' + (n++), done: false, createdAt: 1, notes: '', repeat: '', reminder: '', subject: '', kind: '', time: '', priority: 'media' }, o);
    const tasks = [
      t({ title: 'Pagar conta de luz', category: 'dia', date: iso(-1), priority: 'alta', reminder: '0' }),
      t({ title: 'Reunião com cliente Alfa', category: 'escola', subject: 'cli', kind: 'reuniao', date: iso(0), time: '10:00', priority: 'alta', reminder: '30' }),
      t({ title: '1:1 com a equipe', category: 'escola', subject: 'equ', kind: 'reuniao', date: iso(0), time: '15:00' }),
      t({ title: 'Mercado da semana', category: 'dia', date: iso(0), time: '19:00', priority: 'baixa' }),
      t({ title: 'Academia', category: 'dia', date: iso(0), time: '07:00', repeat: 'diario', done: true }),
      t({ title: 'Pagar impostos (DAS)', category: 'escola', subject: 'fin', kind: 'pagamento', date: iso(2), priority: 'alta' }),
      t({ title: 'Enviar proposta comercial', category: 'escola', subject: 'cli', kind: 'entrega', date: iso(3), time: '18:00', priority: 'alta' }),
      t({ title: 'Levar o carro na revisão', category: 'dia', date: iso(4), time: '08:00' }),
      t({ title: 'Fechar relatório mensal', category: 'escola', subject: 'fin', kind: 'entrega', date: iso(6), priority: 'alta' }),
    ];
    localStorage.setItem('dal.pro', JSON.stringify({ tasks, subjects: [
      { id: 'cli', name: 'Clientes', color: '#3b82f6' }, { id: 'equ', name: 'Equipe', color: '#f59e0b' },
      { id: 'fin', name: 'Financeiro', color: '#14b8a6' }, { id: 'cur', name: 'Cursos', color: '#8b5cf6' }] }));
    localStorage.setItem('dal.pro.demo', '1');
  } catch (e) { /* sem armazenamento: o app abre vazio */ }
})();
'''
open(OUT + '/demo-seed.js', 'w').write(seed)

demo_css = '''/* Moldura da demonstração: o app em largura de celular, com o seletor de versões acima da barra */
html { background: #020812; }
body { max-width: 440px; margin: 0 auto; box-shadow: 0 0 60px rgba(0, 0, 0, .5); }
.bottom-nav { max-width: 416px; }
.demo-switch {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(92px + env(safe-area-inset-bottom, 0px)); z-index: 40;
  display: flex; gap: 6px; overflow-x: auto; max-width: min(416px, calc(100vw - 24px)); padding: 6px; border-radius: 999px;
  background: rgba(2, 10, 24, .82); backdrop-filter: blur(10px); scrollbar-width: none;
}
.demo-switch button {
  flex: none; border: 0; border-radius: 999px; padding: 7px 12px; font: 600 12px/1 system-ui, sans-serif; color: #b9d3ef; background: transparent; cursor: pointer; white-space: nowrap;
}
.demo-switch button b { color: #5ee0f0; margin-right: 2px; }
.demo-switch button.on { background: #e6f1ff; color: #04101f; }
.demo-switch button.on b { color: #0b4f8a; }
'''
open(OUT + '/demo.css', 'w').write(demo_css)

for f in ['styles.css', 'app.js', 'version.js']:
    shutil.copy(ROOT + f, OUT + '/' + f)
shutil.copy(ROOT + 'design/oceano-v/variantes.css', OUT + '/variantes.css')
for f in ['lexend.woff2', 'manrope.woff2', 'fraunces-700.woff2']:
    shutil.copy(ROOT + 'fonts/' + f, OUT + '/fonts/' + f)
print('ok')
