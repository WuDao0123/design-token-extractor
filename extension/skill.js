// Builds a SKILL.md string from the extracted token JSON.
function buildSkillMd(t) {
  let host = 'page'; try { host = new URL(t.url).hostname.replace(/^www\./, ''); } catch (e) {}
  const slug = host.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
  const v = (a, i = 0) => (a && a[i] ? a[i].value : 'n/a');
  const ts = t.typeScale || {};
  const typeLine = (k) => ts[k] ? `- **${k.toUpperCase()}**: ${ts[k].family}, ${ts[k].size} / ${ts[k].lineHeight}, weight ${ts[k].weight}, tracking ${ts[k].letterSpacing}, color ${ts[k].color}` : null;
  const btn = (t.buttons || [])[0];
  const surface = (t.colors.backgrounds || []).map(x => x.value).find(x => x !== t.colors.canvas) || t.colors.canvas;
  return [
    '---',
    `name: ${slug}-style`,
    `description: Reproduce the visual style of ${host} (${t.mode} mode). Use when building UI that should look like ${host}.`,
    '---',
    '',
    `# ${host} design tokens`,
    '',
    `Extracted from ${t.url} on ${t.extractedAt.slice(0, 10)} with Design Token Extractor (${t.elementsScanned} elements scanned).`,
    '',
    '## Color tokens',
    '| Role | Value |', '|---|---|',
    `| Canvas | \`${t.colors.canvas}\` |`,
    `| Surface | \`${surface}\` |`,
    `| Primary text | \`${v(t.colors.text)}\` |`,
    `| Secondary text | \`${v(t.colors.text, 1)}\` |`,
    `| Border | \`${v(t.colors.borders)}\` |`,
    `| Accent | \`${v(t.colors.accents)}\` |`,
    '',
    '## Typography',
    `- Font families (by frequency): ${(t.fonts || []).map(f => f.value).join(', ') || 'n/a'}`,
    ...['h1', 'h2', 'h3', 'body', 'mono'].map(typeLine).filter(Boolean),
    '',
    '## Shape, spacing and depth',
    `- Border radius (most used first): ${(t.radii || []).slice(0, 5).map(x => '`' + x.value + '`').join(', ') || 'none'}`,
    `- Spacing scale: ${(t.spacing || []).slice(0, 8).map(x => x.value).join(', ') || 'n/a'}`,
    `- Flex/grid gaps: ${(t.gaps || []).slice(0, 5).map(x => x.value).join(', ') || 'n/a'}`,
    `- Shadows: ${(t.shadows || []).slice(0, 3).map(x => '`' + x.value + '`').join(' ; ') || 'none'}`,
    '',
    '## Components',
    btn ? `- Primary button: height ${btn.height}, padding ${btn.padding}, radius ${btn.radius}, background ${btn.background}, text ${btn.color}, border ${btn.border}, ${btn.fontSize} / ${btn.fontWeight}` : '- No button detected.',
    '',
    '## Rules',
    `- Use only the color tokens above; do not introduce new hues or gradients that are not on ${host}.`,
    `- Keep the ${t.mode} canvas \`${t.colors.canvas}\`; never swap modes.`,
    `- Match the type scale exactly, including letter-spacing on headings.`,
    `- Use the listed radii; do not round corners more than \`${v(t.radii)}\` unless the original uses pills.`,
    ''
  ].join('\n');
}
