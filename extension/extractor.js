// Injected into the active tab via chrome.scripting.executeScript({ func: extractDesignTokens }).
// Runs entirely in the page; returns a plain JSON object. No network requests.
function extractDesignTokens() {
  const MAX = 4000;
  const toHex = (c) => {
    const m = String(c).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/);
    if (!m) return null;
    let a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    if (a === 0) return null;
    const h = [m[1], m[2], m[3]].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('').toUpperCase();
    return a < 1 ? `#${h}${Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase()}` : `#${h}`;
  };
  const sat = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2;
    return mx === mn ? 0 : (l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn));
  };
  const lum = (hex) => { const f = i => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5); };
  const bump = (map, key, w = 1) => { if (key === null || key === undefined || key === '') return; map.set(key, (map.get(key) || 0) + w); };
  const isAccent = (hex) => { const h = hex.slice(0, 7); const L = lum(h); return sat(h) > 0.35 && L > 0.03 && L < 0.75; };
  const top = (map, n = 8) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));
  const visible = (el, r) => r.width > 0 && r.height > 0 && r.bottom > -2000 && r.top < innerHeight + 6000;

  const bg = new Map(), text = new Map(), border = new Map(), accentM = new Map(), fonts = new Map(), radii = new Map(), shadows = new Map(), spacing = new Map(), gaps = new Map();
  const typeByTag = {};
  const buttons = [];
  const els = document.body ? document.body.querySelectorAll('*') : [];
  let n = 0;
  for (const el of els) {
    if (n++ > MAX) break;
    if (/^(SCRIPT|STYLE|NOSCRIPT|META|LINK|BR|svg|path|g)$/i.test(el.tagName)) continue;
    const r = el.getBoundingClientRect(); if (!visible(el, r)) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    const area = Math.min(r.width * r.height, 400000) / 10000;
    const b = toHex(s.backgroundColor); if (b) bump(bg, b, Math.max(area, 0.2));
    const hasText = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim().length > 1);
    if (hasText) { bump(text, toHex(s.color)); bump(fonts, s.fontFamily.split(',')[0].replace(/["']/g, '').trim()); }
    if (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none') bump(border, toHex(s.borderTopColor));
    if (s.borderRadius && s.borderRadius !== '0px') bump(radii, s.borderRadius.split(' ').map(x => parseFloat(x) >= 999 ? '9999px' : x).join(' '));
    if (s.boxShadow && s.boxShadow !== 'none') bump(shadows, s.boxShadow);
    for (const p of ['paddingTop', 'paddingLeft', 'marginBottom']) { const v = parseFloat(s[p]); if (v > 0 && v <= 160) bump(spacing, Math.round(v) + 'px'); }
    if ((s.display.includes('flex') || s.display.includes('grid')) && s.gap && s.gap !== 'normal' && s.gap !== '0px') bump(gaps, s.gap);
    const tag = el.tagName.toLowerCase();
    const isBtn = tag === 'button' || (tag === 'a' && (b || parseFloat(s.borderTopWidth) > 0) && parseFloat(s.paddingLeft) >= 8 && r.height >= 24 && r.height <= 72);
    if (isBtn) {
      if (b && isAccent(b)) bump(accentM, b.slice(0, 7), 3);
      if (buttons.length < 8 && el.textContent.trim()) {
        const key = [b, s.borderRadius, Math.round(r.height)].join('|');
        if (!buttons.some(x => x._k === key)) buttons.push({ _k: key, text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24), height: Math.round(r.height) + 'px', padding: s.padding, radius: s.borderRadius, background: b || 'transparent', color: toHex(s.color), border: parseFloat(s.borderTopWidth) > 0 ? `${s.borderTopWidth} ${s.borderTopStyle} ${toHex(s.borderTopColor)}` : 'none', fontSize: s.fontSize, fontWeight: s.fontWeight, shadow: s.boxShadow });
      }
    }
    if (tag === 'a' && hasText) { const c = toHex(s.color); if (c && isAccent(c)) bump(accentM, c.slice(0, 7)); }
    const role = /^h[1-4]$/.test(tag) ? tag : (tag === 'p' && hasText ? 'body' : (/^(code|pre|kbd)$/.test(tag) ? 'mono' : null));
    if (role && hasText) {
      const k = [s.fontFamily.split(',')[0].replace(/["']/g, '').trim(), s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, toHex(s.color)].join('|');
      (typeByTag[role] = typeByTag[role] || new Map()); bump(typeByTag[role], k);
    }
  }
  const typeScale = {};
  for (const [role, m] of Object.entries(typeByTag)) {
    const [k] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    const [family, size, weight, lineHeight, letterSpacing, color] = k.split('|');
    typeScale[role] = { family, size, weight, lineHeight, letterSpacing, color };
  }
  // CSS custom properties from same-origin stylesheets
  const cssVariables = {};
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch (e) { continue; }
    for (const rule of rules || []) {
      if (!rule.style || !/^(:root|html)\b/.test(rule.selectorText || '')) continue;
      for (const p of rule.style) if (p.startsWith('--') && Object.keys(cssVariables).length < 200) cssVariables[p] = rule.style.getPropertyValue(p).trim();
    }
  }
  if (!accentM.size) { for (const [c, k] of [...text, ...border]) if (c && isAccent(c)) bump(accentM, c.slice(0, 7), k); }
  const bgTop = top(bg, 8), textTop = top(text, 8);
  const canvas = toHex(getComputedStyle(document.body).backgroundColor) || toHex(getComputedStyle(document.documentElement).backgroundColor) || (bgTop[0] && bgTop[0].value) || '#FFFFFF';
  return {
    url: location.href, title: document.title, extractedAt: new Date().toISOString(), elementsScanned: Math.min(n, MAX),
    mode: lum(canvas.slice(0, 7)) < 0.2 ? 'dark' : 'light',
    colors: { canvas, backgrounds: bgTop, text: textTop, borders: top(border, 6), accents: top(accentM, 5) },
    fonts: top(fonts, 5), typeScale,
    spacing: top(spacing, 10), gaps: top(gaps, 6), radii: top(radii, 8), shadows: top(shadows, 5),
    buttons: buttons.map(({ _k, ...x }) => x), cssVariables
  };
}
