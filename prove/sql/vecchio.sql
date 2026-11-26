-- ===========================================================================
--  prove/sql/vecchio.sql — FIXTURE DI PROVA, non va eseguito sul sito.
--
--  Lo schema degli abbonamenti com'era sul database del sito prima che il
--  catalogo passasse nel codice (src/lib/catalogo.ts): marketplace_beta.sql
--  seguito dal marketplace_abbonamenti.sql di allora, con i tre piani
--  segnaposto Author, Studio e Desk a 9/19/39 € e i livelli da 1 a 3.
--  prove/prova-catalogo.mjs lo carica in un database di prova e controlla
--  che il sito lo porti da solo al catalogo.
-- ===========================================================================

-- ===========================================================================
--  marketplace_beta.sql — accesso riservato durante la fase beta
-- ===========================================================================
--
--  DUE OGGETTI, con ruoli diversi.
--
--  "BetaAccess" e' l'elenco di chi puo' entrare. E' un DATO, perche' cambia
--  di continuo: si invita qualcuno, si toglie qualcun altro, e farlo passare
--  da una variabile d'ambiente significherebbe un deploy per ogni invito.
--
--  "AppSetting" tiene l'interruttore. Sta nel database e non nel codice per
--  la stessa ragione: chiudere o aprire la beta e' una decisione che si
--  prende in un momento, non un rilascio da preparare.
--
--  QUANDO L'INTERRUTTORE E' SPENTO l'elenco viene ignorato del tutto e
--  l'accesso torna quello di prima. Non si svuota la lista per riaprire: si
--  spegne l'interruttore, e la lista resta li' per la volta dopo.
--
--  Idempotente: si puo' rieseguire.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "BetaAccess" (
  email       TEXT PRIMARY KEY,          -- sempre minuscolo
  "addedBy"   TEXT NOT NULL,             -- chi ha invitato
  "addedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nota        TEXT
);

CREATE INDEX IF NOT EXISTS "BetaAccess_addedAt_idx"
  ON "BetaAccess" ("addedAt" DESC);

-- Impostazioni dell'applicazione: chiave -> valore, in testo.
-- Una tabella generica invece di una colonna per ogni interruttore: le
-- opzioni future non richiederanno una migrazione.
CREATE TABLE IF NOT EXISTS "AppSetting" (
  chiave      TEXT PRIMARY KEY,
  valore      TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT
);

-- L'interruttore parte SPENTO: eseguire questo file non deve chiudere fuori
-- nessuno. Chi vuole la beta la accende dal pannello, dopo aver popolato
-- l'elenco — nell'ordine giusto, senza restare chiuso fuori da solo.
INSERT INTO "AppSetting"(chiave, valore, "updatedBy")
VALUES ('beta_enabled', 'false', 'schema')
ON CONFLICT (chiave) DO NOTHING;

COMMENT ON TABLE "BetaAccess" IS
  'Indirizzi ammessi durante la beta. Ignorato se AppSetting.beta_enabled '
  'e'' ''false''.';
COMMENT ON TABLE "AppSetting" IS
  'Impostazioni dell''applicazione, chiave/valore. beta_enabled = ''true'' '
  'limita l''accesso agli indirizzi in "BetaAccess".';

