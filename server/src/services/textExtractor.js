import path from 'node:path';
import mammoth from 'mammoth';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import HttpError from '../utils/httpError.js';

async function pdfToText(buffer) {
  const doc = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    let text = '';
    let lastY = null;
    for (const item of items) {
      const y = item.transform?.[5];
      // Start a new line when the baseline moves, even if the PDF did not mark an end-of-line.
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2 && !text.endsWith('\n')) text += '\n';
      text += item.str;
      if (item.hasEOL) text += '\n';
      if (y !== undefined) lastY = y;
    }
    pages.push(text);
  }
  await doc.destroy();
  return pages.join('\n\n');
}

function clean(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/[•●▪‣⁃]/g, '-')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractText(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  let text = '';

  try {
    if (ext === '.pdf') text = await pdfToText(buffer);
    else if (ext === '.docx') text = (await mammoth.extractRawText({ buffer })).value;
    else if (ext === '.txt') text = buffer.toString('utf8');
    else throw new HttpError(400, 'Unsupported file type');
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, `Could not read the ${ext.slice(1).toUpperCase()} file: ${err.message}`);
  }

  text = clean(text);
  if (text.length < 50) {
    throw new HttpError(422, 'No readable text found. Scanned/image-only resumes are not supported - export a text-based PDF or DOCX.');
  }
  return text;
}
