/**
 * prove/prova-catalogo.mjs — il catalogo dei piani, la pagina Prezzi e il
 * database (src/lib/catalogo.ts, src/content/prezzi.ts, src/lib/allineaCatalogo.ts).
 *
 *     node prove/prova-catalogo.mjs
 *     PROVA_PG=postgres://utente@host:porta/postgres node prove/prova-catalogo.mjs
 *
 * Senza PROVA_PG prova la pagina Prezzi e i controlli del catalogo; con
 * PROVA_PG anche l'allineamento del database, creando (e poi cancellando)
 * quattro database di prova su quel server Postgres. NON indicare il
 * database del sito: serve un Postgres locale, su cui l'utente possa creare
 * database. I moduli TypeScript si compilano con il tsc del progetto in una
 * cartella temporanea.
 *
 * prove/sql/vecchio.sql è lo schema degli abbonamenti com'era sul database
 * del sito prima del catalogo nel codice (marketplace_beta.sql più il
 * marketplace_abbonamenti.sql di allora, con Author, Studio e Desk a 9/19/39 €).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'lyra-prova-catalogo-'));
const require = createRequire(import.meta.url);

let ok = 0;
const fallite = [];
function verifica(cond, testo, dettaglio = '') {
  if (cond) { ok++; console.log('  OK   ' + testo); }
  else { fallite.push(testo + (dettaglio ? ' ' + dettaglio : '')); console.log('  FAIL ' + testo + '  ' + dettaglio); }
}

// ---------------------------------------------------------------- compilazione
const conf = {
  compilerOptions: {
    target: 'ES2020', module: 'commonjs', moduleResolution: 'node', strict: true,
    esModuleInterop: true, skipLibCheck: true, outDir: OUT, rootDir: path.join(RADICE, 'src'),
    baseUrl: RADICE, paths: { '@/*': ['./src/*'] }, types: ['node'],
    typeRoots: [path.join(RADICE, 'node_modules', '@types')],
  },
  files: ['content/prezzi.ts', 'lib/catalogo.ts', 'lib/allineaCatalogo.ts', 'lib/abbonamenti.ts']
    .map((f) => path.join(RADICE, 'src', f)),
};
fs.writeFileSync(path.join(OUT, 'tsconfig.json'), JSON.stringify(conf));
// il tsc del progetto, lanciato con node: funziona uguale su Windows
execFileSync(process.execPath,
             [require.resolve('typescript/bin/tsc', { paths: [RADICE] }), '-p', path.join(OUT, 'tsconfig.json')],
             { stdio: 'inherit' });
// gli alias «@/…» del progetto diventano percorsi veri (con «/», anche su Windows)
const OUT_JS = OUT.split(path.sep).join('/');
for (const f of fs.readdirSync(OUT, { recursive: true })) {
  if (!String(f).endsWith('.js')) continue;
  const p = path.join(OUT, String(f));
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/require\("@\//g, `require("${OUT_JS}/`));
}
// i moduli compilati trovano il pg del progetto
fs.symlinkSync(path.join(RADICE, 'node_modules'), path.join(OUT, 'node_modules'), 'junction');

const catalogo = require(path.join(OUT, 'lib/catalogo.js'));
const prezzi = require(path.join(OUT, 'content/prezzi.js'));

// ---------------------------------------------------------------- la pagina
console.log('\nA. La pagina Prezzi prende i numeri dal catalogo');
const html = fs.readFileSync(path.join(RADICE, 'src/content/capital.html'), 'utf8');
const pagina = prezzi.riempiPrezzi(html);
verifica(!/\{\{/.test(pagina), 'nessun segnaposto resta nella pagina');
for (const [frase, cosa] of [
  ['<b>49</b><small>€</small>', 'Pro 49 €/mese nella scheda'],
  ['<b>149</b><small>€</small>', 'Professional 149 €/mese'],
  ['<b>200</b><small>€</small>', 'Quant da 200 €/mese'],
  ['<b>8.000</b><small>€</small>', 'Desk 8.000 €/anno'],
  ["490 € all'anno, 2 mesi gratis", "«490 € all'anno, 2 mesi gratis»"],
  ['<span class="py">1.490 €</span><span class="pm">149 €</span>', 'tabella: Professional 1.490 € / 149 €'],
  ['<span class="py">2.000 €</span><span class="pm">200 €</span>', 'tabella: Quant 2.000 € / 200 €'],
  ['paghi <b>10 mesi su 12</b>', '«10 mesi su 12»'],
  ['(dieci mensilità: due sono gratis)', '«dieci mensilità: due sono gratis»'],
  ['costa tre volte il Pro?', '«tre volte il Pro» (prezzi)'],
  ['Prova 2 mesi', '«Prova 2 mesi»'],
]) verifica(pagina.includes(frase), cosa);
verifica(prezzi.euro(149000) === '1.490' && prezzi.euro(4950) === '49,50' && prezzi.euro(800000) === '8.000',
         'euro all\'italiana: 1.490, 49,50, 8.000');

console.log('\nB. Un catalogo che smentisce una frase della pagina ferma la build');
const C = catalogo.CATALOGO;
function conCatalogo(cambia, atteso, testo) {
  const copia = JSON.parse(JSON.stringify(C));
  cambia(C);
  let msg = '';
  try { prezzi.riempiPrezzi(html); } catch (e) { msg = String(e.message); }
  // rimette il catalogo com'era
  C.forEach((p, i) => { Object.keys(p).forEach((k) => { p[k] = copia[i][k]; }); });
  verifica(msg.includes(atteso), testo, msg || '(nessun errore)');
}
conCatalogo((c) => { c[0].monthlyCents = 5900; }, 'non un numero intero',
            'Pro a 59 €/mese con l\'annuale a 490 €: «2 mesi gratis» non è più vero');
conCatalogo((c) => { c[0].monthlyCents = 5900; c[0].annualCents = 59000; },
            'Il prezzo di Professional diviso quello di Pro',
            'Pro a 59/590: «il Professional costa tre volte il Pro» non è più vero');
conCatalogo((c) => { c[1].annualCents = 163900; }, 'non vale le stesse mensilità',
            'Professional annuale a 1.639 € (11 mensilità): «su ogni piano» non è più vero');
conCatalogo((c) => { c[1].annualCents = 160000; }, 'non un numero intero',
            'Professional annuale a 1.600 €: non è un numero di mensilità');
conCatalogo((c) => { c[0].features.discount = 15; }, 'pro.discount', 'sconto del Pro al 15%: la pagina dice −10%');
conCatalogo((c) => { c[2].features.trial_months = 1; }, 'mesi di prova', 'prova di Quant diversa dagli altri');
conCatalogo((c) => { c[3].features.trial_months = 2; }, 'Desk ha una prova', 'Desk con una prova');
conCatalogo((c) => { c[0].currency = 'USD'; }, 'in USD', 'una valuta diversa dall\'euro');
verifica(prezzi.riempiPrezzi(html) === pagina, 'col catalogo intatto la pagina torna identica');

// ---------------------------------------------------------------- il database
const PG = process.env.PROVA_PG;
if (!PG) {
  console.log('\n(PROVA_PG non impostata: le prove sul database non girano)');
  fine();
} else {
  await provaDatabase(PG);
  fine();
}

function fine() {
  fs.rmSync(OUT, { recursive: true, force: true });
  console.log('\n' + '='.repeat(70));
  if (fallite.length) {
    console.log(`FALLITE ${fallite.length} (su ${ok + fallite.length}):`);
    fallite.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log(`TUTTO A POSTO (${ok} verifiche)`);
}

async function provaDatabase(url) {
  const { Pool, Client } = require(require.resolve('pg', { paths: [RADICE] }));
  const alli = require(path.join(OUT, 'lib/allineaCatalogo.js'));
  const abb = require(path.join(OUT, 'lib/abbonamenti.js'));
  const amm = new Client({ connectionString: url });
  await amm.connect();
  const sql = (nome) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'sql', nome), 'utf8');
  async function nuovoDb(nome, prima) {
    await amm.query(`DROP DATABASE IF EXISTS ${nome}`);
    await amm.query(`CREATE DATABASE ${nome}`);
    const u = new URL(url); u.pathname = '/' + nome;
    const pool = new Pool({ connectionString: u.toString(), max: 3 });
    await pool.query(`CREATE TABLE "User" (id TEXT PRIMARY KEY, email TEXT)`);
    if (prima) await pool.query(prima);
    return pool;
  }
  const piani = async (pool) => (await pool.query(
    `SELECT tier, code, name, "monthlyCents" AS m, "annualCents" AS a, active,
            "stripeProductId" AS prod, "updatedAt" FROM "SubscriptionPlan" ORDER BY tier`)).rows;

  console.log('\nC. Il database con il catalogo vecchio (Author, Studio, Desk a 9/19/39 €)');
  let pool = await nuovoDb('prova_vecchio', sql('vecchio.sql'));
  await pool.query(`INSERT INTO "User"(id, email, "subscriptionStatus", "subscriptionTier", "subscriptionUntil")
                    VALUES ('d1', 'desk@x', 'subscribed', 3, NOW() + interval '1 year'),
                           ('a1', 'autore@x', 'subscribed', 1, NULL),
                           ('f1', 'free@x', 'none', 0, NULL)`);
  await pool.query(`INSERT INTO "SubscriptionPayment"(id, "userId", tier, period, "amountCents", status, "providerRef")
                    VALUES ('p1', 'd1', 3, 'annual', 39000, 'paid', 'in_1')`);
  await pool.query(`UPDATE "SubscriptionPlan" SET "stripeProductId" = 'prod_desk' WHERE tier = 3`);
  await pool.query(`UPDATE "SubscriptionPlan" SET "stripeProductId" = 'prod_author' WHERE tier = 1`);
  let r = await piani(pool);
  verifica(r.map((x) => `${x.name} ${x.m / 100}/${x.a / 100}`).join(', ') === 'Author 9/90, Studio 19/190, Desk 39/390',
           'prima: i piani segnaposto che l\'app mostrava', JSON.stringify(r));
  alli._dimentica();
  const lista = await abb.piani(pool);
  verifica(lista.map((p) => `${p.tier} ${p.name} ${p.monthlyCents / 100}/${p.annualCents / 100}`).join(', ')
           === '1 Pro 49/490, 2 Professional 149/1490, 3 Quant 200/2000, 4 Desk 0/8000',
           'piani() li allinea al catalogo prima di leggerli: Pro, Professional, Quant, Desk',
           JSON.stringify(lista.map((p) => [p.tier, p.name, p.monthlyCents, p.annualCents])));
  const st = await alli.assicuraCatalogo(pool);
  verifica(st.allineato && st.scritto && !st.errore && st.impronta === catalogo.IMPRONTA_CATALOGO && st.quando,
           'stato: allineato, scritto da questa istanza, con l\'impronta e l\'ora', JSON.stringify(st));
  const quant = lista.find((p) => p.code === 'quant');
  const desk = lista.find((p) => p.code === 'desk');
  verifica(quant.priceFrom && quant.trialMonths === 2 && quant.badge === 'Real-time from 2032'
           && desk.annualOnly && desk.salesOnly && !desk.trialMonths
           && lista.find((p) => p.code === 'pro').highlights.length === 5
           && !('highlights' in quant.features) && quant.features.discount === 20,
           'le voci di presentazione arrivano all\'app come campi del piano, i fatti in features');
  r = await piani(pool);
  verifica(r.find((x) => x.tier === 4).prod === 'prod_desk' && r.find((x) => x.tier === 1).prod === null,
           'Desk tiene il suo prodotto Stripe, Pro no (quello era «Lyra Author»)');
  const ut = (await pool.query(`SELECT id, "subscriptionTier" AS t FROM "User" ORDER BY id`)).rows;
  const pag = (await pool.query(`SELECT tier FROM "SubscriptionPayment" WHERE id = 'p1'`)).rows[0];
  verifica(ut.find((x) => x.id === 'd1').t === 4 && ut.find((x) => x.id === 'a1').t === 1 && pag.tier === 4,
           'l\'abbonato Desk e il suo pagamento passano dal livello 3 al 4', JSON.stringify(ut));
  const col = new Set((await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`)).rows.map((x) => x.column_name));
  verifica(col.has('trialUsedAt') && col.has('subscriptionTrialEnd'), 'le colonne della prova ci sono');
  const vin = (await pool.query(`SELECT conrelid::regclass::text AS t, pg_get_constraintdef(oid) AS d FROM pg_constraint
                                  WHERE contype = 'c' AND conrelid IN ('"User"'::regclass, '"SubscriptionPlan"'::regclass)
                                    AND (pg_get_constraintdef(oid) LIKE '%tier%' OR pg_get_constraintdef(oid) LIKE '%Tier%')`)).rows;
  verifica(vin.length === 2 && vin.every((x) => x.d.includes('<= 4')), 'i vincoli dei livelli arrivano a 4',
           JSON.stringify(vin));
  const imp = (await pool.query(`SELECT valore FROM "AppSetting" WHERE chiave = 'subscription_catalog'`)).rows[0];
  verifica(imp && imp.valore === catalogo.IMPRONTA_CATALOGO, 'l\'impronta del catalogo nel database');
  const stato = await abb.statoAbbonamento('d1', pool);
  verifica(stato.attivo && stato.tier === 4 && stato.features.seats === 5, 'chi aveva Desk è abbonato Desk',
           JSON.stringify(stato));

  console.log('\nD. Una seconda istanza trova tutto giusto e non riscrive');
  const prima = (await piani(pool)).map((x) => String(x.updatedAt));
  alli._dimentica();
  const st2 = await alli.assicuraCatalogo(pool);
  const dopo = (await piani(pool)).map((x) => String(x.updatedAt));
  verifica(st2.allineato && !st2.scritto && JSON.stringify(prima) === JSON.stringify(dopo),
           'nessuna scrittura se il database ha già il catalogo', JSON.stringify(st2));

  console.log('\nE. Un prezzo cambiato a mano nel database torna come nel catalogo');
  await pool.query(`UPDATE "SubscriptionPlan" SET "monthlyCents" = 2900, name = 'Pro+' WHERE tier = 1`);
  alli._dimentica();
  const l2 = await abb.piani(pool);
  verifica(l2[0].name === 'Pro' && l2[0].monthlyCents === 4900, 'Pro torna a 49 € alla prima istanza nuova');

  console.log('\nF. Il database del file SQL nuovo (impronta «2026-11»)');
  await pool.query(`UPDATE "AppSetting" SET valore = '2026-11' WHERE chiave = 'subscription_catalog'`);
  alli._dimentica();
  const st3 = await alli.assicuraCatalogo(pool);
  verifica(st3.allineato && st3.scritto, 'righe giuste ma impronta diversa: riscrive e annota l\'impronta');
  await pool.end();

  console.log('\nG. Un database senza nulla degli abbonamenti');
  pool = await nuovoDb('prova_vuoto', null);
  alli._dimentica();
  const l3 = await abb.piani(pool);
  const lock = (await pool.query(`SELECT valore FROM "AppSetting" WHERE chiave = 'marketplace_locked'`)).rows[0];
  verifica(l3.length === 4 && lock && lock.valore === 'true',
           'crea tabelle, colonne e piani; il marketplace nasce chiuso', JSON.stringify(lock));
  await pool.end();

  console.log('\nH. Due istanze che partono insieme');
  await nuovoDb('prova_insieme', sql('vecchio.sql')).then((p) => p.end());
  const u = new URL(url); u.pathname = '/prova_insieme';
  const codice = `const a=require(${JSON.stringify(path.join(OUT, 'lib/allineaCatalogo.js'))});
    const {Pool}=require('pg'); const p=new Pool({connectionString:${JSON.stringify(u.toString())}});
    a.assicuraCatalogo(p).then(s=>{console.log(JSON.stringify(s)); return p.end();});`;
  const figli = await Promise.all([0, 1, 2].map(() => new Promise((ok) => {
    const { execFile } = require('node:child_process');
    execFile(process.execPath, ['-e', codice], { env: process.env, cwd: OUT },
             (e, out, err) => ok(e ? { errore: String(err || e) } : JSON.parse(out)));
  })));
  const scritti = figli.filter((s) => s.scritto).length;
  verifica(figli.every((s) => s.allineato && !s.errore) && scritti === 1,
           'tre istanze insieme: una scrive, le altre trovano il lavoro fatto', JSON.stringify(figli));

  console.log('\nI. Se il database non si lascia scrivere, i piani si leggono come sono');
  pool = await nuovoDb('prova_errore', sql('vecchio.sql'));
  // un livello fuori misura: il vincolo nuovo (0..4) non si puo' aggiungere
  await pool.query(`ALTER TABLE "User" DROP CONSTRAINT "User_subscriptionTier_range"`);
  await pool.query(`INSERT INTO "User"(id, email, "subscriptionTier") VALUES ('x', 'x@x', 7)`);
  alli._dimentica();
  const l4 = await abb.piani(pool);
  const st4 = await alli.assicuraCatalogo(pool);
  verifica(l4.map((p) => p.name).join(',') === 'Author,Studio,Desk' && !st4.allineato && st4.errore,
           'transazione annullata, piani vecchi letti, errore ricordato per il pannello', JSON.stringify(st4));
  const t0 = Date.now();
  await alli.assicuraCatalogo(pool);
  verifica(Date.now() - t0 < 50, 'e non si riprova a ogni richiesta (un minuto)');
  await pool.end();

  for (const n of ['prova_vecchio', 'prova_vuoto', 'prova_insieme', 'prova_errore']) {
    await amm.query(`DROP DATABASE IF EXISTS ${n}`);
  }
  await amm.end();
}
