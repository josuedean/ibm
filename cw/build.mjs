import { readFile, writeFile } from 'node:fs/promises';
const modules = ['config.js', 'geometry.js', 'noise.min.js', 'world.js', 'navigation.js',
  'player.js', 'tcw.js', 'game.js', 'render.js', 'hud.js', 'input.js', 'main.js'];
const root = new URL('./', import.meta.url);
let script = '(() => {\nconst __modules = Object.create(null);\n';
for (const filename of modules) {
  let source = await readFile(new URL(filename, root), 'utf8');
  const names = [...source.matchAll(/^export (?:class|const|function) (\w+)/gm)].map(m => m[1]);
  source = source.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+['"]\.\/([^'"]+)['"];?\s*$/gm,
    (_, list, module) => 'const {' + list.replace(/\bas\b/g, ':') + '} = __modules[' + JSON.stringify(module) + '];');
  source = source.replace(/^export default[^\n]*$/gm, '').replace(/^export (class|const|function) /gm, '$1 ');
  script += '__modules[' + JSON.stringify(filename) + '] = (() => {\n' + source + '\nreturn { ' + names.join(', ') + ' };\n})();\n';
}
script += '})();\n';
const css = await readFile(new URL('styles.css', root), 'utf8');
const shell = await readFile(new URL('tcw2.html', root), 'utf8');
const output = shell.replace('<link rel="stylesheet" href="./styles.css">', '<style>\n' + css + '</style>')
  .replace('<script type="module" src="./main.js"></script>',
    '<script>\n' + script.replaceAll('</script', '<\\/script') + '</script>');
await writeFile(new URL('Constant_Walker_Playable.html', root), output);
console.log('Built standalone game: ' + Buffer.byteLength(output) + ' bytes; no network dependencies.');
