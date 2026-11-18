/**
 * prove/prova-beta.mjs — gli account della beta dall'inizio alla fine, con le
 * rotte vere del sito (src/lib/betaAccount.ts e le rotte che lo usano).
 *
 *     npm run build                    (una volta, dopo ogni modifica)
 *     PROVA_PG=postgres://utente@localhost:5432/postgres node prove/prova-beta.mjs
 *
 * Crea un database di prova su quel server Postgres (NON indicare quello del
 * sito: serve un Postgres locale su cui l'utente possa creare database), avvia
 * `next start` su una porta libera con un server di posta finto che raccoglie
 * i messaggi, e prova: le richieste di prima preparate all'avvio, il limite
 * dei posti, la lista d'attesa, il campo nascosto e il limite per IP, le
 * iscrizioni chiuse, gli account aggiunti dal pannello oltre il limite, gli
 * inviti a lotti (anche quelli che falliscono), l'invito immediato dopo
 * l'inizio, il primo accesso con la scelta della password, la rimozione, e
 * le richieste simultanee al limite.
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { Client, Pool } = require(require.resolve('pg', { paths: [RADICE] }));
const bcrypt = require(require.resolve('bcryptjs', { paths: [RADICE] }));

const PG = process.env.PROVA_PG;
if (!PG) {
  console.log('PROVA_PG non impostata: serve un Postgres locale (vedi l\'intestazione).');
  process.exit(2);
}
if (!fs.existsSync(path.join(RADICE, '.next', 'BUILD_ID'))) {
  console.log('Manca la build: esegui prima «npm run build».');
  process.exit(2);
}

const SEGRETO_APP = 'segreto-di-prova-abbastanza-lungo-1234';
const SEGRETO_DASH = 'segreto-dashboard-di-prova-5678';
const ADMIN = 'admin@prova.it';
const LINK = 'https://download.prova.it/Lyra-Setup.exe';

let ok = 0;
const fallite = [];
function verifica(cond, testo, dettaglio = '') {
  if (cond) { ok++; console.log('  OK   ' + testo); }
  else {
    fallite.push(testo + (dettaglio ? ' — ' + dettaglio : ''));
    console.log('  FAIL ' + testo + (dettaglio ? '  ' + dettaglio : ''));
  }
}

// ----------------------------------------------------------- posta finta
const posta = [];
function decodificaMime(raw) {
  const parti = raw.split(/\r?\n--[^\r\n]+\r?\n/);
  const out = [];
  for (const p of parti) {
    const i = p.search(/\r?\n\r?\n/);
    if (i < 0) { out.push(p); continue; }
    const testa = p.slice(0, i).toLowerCase();
    let corpo = p.slice(i).replace(/^\r?\n\r?\n/, '');
    if (testa.includes('content-transfer-encoding: base64')) {
      corpo = Buffer.from(corpo.replace(/\s+/g, ''), 'base64').toString('utf8');
    } else if (testa.includes('content-transfer-encoding: quoted-printable')) {
      const b = Buffer.from(corpo.replace(/=\r?\n/g, '')
        .replace(/=([0-9A-F]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1');
      corpo = b.toString('utf8');
    }
    out.push(corpo);
  }
  return out.join('\n');
}
function oggettoDi(raw) {
  const m = raw.match(/^Subject: (.*(?:\r?\n[ \t].*)*)/mi);
  if (!m) return '';
  return m[1].replace(/\r?\n[ \t]/g, ' ').replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_x, k, t) =>
    k.toLowerCase() === 'b' ? Buffer.from(t, 'base64').toString('utf8')
      : Buffer.from(t.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi,
        (_m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8'))
    .replace(/\?=\s+=\?/g, '');
}
function serverPosta() {
  return new Promise((pronto) => {
    const srv = net.createServer((sock) => {
      sock.write('220 prova ESMTP\r\n');
      let buf = '';
      let dati = false;
      let msg = null;
      let login = 0;
      sock.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        for (;;) {
          if (dati) {
            const i = buf.indexOf('\r\n.\r\n');
            if (i < 0) return;
            msg.raw = buf.slice(0, i);
            buf = buf.slice(i + 5);
            dati = false;
            msg.testo = decodificaMime(msg.raw);
            msg.oggetto = oggettoDi(msg.raw);
            posta.push(msg);
            sock.write('250 2.0.0 queued\r\n');
            continue;
          }
          const i = buf.indexOf('\r\n');
          if (i < 0) return;
          const riga = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const cmd = riga.slice(0, 4).toUpperCase();
          if (login) { login = login === 1 ? 2 : 0; sock.write(login ? '334 UGFzc3dvcmQ6\r\n' : '235 2.7.0 ok\r\n'); continue; }
          if (cmd === 'EHLO') sock.write('250-prova\r\n250-AUTH PLAIN LOGIN\r\n250-8BITMIME\r\n250 SMTPUTF8\r\n');
          else if (cmd === 'HELO') sock.write('250 prova\r\n');
          else if (cmd === 'AUTH') {
            if (/^AUTH LOGIN/i.test(riga)) { login = 1; sock.write('334 VXNlcm5hbWU6\r\n'); }
            else sock.write('235 2.7.0 ok\r\n');
          } else if (cmd === 'MAIL') { msg = { a: [] }; sock.write('250 ok\r\n'); }
          else if (cmd === 'RCPT') {
            const a = (riga.match(/<([^>]*)>/) || [])[1] || '';
            if (a.includes('+rifiuta')) sock.write('550 5.1.1 <' + a + '>: no such user\r\n');
            else { msg.a.push(a.toLowerCase()); sock.write('250 ok\r\n'); }
          } else if (cmd === 'DATA') {
            if (!msg || !msg.a.length) sock.write('554 5.5.1 no valid recipients\r\n');
            else { dati = true; sock.write('354 go ahead\r\n'); }
          } else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
          else sock.write('250 ok\r\n');
        }
      });
      sock.on('error', () => {});
    });
    srv.listen(0, '127.0.0.1', () => pronto(srv));
  });
}
const perChi = (a) => posta.filter((m) => m.a.includes(a));
const ultimaPer = (a) => perChi(a).slice(-1)[0];
const passwordIn = (m) => ((m && m.testo.match(/Password:\s*([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})/)) || [])[1] || null;

function portaLibera() {
  return new Promise((ok_) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok_(p)); });
  });
}

// ------------------------------------------------------------- avvio
const amm = new Client({ connectionString: PG });
await amm.connect();
await amm.query('DROP DATABASE IF EXISTS prova_beta');
await amm.query('CREATE DATABASE prova_beta');
const u = new URL(PG); u.pathname = '/prova_beta';
const db = new Pool({ connectionString: u.toString(), max: 3 });
await db.query(fs.readFileSync(path.join(RADICE, 'prove', 'sql', 'utenti.sql'), 'utf8'));

// com'era il database prima: due account, tre richieste dal form (una di un
// indirizzo che aveva gia' un account), un invito del pannello senza account
await db.query(
  `INSERT INTO "User"(id, email, username, "passwordHash", "displayName") VALUES
     ('u-vecchio', 'vecchio@prova.it', 'vecchio', $1, 'Vecchio'),
     ('u-admin', '${ADMIN}', 'admin', $2, 'Admin')`,
  [bcrypt.hashSync('vecchia-password', 4), bcrypt.hashSync('admin-password', 4)]);
await db.query(
  `INSERT INTO beta_signups(email, profile, created_at) VALUES
     ('primo@prova.it', 'Quant / esperto', now() - interval '3 days'),
     ('secondo@prova.it', 'Non programmo', now() - interval '2 days'),
     ('vecchio@prova.it', 'So programmare un po''', now() - interval '1 day')`);
await db.query(`INSERT INTO "BetaAccess"(email, "addedBy") VALUES ('invitato@prova.it', '${ADMIN}')`);

const smtp = await serverPosta();
const PORTA = await portaLibera();
const BASE = `http://127.0.0.1:${PORTA}`;
const env = {
  ...process.env,
  DATABASE_URL: u.toString(), PGSSLMODE: 'disable',
  APP_TOKEN_SECRET: SEGRETO_APP, DASHBOARD_API_SECRET: SEGRETO_DASH,
  ADMIN_EMAILS: ADMIN, SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port),
  SMTP_USER: 'noreply@prova.it', SMTP_PASS: 'x', EMAIL_FROM: 'Lyra <noreply@prova.it>',
  BETA_CONTROLLO_DOMINIO: '0', NEXT_TELEMETRY_DISABLED: '1',
};
const nextBin = require.resolve('next/dist/bin/next', { paths: [RADICE] });
const sito = spawn(process.execPath, [nextBin, 'start', '-p', String(PORTA), '-H', '127.0.0.1'],
                   { cwd: RADICE, env, stdio: ['ignore', 'pipe', 'pipe'] });
let logSito = '';
sito.stdout.on('data', (d) => { logSito += d; });
sito.stderr.on('data', (d) => { logSito += d; });

async function chiama(p, corpo, o = {}) {
  const h = { 'Content-Type': 'application/json', ...(o.h || {}) };
  if (o.dash) h['x-dashboard-secret'] = SEGRETO_DASH;
  const r = await fetch(BASE + p, {
    method: corpo === undefined ? 'GET' : 'POST', headers: h,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  let d = {};
  try { d = await r.json(); } catch { /* vuoto */ }
  return { st: r.status, d };
}
const pannello = (azione, extra = {}) =>
  chiama('/api/dashboard/beta', { azione, richiedente: ADMIN, ...extra }, { dash: true });