-- ===========================================================================
--  marketplace_abbonamenti.sql — i tre abbonamenti e il lucchetto del
--                                marketplace
-- ===========================================================================
--
--  SOSTITUISCE marketplace_abbonamento.sql (singolare), che aggiungeva le due
--  colonne `subscriptionStatus` / `subscriptionUntil`. Quelle due colonne sono
--  RICREATE anche qui, idempotenti: basta eseguire QUESTO file, sia su un
--  database che aveva già il file precedente sia su uno che non l'ha mai
--  visto. Non serve eseguirli in ordine e non serve ricordare quale dei due è
--  passato.
--
--  COSA CAMBIA, IN UNA FRASE. Prima «abbonato» era un sì/no scritto a mano per
--  i primi autori. Ora è un LIVELLO fra quattro, con un pagamento ricorrente
--  vero dietro, e l'intero marketplace ha davanti un lucchetto che durante la
--  beta tiene chiuso tutto.
--
--  ---------------------------------------------------------------------------
--  1. IL LUCCHETTO, E PERCHÉ IL VECCHIO INTERRUTTORE SI INVERTE
--  ---------------------------------------------------------------------------
--
--  C'era `paid_artifacts_enabled`: spento significava «si pubblica, ma gratis».
--  Non bastava. Durante la beta non si deve poter caricare NIENTE — né gratis
--  né a pagamento — perché ciò che entra in vetrina ora ci resta, e il filtro
--  all'ingresso (l'abbonamento) non esiste ancora.
--
--  Il nuovo interruttore è quindi un lucchetto e ha la polarità OPPOSTA:
--
--      marketplace_locked = 'true'   nessuno carica, nessuno compra   (beta)
--      marketplace_locked = 'false'  caricare richiede un abbonamento,
--                                    prezzi e acquisti attivi
--
--  La riga vecchia NON viene cancellata: serve a tradurre lo stato corrente
--  (sotto) e a tornare indietro se si volesse. Dopo questa migrazione non è
--  più letta da nessuno.
--
--  ---------------------------------------------------------------------------
--  2. I PIANI SONO DATI, NON CODICE
--  ---------------------------------------------------------------------------
--
--  "SubscriptionPlan" tiene nome, prezzi e funzionalità dei tre livelli. Sta
--  nel database per due ragioni, entrambe pratiche:
--
--    - i prezzi di adesso sono SEGNAPOSTO e cambieranno in uscita dalla beta.
--      Un prezzo nel codice vuol dire un rilascio per cambiarlo, e un rilascio
--      per cambiare un prezzo non si fa quando serve;
--    - oggi i tre livelli danno la stessa cosa (caricare sul marketplace) e
--      differiscono solo per prezzo. Quando si deciderà cosa aggiungere ai due
--      superiori, sarà una UPDATE su `features`, non una migrazione.
--
--  Non ci sono Product/Price creati sul pannello Stripe, e non per pigrizia: il
--  checkout li costruisce al volo da questa tabella (`price_data` ricorrente).
--  Così esiste UN SOLO posto dove un prezzo è scritto. Due posti divergono
--  sempre, e qui divergere significa addebitare una cifra diversa da quella
--  mostrata.
--
--  ---------------------------------------------------------------------------
--  3. LE QUATTRO CATEGORIE
--  ---------------------------------------------------------------------------
--
--      tier 0   non abbonato (predefinito)  sfoglia, scarica, compra
--      tier 1   primo livello               + carica sul marketplace
--      tier 2   secondo livello             + carica sul marketplace
--      tier 3   terzo livello               + carica sul marketplace
--
--  Gli AMMINISTRATORI non sono un livello: passano sopra a tutto, lucchetto
--  compreso. Un livello in più li avrebbe fatti scadere.
--
--  Idempotente: si può rieseguire.
-- ===========================================================================


-- ---------------------------------------------------------------------------
--  Stato dell'abbonamento (anche se marketplace_abbonamento.sql non è passato)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('none', 'subscribed', 'past_due', 'cancelled');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" subscription_status NOT NULL DEFAULT 'none';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionUntil" TIMESTAMPTZ;

-- Il LIVELLO. Zero è il predefinito, cioè la prima delle quattro categorie:
-- un utente pieno che sfoglia, scarica e compra, ma non mette in vetrina.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionTier" SMALLINT NOT NULL DEFAULT 0;

-- Mensile o annuale. Serve a mostrare la cosa giusta nel pannello e a sapere
-- quale prezzo rinnovare; il rinnovo vero lo gestisce Stripe.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionPeriod" TEXT;

-- Il cliente su Stripe. Si tiene perché serve a DUE cose che senza di esso non
-- si possono fare: riaprire il portale di fatturazione (disdetta, cambio
-- carta) senza chiedere di nuovo i dati, e riconoscere l'utente quando arriva
-- un rinnovo, che è un evento senza sessione di checkout dietro.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

-- Disdetta chiesta ma periodo ancora in corso: l'abbonamento resta attivo
-- fino a questa data e poi scade da sé. Senza questa colonna, «ho disdetto»
-- e «sono scaduto» sarebbero lo stesso stato, e si toglierebbe l'accesso a
-- qualcuno che ha pagato fino a fine mese.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionCancelAt" TIMESTAMPTZ;

-- Il vincolo si aggiunge solo se non c'è: ADD CONSTRAINT non ha una forma
-- "IF NOT EXISTS", e senza questa guardia rieseguire il file fallirebbe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'User_subscriptionTier_range') THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_subscriptionTier_range"
      CHECK ("subscriptionTier" BETWEEN 0 AND 3);
  END IF;
