// Writes the sample resumes as PDF + TXT files into <project>/samples for testing the upload flow.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import samples from './sampleResumes.js';
import { textToPdf } from '../utils/simplePdf.js';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../samples');
fs.mkdirSync(outDir, { recursive: true });

for (const s of samples) {
  fs.writeFileSync(path.join(outDir, s.fileName), textToPdf(s.text));
  fs.writeFileSync(path.join(outDir, s.fileName.replace(/\.pdf$/, '.txt')), s.text);
  console.log(`wrote samples/${s.fileName}`);
}
