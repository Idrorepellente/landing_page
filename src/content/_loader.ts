import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'src', 'content');

/** Legge un file grezzo (html/css) dalla cartella content (build-time, lato server). */
export const loadRaw = (file: string): string =>
  fs.readFileSync(path.join(DIR, file), 'utf-8');

/** Sostituisce i segnaposto condivisi <!--@HEADER--> e <!--@FOOTER-->. */
export const withParts = (html: string): string =>
  html
    .split('<!--@HEADER-->').join(loadRaw('_header.html'))
    .split('<!--@FOOTER-->').join(loadRaw('_footer.html'));