END $$;

-- Il controllo di pubblicazione gira a ogni tentativo.
CREATE INDEX IF NOT EXISTS "User_subscription_idx"
  ON "User" ("subscriptionStatus")
  WHERE "subscriptionStatus" <> 'none';

-- I webhook di rinnovo arrivano con l'id Stripe, non con l'id dell'utente:
-- senza questi indici ogni rinnovo costerebbe una scansione della tabella.
CREATE INDEX IF NOT EXISTS "User_stripeSubscription_idx"
  ON "User" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "User_stripeCustomer_idx"
  ON "User" ("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL;

COMMENT ON COLUMN "User"."subscriptionStatus" IS
  'Stato dell''abbonamento. Solo ''subscribed'' (e gli amministratori) '
  'possono pubblicare sul marketplace, anche artefatti gratuiti.';
COMMENT ON COLUMN "User"."subscriptionUntil" IS
  'Fine del periodo pagato. NULL = senza scadenza (autori invitati a mano). '
  'Una data passata vale come non abbonato, senza aggiornare lo stato.';
COMMENT ON COLUMN "User"."subscriptionTier" IS
  '0 = non abbonato, 1..3 = i tre livelli (vedi "SubscriptionPlan").';


-- ---------------------------------------------------------------------------
--  I tre piani
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  tier            SMALLINT PRIMARY KEY CHECK (tier BETWEEN 1 AND 3),
  code            TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  tagline         TEXT        NOT NULL DEFAULT '',
  "monthlyCents"  INTEGER     NOT NULL CHECK ("monthlyCents" >= 0),
  "annualCents"   INTEGER     NOT NULL CHECK ("annualCents"  >= 0),
  currency        TEXT        NOT NULL DEFAULT 'EUR',
  -- Cosa dà il livello. Oggi solo `can_publish`; i campi che verranno —
  -- quanti artefatti, se si può mettere un prezzo, quale commissione — si
  -- aggiungono qui senza toccare lo schema.
  features        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Il "prodotto" su Stripe: SOLO un contenitore del nome, creato alla prima
  -- occorrenza e poi riusato. Il PREZZO non sta su Stripe — resta nelle due
  -- colonne qui sopra — ma senza un prodotto a cui agganciarlo non si puo'
  -- cambiare il livello di un abbonamento in corso col conguaglio del
  -- periodo gia' pagato: l'API dei prezzi al volo, in quel punto, pretende
  -- un prodotto esistente. Senza, l'unico modo di cambiare livello sarebbe
  -- disdire e riabbonarsi, perdendo i giorni gia' pagati.
  "stripeProductId" TEXT,
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy"     TEXT
);

-- Su un database che aveva gia' la tabella (riesecuzione dopo un
-- aggiornamento), la colonna va aggiunta a parte: CREATE TABLE IF NOT EXISTS
-- non modifica una tabella che esiste.
ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "stripeProductId" TEXT;

COMMENT ON TABLE "SubscriptionPlan" IS
  'I tre livelli di abbonamento. Prezzi in centesimi, modificabili dal '
  'pannello di amministrazione: il checkout li legge da qui e non da '
  'Product/Price creati su Stripe, così un prezzo è scritto in un solo posto.';
COMMENT ON COLUMN "SubscriptionPlan"."annualCents" IS
  'Prezzo annuale TOTALE, non mensile. Il predefinito vale dieci mensilità: '
  'due mesi in regalo a chi paga l''anno.';

-- Prezzi SEGNAPOSTO. Vanno cambiati dal pannello prima di aprire il
-- marketplace: finché il lucchetto è chiuso nessuno estraneo può abbonarsi,
-- quindi restare con questi numeri durante la beta non addebita nulla a
-- nessuno.
INSERT INTO "SubscriptionPlan"
  (tier, code, name, tagline, "monthlyCents", "annualCents", currency, features)
VALUES
  (1, 'author',  'Author',  'Publish your artifacts on the marketplace.',
      900,  9000,  'EUR', '{"can_publish": true, "placeholder_price": true}'::jsonb),
  (2, 'studio',  'Studio',  'Publish your artifacts on the marketplace.',
      1900, 19000, 'EUR', '{"can_publish": true, "placeholder_price": true}'::jsonb),
  (3, 'desk',    'Desk',    'Publish your artifacts on the marketplace.',
      3900, 39000, 'EUR', '{"can_publish": true, "placeholder_price": true}'::jsonb)