const richiesta = (email, ip, extra = {}) =>
  chiama('/api/beta', { email, profile: 'Quant / esperto', ...extra },
         { h: { 'x-forwarded-for': ip } });
const accedi = (email, password) => chiama('/api/app/login', { email, password });
const riga = async (sql, p = []) => (await db.query(sql, p)).rows[0];

try {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(BASE + '/api/beta'); if (r.status) break; } catch { /* non ancora */ }
    await new Promise((x) => setTimeout(x, 500));
  }

  console.log('\nA. Le richieste di prima si preparano al primo uso');
  let { st, d } = await chiama('/api/dashboard/beta', undefined, { dash: true });
  verifica(st === 200 && d.ok, 'il pannello legge lo stato', JSON.stringify(d).slice(0, 200));
  verifica(d.numeri && d.numeri.account === 5 && d.numeri.beta === 4 && d.numeri.richieste === 3,
           'primo e secondo hanno un account, l\'invito del pannello anche: 5 account, 4 della beta',
           JSON.stringify(d.numeri));
  const voce = (e) => (d.elenco || []).find((v) => v.email === e) || {};
  verifica(voce('primo@prova.it').origine === 'richiesta' && voce('primo@prova.it').account
           && voce('vecchio@prova.it').origine === 'esistente'
           && voce('invitato@prova.it').origine === 'admin' && voce('invitato@prova.it').dalPannello,
           'l\'elenco dice da dove viene ciascuno');
  let x = await riga(`SELECT u."passwordHash", b."passwordCifrata" FROM "User" u
                        JOIN "BetaAccount" b ON b."userId" = u.id WHERE u.email = 'primo@prova.it'`);
  verifica(x && x.passwordHash === '$beta$' && x.passwordCifrata === null,
           'preparati senza password: nessuna password li apre finche\' non parte l\'invito');
  x = await riga(`SELECT esito FROM beta_signups WHERE email = 'vecchio@prova.it'`);
  verifica(x.esito === 'esistente', 'l\'indirizzo con un account non ne riceve un secondo');
  verifica(d.limite === 405 && d.attiva === false && d.posta === true,
           'il limite predefinito e\' 405; beta spenta; posta configurata');

  console.log('\nB. Impostazioni e beta accesa');
  ({ st, d } = await pannello('impostazioni', { limite: 7 }));
  verifica(st === 200 && d.limite === 7, 'il limite si cambia dal pannello');
  ({ st } = await pannello('impostazioni', { link: 'non un indirizzo' }));
  verifica(st === 400, 'un link che non e\' un indirizzo viene rifiutato');
  ({ st, d } = await pannello('interruttore', { attiva: true }));
  verifica(st === 200 && d.attiva === true, 'la beta si accende');
  ({ d } = await chiama('/api/beta'));
  verifica(d.attiva === true && d.count === 3, 'la pagina pubblica sa che la beta e\' accesa');

  console.log('\nC. Le richieste dal form');
  ({ d } = await richiesta('Terzo@Prova.it', '10.0.0.1'));
  verifica(d.esito === 'account', 'una richiesta crea l\'account (6 su 7)', JSON.stringify(d));
  ({ d } = await richiesta('quarto@prova.it', '10.0.0.2'));
  verifica(d.esito === 'account', 'e la successiva (7 su 7)');
  ({ d } = await richiesta('quinto@prova.it', '10.0.0.3'));
  verifica(d.esito === 'lista', 'oltre il limite la richiesta resta in lista, senza account', JSON.stringify(d));
  ({ d } = await richiesta('terzo@prova.it', '10.0.0.4'));
  verifica(d.esito === 'gia' && d.stato === 'account', 'ripetere la richiesta non crea niente');
  ({ d } = await richiesta('quinto@prova.it', '10.0.0.4'));
  verifica(d.esito === 'gia' && d.stato === 'lista', 'nemmeno per chi e\' in lista');
  ({ st, d } = await richiesta('bot@prova.it', '10.0.0.5', { sito: 'http://spam.example' }));
  x = await riga(`SELECT COUNT(*)::int AS n FROM beta_signups WHERE email = 'bot@prova.it'`);
  verifica(st === 200 && d.ok && x.n === 0, 'il campo nascosto: risposta «ok», nessuna richiesta registrata');
  let ultimo = 0;
  for (let i = 0; i < 7; i++) ultimo = (await richiesta(`raffica${i}@prova.it`, '10.0.0.9')).st;
  verifica(ultimo === 429, 'sei richieste all\'ora dalla stessa connessione, la settima no');
  x = await riga(`SELECT u."passwordHash", b."passwordCifrata", b.origine FROM "User" u
                    JOIN "BetaAccount" b ON b."userId" = u.id WHERE u.email = 'terzo@prova.it'`);
  const chiave = crypto.createHmac('sha256', SEGRETO_APP).update('lyra:beta-credenziali:v1').digest();
  const decifra = (v) => {
    const b = Buffer.from(v.slice(4), 'base64');
    const dd = crypto.createDecipheriv('aes-256-gcm', chiave, b.subarray(0, 12));
    dd.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([dd.update(b.subarray(28)), dd.final()]).toString('utf8');
  };
  const pwTerzo = x && x.passwordCifrata ? decifra(x.passwordCifrata) : '';
  verifica(x && x.origine === 'richiesta' && x.passwordHash.length === 60
           && /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/.test(pwTerzo)
           && /[A-Z]/.test(pwTerzo) && /[a-z]/.test(pwTerzo) && /[2-9]/.test(pwTerzo)
           && !/[IlO01]/.test(pwTerzo) && bcrypt.compareSync(pwTerzo, x.passwordHash),
           'password casuale (maiuscole, minuscole, cifre, trattini; niente caratteri ambigui), cifrata e con la sua impronta',
           pwTerzo);

  console.log('\nD. Durante la beta nessuno crea un account da se\'');
  ({ st, d } = await chiama('/api/app/account', { action: 'register', email: 'nuovo@prova.it',
                                                  username: 'nuovo', password: 'abcdefgh12' }));
  verifica(st === 403 && d.code === 'beta_iscrizioni_chiuse', 'il modulo d\'iscrizione dell\'app risponde «chiuso»');
  ({ st, d } = await chiama('/api/app/verify', { action: 'request', purpose: 'register', email: 'nuovo@prova.it' }));
  verifica(st === 403 && d.code === 'beta_iscrizioni_chiuse', 'anche la richiesta del codice di conferma');
  const primaDelRecupero = posta.length;
  ({ st } = await chiama('/api/app/verify', { action: 'request', purpose: 'reset', email: 'quinto@prova.it' }));
  await new Promise((r) => setTimeout(r, 300));
  verifica(st === 200 && posta.length === primaDelRecupero,
           'il recupero per un indirizzo senza account non spedisce niente (non crea piu\' account)');
  ({ st, d } = await accedi('quinto@prova.it', 'qualunque'));
  verifica(st === 403 && d.code === 'beta_in_lista', 'chi e\' in lista, all\'accesso, lo sa', JSON.stringify(d));
  ({ st, d } = await accedi('sconosciuto@prova.it', 'qualunque'));
  verifica(st === 403 && d.code === 'beta_non_ammesso', 'chi non ha chiesto la beta: non ammesso');
  ({ st, d } = await accedi('terzo@prova.it', 'password-sbagliata'));
  verifica(st === 401, 'un account della beta con la password sbagliata: credenziali non valide');

  console.log('\nE. Il pannello aggiunge account anche oltre il limite');
  ({ st, d } = await pannello('aggiungi', { email: 'sesto@prova.it' }));
  verifica(st === 200 && d.esito === 'creato', 'creato anche con i posti finiti', JSON.stringify(d));
  x = await riga(`SELECT (SELECT COUNT(*)::int FROM "User") AS n,
                         (SELECT COUNT(*)::int FROM "BetaAccess" WHERE email = 'sesto@prova.it') AS amm`);
  verifica(x.n === 8 && x.amm === 1, '8 account con il limite a 7; e l\'indirizzo e\' fra gli ammessi');
  ({ d } = await pannello('aggiungi', { email: 'vecchio@prova.it' }));
  verifica(d.esito === 'esistente', 'un indirizzo con un account: non se ne crea un altro');

  console.log('\nF. «Invite all»');
  ({ st, d } = await pannello('invita', { lotto: 2 }));
  verifica(st === 409 && /link/i.test(d.error || ''), 'senza il link di download non parte niente');
  ({ st } = await pannello('impostazioni', { link: LINK }));
  verifica(st === 200, 'il link si salva');
  ({ st, d } = await pannello('anteprima'));
  const ant = ultimaPer(ADMIN);
  verifica(st === 200 && ant && /Anteprima/.test(ant.oggetto) && ant.testo.includes(LINK) && passwordIn(ant),
           'l\'anteprima arriva a chi la chiede, con il link e credenziali di esempio', ant && ant.oggetto);
  await pannello('aggiungi', { email: 'rotto+rifiuta@prova.it' });
  const inizio = new Date().toISOString();
  let giri = 0;
  let tot = { inviati: 0, falliti: 0 };
  do {
    ({ st, d } = await pannello('invita', { lotto: 2, inizio }));
    tot.inviati += d.inviati || 0; tot.falliti += d.falliti || 0; giri++;
  } while (st === 200 && d.restanti > 0 && giri < 20);
  verifica(st === 200 && d.restanti === 0 && tot.inviati === 7 && tot.falliti === 1,
           'a lotti di due: 7 inviati, 1 fallito, nessuno rimasto', JSON.stringify(tot) + ' giri ' + giri);
  x = await riga(`SELECT valore FROM "AppSetting" WHERE chiave = 'beta_started_at'`);
  verifica(!!(x && x.valore), 'il primo «Invite all» segna l\'inizio della beta');
  const conPw = ['primo@prova.it', 'secondo@prova.it', 'terzo@prova.it', 'quarto@prova.it',
                 'sesto@prova.it', 'invitato@prova.it'];
  verifica(conPw.every((a) => { const m = ultimaPer(a); return m && m.testo.includes(LINK) && passwordIn(m) && m.testo.includes(a); }),
           'gli account creati ricevono link, indirizzo e prima password');
  const pTerzo = passwordIn(ultimaPer('terzo@prova.it'));
  verifica(pTerzo === pwTerzo, 'la password dell\'email e\' quella generata alla richiesta');
  const pPrimo = passwordIn(ultimaPer('primo@prova.it'));
  x = await riga(`SELECT "passwordHash" FROM "User" WHERE email = 'primo@prova.it'`);
  verifica(pPrimo && bcrypt.compareSync(pPrimo, x.passwordHash),
           'per le richieste di prima la password nasce all\'invito, e apre l\'account');
  const mv = ultimaPer('vecchio@prova.it');
  verifica(mv && mv.testo.includes(LINK) && !passwordIn(mv) && /password che usi gi/.test(mv.testo),
           'chi aveva gia\' un account riceve il link, senza password');
  x = await riga(`SELECT "invitedAt", "inviteError" FROM "BetaAccount" WHERE email = 'rotto+rifiuta@prova.it'`);
  verifica(x && !x.invitedAt && /550/.test(x.inviteError || ''), 'l\'invito rifiutato dal server di posta si ricorda con il motivo', x && x.inviteError);
  ({ d } = await pannello('invita', { lotto: 2, inizio: new Date().toISOString() }));
  verifica(d.inviati === 0 && d.falliti === 0 && d.restanti === 0,
           'un secondo «Invite all» non rimanda niente a chi l\'ha gia\' ricevuto');
  ({ d } = await pannello('invita', { lotto: 2, riprova: true, inizio: new Date().toISOString() }));
  verifica(d.falliti === 1 && d.restanti === 0, '«Retry»: il fallito si riprova una volta per giro, non all\'infinito', JSON.stringify(d));

  console.log('\nG. Dopo l\'inizio, l\'invito parte subito');
  ({ d } = await richiesta('settimo@prova.it', '10.0.1.1'));
  verifica(d.esito === 'lista', 'posti finiti: in lista');
  await pannello('impostazioni', { limite: 30 });
  ({ d } = await richiesta('ottavo@prova.it', '10.0.1.2'));
  const mo = ultimaPer('ottavo@prova.it');
  verifica(d.esito === 'account' && d.invitato === true && mo && passwordIn(mo),
           'alzato il limite, la richiesta nuova ha account e invito subito', JSON.stringify(d));

  console.log('\nH. Il primo accesso: si sceglie la propria password');
  ({ st, d } = await accedi('terzo@prova.it', pTerzo));
  verifica(st === 200 && d.devePassword === true && d.challenge && !d.token,
           'con la password dell\'email: nessun token, si sceglie la password', JSON.stringify(d).slice(0, 120));
  const sfida = d.challenge;
  ({ st, d } = await chiama('/api/app/login/password', { challenge: sfida, password: pTerzo }));
  verifica(st === 400, 'la stessa password dell\'email non va bene');
  ({ st } = await chiama('/api/app/login/password', { challenge: sfida, password: 'corta' }));
  verifica(st === 400, 'nemmeno una di meno di 8 caratteri');
  ({ st } = await chiama('/api/app/login/password', { challenge: 'falso', password: 'NuovaPassword-123' }));
  verifica(st === 401, 'senza un passaggio valido non si cambia niente');
  ({ st, d } = await chiama('/api/app/login/password', { challenge: sfida, password: 'NuovaPassword-123' }));
  verifica(st === 200 && d.token && d.user && d.user.email === 'terzo@prova.it', 'scelta la password, arriva il token');
  x = await riga(`SELECT b."passwordChangedAt", b."passwordCifrata", u."emailVerified" FROM "BetaAccount" b
                    JOIN "User" u ON u.id = b."userId" WHERE b.email = 'terzo@prova.it'`);
  verifica(x.passwordChangedAt && x.passwordCifrata === null && x.emailVerified,
           'la copia cifrata della prima password si cancella; l\'indirizzo risulta verificato');
  ({ st } = await accedi('terzo@prova.it', pTerzo));
  verifica(st === 401, 'la password dell\'email non vale piu\'');
  ({ st, d } = await accedi('terzo@prova.it', 'NuovaPassword-123'));
  verifica(st === 200 && d.token && !d.devePassword, 'quella scelta si')
  ;({ st } = await chiama('/api/app/login/password', { challenge: sfida, password: 'AltraPassword-456' }));
  verifica(st === 409, 'il passaggio non serve piu\' una volta scelta la password');
  ({ st, d } = await pannello('reinvia', { email: 'terzo@prova.it' }));
  const rt = ultimaPer('terzo@prova.it');
  verifica(st === 200 && rt && !passwordIn(rt) && rt.testo.includes(LINK),
           'un nuovo invito a chi ha gia\' scelto la password: solo il link');

  console.log('\nI. Togliere dal pannello');
  await pannello('impostazioni', { link: '' });
  ({ d } = await pannello('aggiungi', { email: 'decimo@prova.it' }));
  verifica(d.esito === 'creato' && !d.invito, 'senza link l\'account nasce ma l\'invito aspetta');
  ({ st, d } = await pannello('rimuovi', { email: 'decimo@prova.it' }));
  x = await riga(`SELECT COUNT(*)::int AS n FROM "User" WHERE email = 'decimo@prova.it'`);
  verifica(st === 200 && d.accountTolto === true && x.n === 0,
           'mai invitato: togliendolo si toglie anche l\'account che il pannello aveva creato');
  await pannello('impostazioni', { link: LINK });
  const pSesto = passwordIn(ultimaPer('sesto@prova.it'));
  ({ st, d } = await pannello('rimuovi', { email: 'sesto@prova.it' }));
  verifica(st === 200 && d.accountTolto === false, 'gia\' invitato: l\'account resta, perde l\'ammissione');
  ({ st, d } = await accedi('sesto@prova.it', pSesto));
  verifica(st === 403 && d.code === 'beta_non_ammesso', 'e con la beta attiva non entra');
  ({ st, d } = await pannello('rimuovi', { email: 'primo@prova.it' }));
  verifica(st === 404 && /ammesso/.test(d.detail || ''), 'una richiesta dal sito non si toglie da qui, e lo si dice');

  console.log('\nJ. Richieste simultanee al limite');
  x = await riga('SELECT COUNT(*)::int AS n FROM "User"');
  await pannello('impostazioni', { limite: x.n + 2 });
  const insieme = await Promise.all([0, 1, 2, 3, 4, 5].map((i) =>
    richiesta(`insieme${i}@prova.it`, `10.0.2.${i}`)));
  const esiti = insieme.map((r) => r.d.esito);
  verifica(esiti.filter((e) => e === 'account').length === 2 && esiti.filter((e) => e === 'lista').length === 4,
           'sei richieste insieme con due posti liberi: due account, quattro in lista', esiti.join(','));

  console.log('\nK. Con la beta spenta');
  await pannello('interruttore', { attiva: false });
  await pannello('impostazioni', { limite: 1 });
  ({ d } = await richiesta('dopo@prova.it', '10.0.3.1'));
  verifica(d.esito === 'account', 'il limite vale solo con la beta accesa: l\'account nasce lo stesso');
  ({ st, d } = await chiama('/api/app/verify', { action: 'request', purpose: 'register', email: 'libero@prova.it' }));
  verifica(st === 200 && d.ok, 'e l\'iscrizione dall\'app torna aperta');
} catch (e) {
  fallite.push('eccezione: ' + (e && e.stack || e));
  console.log(e);
} finally {
  sito.kill('SIGTERM');
  smtp.close();
  await db.end();
  await new Promise((r) => setTimeout(r, 800));
  await amm.query('DROP DATABASE IF EXISTS prova_beta').catch(() => {});
  await amm.end();
  if (fallite.length && /error/i.test(logSito)) {
    console.log('\n--- registro del sito (righe con errori) ---');
    console.log(logSito.split('\n').filter((r) => /error/i.test(r)).slice(-20).join('\n'));
  }
  console.log('\n' + '='.repeat(70));
  if (fallite.length) {
    console.log(`FALLITE ${fallite.length} (su ${ok + fallite.length}):`);
    fallite.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log(`TUTTO A POSTO (${ok} verifiche)`);
}
