// Markdown-lite → blocks.
//
//   # 标题          title across the top of the page
//   ## 小节         section heading
//   - 要点          bullet (indent with spaces to nest)
//   1. 要点         numbered item
//   > 注意          boxed note (consecutive lines share one box)
//   ---            squiggly divider
//   blank line     a little air
//
// Inline: **bold**  ==highlight==  __underline__  !!circled in red!!  ~~crossed out~~

const MARKS = [
  ['**', 'bold'],
  ['==', 'hl'],
  ['__', 'ul'],
  ['!!', 'red'],
  ['~~', 'strike'],
];

export function parseInline(text) {
  const runs = [];
  const st = { bold: false, hl: false, ul: false, red: false, strike: false };
  let buf = '';
  const flush = () => {
    if (buf) runs.push({ text: buf, style: { ...st } });
    buf = '';
  };
  for (let i = 0; i < text.length; ) {
    const mk = MARKS.find(([m]) => text.startsWith(m, i));
    if (mk) {
      const [m, key] = mk;
      const next = text[i + m.length];
      const prev = text[i - 1];
      // Opening needs a non-space after it, closing a non-space before it,
      // so "a == b" stays literal.
      const canOpen = !st[key] && next !== undefined && !/\s/.test(next);
      const canClose = st[key] && prev !== undefined && !/\s/.test(prev);
      if (canOpen || canClose) {
        flush();
        st[key] = !st[key];
        i += m.length;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return runs;
}

const level = (indent) => Math.min(3, Math.floor(indent.replace(/\t/g, '  ').length / 2));

export function parse(src) {
  const blocks = [];
  let note = null;
  const push = (b) => {
    note = null;
    blocks.push(b);
  };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    let m;
    if (!line.trim()) {
      if (blocks.length && blocks[blocks.length - 1].type !== 'gap') push({ type: 'gap' });
      else note = null;
      continue;
    }
    if ((m = line.match(/^\s*>\s?(.*)$/))) {
      if (!note) {
        note = { type: 'note', lines: [] };
        blocks.push(note);
      }
      note.lines.push(parseInline(m[1]));
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) push({ type: 'hr' });
    else if ((m = line.match(/^#\s+(.*)$/))) push({ type: 'title', runs: parseInline(m[1]) });
    else if ((m = line.match(/^#{2,6}\s+(.*)$/))) push({ type: 'h', runs: parseInline(m[1]) });
    else if ((m = line.match(/^(\s*)[-*•·]\s+(.*)$/))) push({ type: 'li', level: level(m[1]), runs: parseInline(m[2]) });
    else if ((m = line.match(/^(\s*)(\d{1,2})(?:([.)])\s+|、\s*)(.+)$/)))
      push({ type: 'li', level: level(m[1]), marker: m[2] + (m[3] === ')' ? ')' : '.'), runs: parseInline(m[4]) });
    else push({ type: 'p', runs: parseInline(line.trim()) });
  }
  while (blocks.length && blocks[blocks.length - 1].type === 'gap') blocks.pop();
  return blocks;
}