ON CONFLICT (tier) DO NOTHING;


-- ---------------------------------------------------------------------------
--  Storico dei pagamenti ricorrenti
-- ---------------------------------------------------------------------------
--  Il file precedente diceva: «quando arriverà un pagamento ricorrente vero —
--  con rinnovi, fatture e storico — quello vorrà una tabella sua». È arrivato.
--
--  Serve a tre domande a cui le colonne su "User" non possono rispondere,
--  perché quelle tengono lo stato CORRENTE: quanto ha pagato questa persona
--  finora, quando un rinnovo è stato rifiutato, e quale fattura corrisponde a
--  quale periodo.
--
--  `providerRef` è UNICO: è così che un webhook ritentato da Stripe non
--  registra due volte lo stesso incasso.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
  id             TEXT        PRIMARY KEY,
  "userId"       TEXT        NOT NULL,
  tier           SMALLINT    NOT NULL,
  period         TEXT        NOT NULL,          -- 'monthly' | 'annual'
  "amountCents"  INTEGER     NOT NULL,
  currency       TEXT        NOT NULL DEFAULT 'EUR',
  status         TEXT        NOT NULL,          -- 'paid' | 'failed' | 'refunded'
  provider       TEXT        NOT NULL DEFAULT 'stripe',
  "providerRef"  TEXT        UNIQUE,            -- id della fattura Stripe
  "periodStart"  TIMESTAMPTZ,
  "periodEnd"    TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "SubscriptionPayment_user_idx"
  ON "SubscriptionPayment" ("userId", "createdAt" DESC);

COMMENT ON TABLE "SubscriptionPayment" IS
  'Storico degli incassi di abbonamento. "providerRef" unico: un webhook '
  'ritentato non registra due volte lo stesso pagamento.';


-- ---------------------------------------------------------------------------
--  Il lucchetto, tradotto dallo stato corrente
-- ---------------------------------------------------------------------------
--  La traduzione è un'INVERSIONE, e va fatta qui una volta sola: scriverla nel
--  codice significherebbe che chiunque legga `marketplace_locked` debba
--  ricordarsi di negarlo.
--
--      paid_artifacts_enabled = 'true'   (vendite accese)  -> locked = 'false'
--      paid_artifacts_enabled = 'false'  o assente         -> locked = 'true'
--
--  Il predefinito è CHIUSO. Eseguire questo file su un database in beta non
--  deve aprire il marketplace per sbaglio.
-- ---------------------------------------------------------------------------
INSERT INTO "AppSetting"(chiave, valore, "updatedBy")
SELECT 'marketplace_locked',
       CASE WHEN lower(COALESCE(
              (SELECT valore FROM "AppSetting" WHERE chiave = 'paid_artifacts_enabled'),
              'false')) = 'true'
            THEN 'false' ELSE 'true' END,
       'marketplace_abbonamenti.sql'
ON CONFLICT (chiave) DO NOTHING;

-- La riga vecchia resta, non letta da nessuno, come traccia di com'era.
UPDATE "AppSetting"
   SET "updatedBy" = 'superata da marketplace_locked'
 WHERE chiave = 'paid_artifacts_enabled';


-- ---------------------------------------------------------------------------
--  Operazioni a mano, durante la beta
-- ---------------------------------------------------------------------------
--  Invitare un autore senza fargli pagare nulla (livello 1, senza scadenza):
--
--    UPDATE "User" SET "subscriptionStatus" = 'subscribed',
--                      "subscriptionTier"   = 1,
--                      "subscriptionUntil"  = NULL
--     WHERE lower(email) = 'autore@esempio.it';
--
--  Aprire il marketplace (lo fa anche l'interruttore nel pannello):
--
--    UPDATE "AppSetting" SET valore = 'false', "updatedAt" = NOW()
--     WHERE chiave = 'marketplace_locked';
--
--  Cambiare i prezzi (lo fa anche il pannello):
--
--    UPDATE "SubscriptionPlan"
--       SET "monthlyCents" = 1200, "annualCents" = 12000,
--           features = features - 'placeholder_price',
--           "updatedAt" = NOW(), "updatedBy" = 'admin'
--     WHERE tier = 1;
-- ---------------------------------------------------------------------------
