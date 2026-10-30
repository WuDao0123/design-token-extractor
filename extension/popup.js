const $ = (id) => document.getElementById(id);
let tokens = null;
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function fileBase() { try { return new URL(tokens.url).hostname.replace(/^www\./, ''); } catch (e) { return 'tokens'; } }
function el(tag, attrs = {}, text) { const e = document.createElement(tag); Object.assign(e, attrs); if (text !== undefined) e.textContent = text; return e; }
function render(t) {
  tokens = t; $('res').hidden = false; $('host').textContent = t.url;
  $('mode').textContent = t.mode; $('count').textContent = t.elementsScanned;
  const sw = $('colors'); sw.replaceChildren();
  const cols = [t.colors.canvas, ...t.colors.backgrounds.map(x => x.value), ...t.colors.text.map(x => x.value), ...t.colors.accents.map(x => x.value), ...t.colors.borders.map(x => x.value)];
  [...new Set(cols)].slice(0, 12).forEach(c => { const d = el('div', { title: 'Copy ' + c }); const i = el('i'); i.style.background = c; d.append(i, el('span', {}, c)); d.onclick = () => navigator.clipboard.writeText(c); sw.append(d); });
  $('fonts').replaceChildren(...t.fonts.map(f => { const d = el('div'); d.append(el('b', {}, f.value), el('em', {}, '×' + f.count)); return d; }));
  $('type').replaceChildren(...Object.entries(t.typeScale).sort((a, b) => ['h1','h2','h3','h4','body','mono'].indexOf(a[0]) - ['h1','h2','h3','h4','body','mono'].indexOf(b[0])).map(([k, v]) => { const d = el('div'); d.append(el('b', {}, k), el('em', {}, `${v.size} / ${v.weight} / ${v.letterSpacing}`)); return d; }));
  $('radii').replaceChildren(...t.radii.map(r => el('span', {}, r.value)));
  $('spacing').replaceChildren(...t.spacing.map(r => el('span', {}, r.value)));
  $('shadows').replaceChildren(...(t.shadows.length ? t.shadows.slice(0, 3).map(s => el('div', { title: s.value }, s.value)) : [el('div', {}, 'none')]));
}
async function run() {
  $('err').hidden = true; $('run').textContent = 'Extracting…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/.test(tab.url || '')) throw new Error('Open a regular http(s) page first.');
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractDesignTokens });
    render(res.result);
  } catch (e) { $('err').textContent = e.message; $('err').hidden = false; }
  $('run').textContent = 'Extract again';
}
$('run').onclick = run;
$('dlSkill').onclick = () => download(fileBase() + '-SKILL.md', buildSkillMd(tokens), 'text/markdown');
$('dlJson').onclick = () => download(fileBase() + '-tokens.json', JSON.stringify(tokens, null, 2), 'application/json');
$('cpSkill').onclick = () => navigator.clipboard.writeText(buildSkillMd(tokens)).then(() => { $('cpSkill').textContent = 'Copied'; setTimeout(() => $('cpSkill').textContent = 'Copy SKILL.md', 1200); });
