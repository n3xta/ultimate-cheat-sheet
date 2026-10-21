// Inline the built JS and CSS into dist/scrawl-sheet.html: one file you can
// open, email or drop anywhere (it only needs Google Fonts online).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.?\/?(assets\/[^"]+\.css)"[^>]*>/g, (_, file) =>
  `<style>\n${readFileSync(join(dist, file), 'utf8')}\n</style>`,
);
html = html.replace(/<script type="module"[^>]*src="\.?\/?(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, file) =>
  `<script type="module">\n${readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`,
);
// Vite puts the module script in <head>; it must run after the markup.
const script = html.match(/<script type="module">[\s\S]*?<\/script>/);
// (function replacers throughout: the bundle may contain `$'` and friends)
if (script) html = html.replace(script[0], () => '').replace('</body>', () => `${script[0]}\n</body>`);

writeFileSync(join(dist, 'scrawl-sheet.html'), html);
console.log('wrote dist/scrawl-sheet.html', (html.length / 1024).toFixed(0) + ' KB');
