// Minimal dependency-free PDF writer (Helvetica, A4, word-wrapped text) for generating sample resumes.

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;
const LINE_H = 14;
const FONT_SIZE = 10.5;
const MAX_CHARS = 95;

const escapePdf = (s) => s.replace(/[^\x20-\x7e]/g, '-').replace(/([\\()])/g, '\\$1');

function wrap(text) {
  const out = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > MAX_CHARS) {
        out.push(line);
        line = `  ${word}`;
      } else line = line ? `${line} ${word}` : word;
    }
    out.push(line);
  }
  return out;
}

export function textToPdf(text) {
  const lines = wrap(text);
  const perPage = Math.floor((PAGE_H - 2 * MARGIN) / LINE_H);
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));

  const objects = [];
  const add = (body) => objects.push(body) && objects.length;

  const catalogId = add(null);
  const pagesId = add(null);
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const pageIds = pages.map((pageLines) => {
    const ops = ['BT', `${MARGIN} ${PAGE_H - MARGIN} Td`, `${LINE_H} TL`];
    for (const l of pageLines) {
      const heading = l.length > 2 && l === l.toUpperCase() && /[A-Z]/.test(l);
      ops.push(`/${heading ? 'F2' : 'F1'} ${heading ? FONT_SIZE + 1 : FONT_SIZE} Tf`, `(${escapePdf(l)}) Tj T*`);
    }
    ops.push('ET');
    const stream = ops.join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    return add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
