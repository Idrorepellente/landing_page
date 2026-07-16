export const css = `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#f3f3f4;color:#18181b;font-family:Mulish,ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:#5B57D9;text-decoration:none}
a:hover{color:#4744C4}
::selection{background:rgba(20,184,166,.22)}
@keyframes qsUp{0%{opacity:0;transform:translateY(24px)}100%{opacity:1;transform:none}}
@keyframes qsBlink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes qsFlowX{0%{transform:translateX(-30%);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(520%);opacity:0}}
`;

export const html = `
<div style="min-height: 100vh;background: #f3f3f4;color: #18181b;overflow-x: clip;position: relative">

<!-- NAV -->
<header data-nav style="position: fixed;top: 0;left: 0;right: 0;z-index: 50;transition: transform .3s ease,box-shadow .3s ease,background .3s ease;background: rgba(255,255,255,.8);backdrop-filter: blur(12px);-webkit-backdrop-filter: blur(12px)">
  <div style="max-width: 1152px;margin: 0 auto;display: flex;align-items: center;gap: 12px;padding: 0 32px;height: 60px">
    <a href="/" style="display: flex;align-items: center;gap: 9px">
      <span style="display: grid;place-items: center;height: 30px;width: 30px;border-radius: 9px;background: linear-gradient(135deg,#5B57D9,#18181b)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 21 19 3 19Z"/><path d="M12 4 8 19"/></svg></span>
      <span style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 16px;letter-spacing: -.02em;color: #18181b">Lyra</span>
    </a>
    <span style="margin-left: 14px;font: 600 12px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #a1a1aa">/ il motore</span>
    <div style="margin-left: auto;display: flex;align-items: center;gap: 14px">
      <a href="/" style="font-size: 13.5px;font-weight: 600;color: #3f3f46">← Landing</a>
      <a href="/obiettivo-fondo" style="font-size: 13.5px;font-weight: 600;color: #3f3f46">Obiettivo · Fondo</a>
      <a href="/motore-mappa" style="display: inline-flex;align-items: center;gap: 7px;height: 38px;padding: 0 15px;border-radius: 999px;white-space: nowrap;font: 700 13.5px Mulish,sans-serif;color: #18181b;border: 1px solid rgba(79,70,229,.3);background: #fff"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2.5"></circle><circle cx="18" cy="5" r="2.5"></circle><path d="M8.5 18.5A6 6 0 0 0 15.5 6.5"></path></svg> Mappa interattiva</a>
      <a href="/" style="display: inline-flex;align-items: center;height: 38px;padding: 0 18px;border-radius: 999px;white-space: nowrap;font: 700 13.5px Mulish,sans-serif;color: #fff;background: #18181b">Entra nella beta</a>
    </div>
  </div>
</header>

<!-- HERO -->
<section style="position: relative;max-width: 1152px;margin: 0 auto;padding: 128px 32px 40px;min-height: 340px">
  <div style="position: absolute;top: 0;bottom: 0;left: calc(50% - 50vw);width: 100vw;z-index: 0;overflow: hidden;pointer-events: none">
    <canvas data-neural style="display: block;width: 100%;height: 100%"></canvas>
    <div style="position: absolute;inset: 0;background: linear-gradient(180deg,rgba(243,243,244,0) 45%,rgba(243,243,244,.9) 100%)"></div>
  </div>
  <div style="position: relative;z-index: 1;max-width: 780px;animation: qsUp .7s both">
    <p style="display: inline-flex;align-items: center;gap: 12px;font: 600 12px 'IBM Plex Mono',monospace;letter-spacing: .24em;text-transform: uppercase;color: #3f3f46;margin: 0 0 18px"><span style="width: 26px;height: 1px;background: #52525b;opacity: .7"></span>Architettura del motore</p>
    <h1 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 44px;line-height: 1.06;letter-spacing: -.02em;margin: 0;color: #18181b;max-width: 16ch">Da dati grezzi a posizioni a <span style="background: linear-gradient(100deg,#18181b,#5B57D9);-webkit-background-clip: text;background-clip: text;color: transparent">rischio controllato</span>.</h1>
    <p style="color: #52525b;font-size: 16px;line-height: 1.65;margin: 22px 0 0;max-width: 64ch">Un motore sistematico multi-strategia. Ogni fase è disegnata attorno allo stesso principio: il rischio si governa <b style="color: #18181b;font-weight: 600">prima</b> del rendimento, e nessun numero entra nel sistema finché non sopravvive alla validazione fuori campione.</p>
  </div>
</section>

<!-- ENGINE PANEL (dark) -->
<section style="max-width: 1152px;margin: 0 auto;padding: 12px 32px 0">
  <div style="position: relative;overflow: hidden;border-radius: 24px;background: radial-gradient(120% 90% at 50% -10%,rgba(70,214,192,.06),transparent 60%),#0e0e10;padding: 44px 36px;box-shadow: 0 30px 70px -30px rgba(15,23,42,.5)">
    <div style="position: absolute;inset: 0;background-image: linear-gradient(rgba(150,180,190,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(150,180,190,.1) 1px,transparent 1px);background-size: 48px 48px;-webkit-mask-image: radial-gradient(130% 110% at 50% 0,#000 35%,transparent 78%);mask-image: radial-gradient(130% 110% at 50% 0,#000 35%,transparent 78%);opacity: .5;pointer-events: none"></div>
    <div style="position: relative">
      <!-- ruler -->
      <div style="display: flex;align-items: center;gap: 10px;font: 500 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #71717a;margin-bottom: 18px">
        <span style="color: #a1a1aa">Input</span>
        <span style="flex: 1;height: 8px;background-image: linear-gradient(90deg,rgba(150,180,190,.24) 1px,transparent 1px);background-size: calc(100% / 24) 100%;border-bottom: 1px solid rgba(150,180,190,.12)"></span>
        <span style="color: #a1a1aa">Output</span>
      </div>
      <!-- pipeline -->
      <div style="position: relative;display: grid;grid-template-columns: repeat(5,1fr);gap: 16px;align-items: stretch">
        <div style="position: absolute;left: 0;right: 0;top: 50%;height: 2px;transform: translateY(-50%);z-index: 0;overflow: hidden;background: linear-gradient(90deg,transparent,rgba(150,180,190,.24) 6%,rgba(150,180,190,.24) 94%,transparent)"><span style="position: absolute;top: 0;left: 0;height: 100%;width: 22%;background: linear-gradient(90deg,transparent,#a1a1aa,transparent);filter: drop-shadow(0 0 6px #a1a1aa);animation: qsFlowX 5.2s cubic-bezier(.5,0,.5,1) infinite"></span></div>

        <article data-reveal data-reveal-d="0" style="position: relative;z-index: 1;background: #1c1c1f;border: 1px solid rgba(150,180,190,.12);border-radius: 6px;padding: 18px 16px;display: flex;flex-direction: column;gap: 11px;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)">
          <div style="display: flex;align-items: baseline;gap: 9px"><span style="font: 500 12px 'IBM Plex Mono',monospace;color: #71717a">01</span><span style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .2em;text-transform: uppercase;color: #a1a1aa">Dati</span></div>
          <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;line-height: 1.2;margin: 0;color: #E9EFF1">Ingestione &amp; integrità</h3>
          <p style="font-size: 12.5px;line-height: 1.5;color: #a1a1aa;margin: 0;flex: 1">Universo multi-classe da più fonti. Selezione point-in-time e controlli di qualità automatici prima di ogni backtest: mai dati puliti col senno di poi.</p>
          <ul style="list-style: none;margin: 0;padding: 0;display: flex;flex-wrap: wrap;gap: 6px"><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">multi-asset</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">point-in-time</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">quality gate</li></ul>
        </article>

        <article data-reveal data-reveal-d="80" style="position: relative;z-index: 1;background: #1c1c1f;border: 1px solid rgba(150,180,190,.12);border-radius: 6px;padding: 18px 16px;display: flex;flex-direction: column;gap: 11px;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)">
          <span style="position: absolute;left: -12px;top: 50%;transform: translate(-50%,-50%);width: 9px;height: 9px;border-radius: 999px;background: #a1a1aa;box-shadow: 0 0 0 4px #0e0e10,0 0 10px #a1a1aa;z-index: 3"></span><div style="display: flex;align-items: baseline;gap: 9px"><span style="font: 500 12px 'IBM Plex Mono',monospace;color: #71717a">02</span><span style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .2em;text-transform: uppercase;color: #a1a1aa">Strategie</span></div>
          <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;line-height: 1.2;margin: 0;color: #E9EFF1">Edge decorrelati</h3>
          <p style="font-size: 12.5px;line-height: 1.5;color: #a1a1aa;margin: 0;flex: 1">Non una scommessa singola, ma un insieme di strategie indipendenti su stili e orizzonti diversi — fonti di rendimento a bassa correlazione reciproca.</p>
          <ul style="list-style: none;margin: 0;padding: 0;display: flex;flex-wrap: wrap;gap: 6px"><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">trend</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">mean-reversion</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">stat-arb</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">factor</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">overlay ML</li></ul>
        </article>

        <article data-reveal data-reveal-d="160" style="position: relative;z-index: 1;background: #1c1c1f;border: 1px solid rgba(150,180,190,.12);border-radius: 6px;padding: 18px 16px;display: flex;flex-direction: column;gap: 11px;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)">
          <span style="position: absolute;left: -12px;top: 50%;transform: translate(-50%,-50%);width: 9px;height: 9px;border-radius: 999px;background: #a1a1aa;box-shadow: 0 0 0 4px #0e0e10,0 0 10px #a1a1aa;z-index: 3"></span><div style="display: flex;align-items: baseline;gap: 9px"><span style="font: 500 12px 'IBM Plex Mono',monospace;color: #71717a">03</span><span style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .2em;text-transform: uppercase;color: #a1a1aa">Allocazione</span></div>
          <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;line-height: 1.2;margin: 0;color: #E9EFF1">Sizing corr-aware</h3>
          <p style="font-size: 12.5px;line-height: 1.5;color: #a1a1aa;margin: 0;flex: 1">Vol-targeting gerarchico che riconosce la correlazione reale tra posizioni: capitale distribuito per rischio effettivo, non per numero di trade. Limiti a ogni livello.</p>
          <ul style="list-style: none;margin: 0;padding: 0;display: flex;flex-wrap: wrap;gap: 6px"><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">vol-target</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">corr-aware</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;border: 1px solid rgba(150,180,190,.12);border-radius: 2px;padding: 3px 7px">caps</li></ul>
        </article>

        <article data-reveal data-reveal-d="240" style="position: relative;z-index: 1;background: linear-gradient(180deg,rgba(70,214,192,.06),transparent 60%),#0F211E;border: 1px solid rgba(70,214,192,.42);border-radius: 6px;padding: 18px 16px;display: flex;flex-direction: column;gap: 11px;box-shadow: 0 0 0 1px rgba(70,214,192,.1),0 18px 40px -28px rgba(70,214,192,.16);opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)">
          <span style="align-self: flex-start;font: 500 9.5px 'IBM Plex Mono',monospace;letter-spacing: .18em;text-transform: uppercase;color: #0e0e10;background: #a1a1aa;padding: 3px 7px;border-radius: 2px">Innovazione</span>
          <span style="position: absolute;left: -12px;top: 50%;transform: translate(-50%,-50%);width: 9px;height: 9px;border-radius: 999px;background: #a1a1aa;box-shadow: 0 0 0 4px #0e0e10,0 0 10px #a1a1aa;z-index: 3"></span><div style="display: flex;align-items: baseline;gap: 9px"><span style="font: 500 12px 'IBM Plex Mono',monospace;color: #71717a">04</span><span style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .2em;text-transform: uppercase;color: #a1a1aa">Ensemble</span></div>
          <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;line-height: 1.2;margin: 0;color: #E9EFF1">Meta-allocazione</h3>
          <p style="font-size: 12.5px;line-height: 1.5;color: #a1a1aa;margin: 0;flex: 1">Il cuore del sistema. Gli stream validati vengono combinati con una libreria di schemi di ponderazione — covarianza, cluster, tail-risk, regime — e protetti da overlay di stress componibili che tagliano l'esposizione quando la diversificazione si rompe.</p>
          <ul style="list-style: none;margin: 0;padding: 0;display: flex;flex-wrap: wrap;gap: 6px"><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #e4e4e7;border: 1px solid rgba(70,214,192,.28);border-radius: 2px;padding: 3px 7px">covarianza</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #e4e4e7;border: 1px solid rgba(70,214,192,.28);border-radius: 2px;padding: 3px 7px">cluster</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #e4e4e7;border: 1px solid rgba(70,214,192,.28);border-radius: 2px;padding: 3px 7px">tail-risk</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #e4e4e7;border: 1px solid rgba(70,214,192,.28);border-radius: 2px;padding: 3px 7px">regime</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #e4e4e7;border: 1px solid rgba(70,214,192,.28);border-radius: 2px;padding: 3px 7px">stress overlay</li></ul>
        </article>

        <article data-reveal data-reveal-d="320" style="position: relative;z-index: 1;background: #1c1c1f;border: 1px solid rgba(150,180,190,.12);border-radius: 6px;padding: 18px 16px;display: flex;flex-direction: column;gap: 11px;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)">
          <span style="position: absolute;left: -12px;top: 50%;transform: translate(-50%,-50%);width: 9px;height: 9px;border-radius: 999px;background: #EBB146;box-shadow: 0 0 0 4px #0e0e10,0 0 10px #EBB146;z-index: 3"></span><div style="display: flex;align-items: baseline;gap: 9px"><span style="font: 500 12px 'IBM Plex Mono',monospace;color: #71717a">05</span><span style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .2em;text-transform: uppercase;color: #EBB146">Rischio</span></div>
          <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;line-height: 1.2;margin: 0;color: #E9EFF1">Kill-switch &amp; esecuzione</h3>
          <p style="font-size: 12.5px;line-height: 1.5;color: #a1a1aa;margin: 0;flex: 1">Controllo del rischio a tre livelli — strategia, asset class, conto — con riduzione o stop automatici e log di audit. Esecuzione simulata con spread, slippage e commissioni realistici.</p>
          <ul style="list-style: none;margin: 0;padding: 0;display: flex;flex-wrap: wrap;gap: 6px"><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #f0d59a;border: 1px solid rgba(235,177,70,.3);border-radius: 2px;padding: 3px 7px">strategia</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #f0d59a;border: 1px solid rgba(235,177,70,.3);border-radius: 2px;padding: 3px 7px">asset-class</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #f0d59a;border: 1px solid rgba(235,177,70,.3);border-radius: 2px;padding: 3px 7px">conto</li><li style="font: 400 10.5px 'IBM Plex Mono',monospace;color: #f0d59a;border: 1px solid rgba(235,177,70,.3);border-radius: 2px;padding: 3px 7px">costi reali</li></ul>
        </article>
      </div>
      <!-- readout -->
      <div data-reveal style="margin-top: 22px;display: flex;align-items: center;gap: 16px;flex-wrap: wrap;background: #141416;border: 1px solid rgba(150,180,190,.12);border-left: 2px solid #a1a1aa;border-radius: 6px;padding: 16px 20px;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)">
        <span style="font: 500 14px 'IBM Plex Mono',monospace;color: #a1a1aa;letter-spacing: .1em">▶▶</span>
        <span style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .2em;text-transform: uppercase;color: #71717a">Output</span>
        <span style="font-size: 14px;color: #E9EFF1;line-height: 1.4;flex: 1;min-width: 280px">Esposizione <b style="color: #a1a1aa;font-weight: 600">vol-targeted</b>, <b style="color: #a1a1aa;font-weight: 600">bassa correlazione</b> ai fattori standard, <b style="color: #a1a1aa;font-weight: 600">drawdown governato</b> — un flusso di rendimento pensato per la diversificazione di portafoglio.</span>
      </div>
    </div>
  </div>
</section>

<!-- GOVERNANCE (light) -->
<section style="max-width: 1152px;margin: 0 auto;padding: 64px 32px 12px">
  <p data-reveal style="display: flex;align-items: center;gap: 14px;font: 600 11.5px 'IBM Plex Mono',monospace;letter-spacing: .2em;text-transform: uppercase;color: #a1a1aa;margin: 0 0 22px;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s ease">Governance trasversale — disciplina non negoziabile <span style="flex: 1;height: 1px;background: rgba(15,23,42,.1)"></span></p>
  <div style="display: grid;grid-template-columns: repeat(3,1fr);gap: 16px">
    <div data-reveal data-reveal-d="0" style="background: #fff;border: 1px solid rgba(15,23,42,.06);border-radius: 14px;box-shadow: 0 8px 24px -12px rgba(15,23,42,.12);padding: 24px;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: flex;align-items: center;gap: 11px"><span style="display: grid;place-items: center;height: 24px;width: 24px;border-radius: 999px;border: 1.5px solid #52525b;color: #3f3f46;flex: none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font: 600 11.5px 'IBM Plex Mono',monospace;letter-spacing: .1em;text-transform: uppercase;color: #18181b">No survivorship bias</span></div>
      <p style="color: #6b7280;font-size: 13.5px;line-height: 1.6;margin: 14px 0 0">Selezione dell'universo <b style="color: #3f3f46">point-in-time e strutturale</b> — per liquidità, non per rendimento passato. Nessun titolo entra nel test perché «sarebbe andato bene».</p>
    </div>
    <div data-reveal data-reveal-d="90" style="background: #fff;border: 1px solid rgba(15,23,42,.06);border-radius: 14px;box-shadow: 0 8px 24px -12px rgba(15,23,42,.12);padding: 24px;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: flex;align-items: center;gap: 11px"><span style="display: grid;place-items: center;height: 24px;width: 24px;border-radius: 999px;border: 1.5px solid #52525b;color: #3f3f46;flex: none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font: 600 11.5px 'IBM Plex Mono',monospace;letter-spacing: .1em;text-transform: uppercase;color: #18181b">Validazione walk-forward</span></div>
      <p style="color: #6b7280;font-size: 13.5px;line-height: 1.6;margin: 14px 0 0">Train e test <b style="color: #3f3f46">rullati fuori campione</b>, parametri fissi tra i fold, zero look-ahead. I numeri belli del backtest restano ipotesi finché non passano l'out-of-sample.</p>
    </div>
    <div data-reveal data-reveal-d="180" style="background: #fff;border: 1px solid rgba(15,23,42,.06);border-radius: 14px;box-shadow: 0 8px 24px -12px rgba(15,23,42,.12);padding: 24px;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: flex;align-items: center;gap: 11px"><span style="display: grid;place-items: center;height: 24px;width: 24px;border-radius: 999px;border: 1.5px solid #52525b;color: #3f3f46;flex: none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font: 600 11.5px 'IBM Plex Mono',monospace;letter-spacing: .1em;text-transform: uppercase;color: #18181b">Kill-switch &amp; audit</span></div>
      <p style="color: #6b7280;font-size: 13.5px;line-height: 1.6;margin: 14px 0 0">Ogni intervento di rischio è <b style="color: #3f3f46">tracciato e riproducibile</b>. Se qualcosa di sistemico si rompe, il sistema riduce o si ferma da solo — non dipende dalla discrezione.</p>
    </div>
  </div>
  <div data-reveal style="margin-top: 18px;border-radius: 14px;background: #0e0e10;padding: 18px 22px;display: flex;flex-wrap: wrap;align-items: center;gap: 10px 26px;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s ease">
    <span style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .16em;text-transform: uppercase;color: #71717a">Principi di misura</span>
    <span style="font: 400 12px 'IBM Plex Mono',monospace;color: #a1a1aa">· alpha al netto dei fattori</span>
    <span style="font: 400 12px 'IBM Plex Mono',monospace;color: #a1a1aa">· Sharpe su periodi multipli</span>
    <span style="font: 400 12px 'IBM Plex Mono',monospace;color: #a1a1aa">· stress test 2008 / 2020 / 2022</span>
    <span style="font: 400 12px 'IBM Plex Mono',monospace;color: #a1a1aa">· costi realistici inclusi</span>
    <span style="font: 400 12px 'IBM Plex Mono',monospace;color: #a1a1aa">· tutto riproducibile</span>
  </div>
</section>

<!-- BRIDGE TO FUND -->
<section style="max-width: 1152px;margin: 0 auto;padding: 56px 32px 72px">
  <div data-reveal style="border-radius: 24px;background: linear-gradient(135deg,#18181b 0%,#000000 48%,#3f3f46 100%);padding: 44px;display: grid;grid-template-columns: 1.2fr .8fr;gap: 32px;align-items: center;box-shadow: 0 30px 70px -30px rgba(79,70,229,.55);opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
    <div>
      <span style="display: inline-flex;align-items: center;gap: 6px;border-radius: 999px;padding: 5px 12px;font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .16em;text-transform: uppercase;white-space: nowrap;background: rgba(255,255,255,.16);color: #fff">Dal motore al fondo</span>
      <h2 style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 28px;line-height: 1.12;margin: 16px 0 0;color: #fff">Questo motore non è fine a se stesso</h2>
      <p style="color: rgba(255,255,255,.85);font-size: 15px;line-height: 1.6;margin: 12px 0 0;max-width: 52ch">La stessa disciplina che valida le strategie alimenta un fondo collettivo, costruito scovando talenti in una community aperta a chiunque.</p>
    </div>
    <div style="display: flex;flex-direction: column;gap: 12px">
      <a href="/obiettivo-fondo" style="display: flex;align-items: center;gap: 13px;padding: 14px 16px;border-radius: 14px;background: #fff;text-align: left">
        <span style="flex: none;display: grid;place-items: center;height: 40px;width: 40px;border-radius: 11px;background: #EEEDFB;color: #5B57D9"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4"></path><path d="M4 4h13l-2.5 4L17 12H4"></path></svg></span>
        <span style="flex: 1;min-width: 0;display: flex;flex-direction: column;gap: 2px"><span style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 15px;color: #18181b">Scopri il nostro futuro</span><span style="font-size: 12.5px;color: #6b7280;line-height: 1.3">L'obiettivo: il Fondo collettivo</span></span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#18181b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex: none"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
      </a>
      <a href="/motore-mappa" style="display: flex;align-items: center;gap: 13px;padding: 14px 16px;border-radius: 14px;background: #fff;text-align: left">
        <span style="flex: none;display: grid;place-items: center;height: 40px;width: 40px;border-radius: 11px;background: #E4F5F2;color: #0E9384"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2.5"></circle><circle cx="18" cy="5" r="2.5"></circle><path d="M8.5 18.5A6 6 0 0 0 15.5 6.5"></path></svg></span>
        <span style="flex: 1;min-width: 0;display: flex;flex-direction: column;gap: 2px"><span style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 15px;color: #18181b">Scopri il nostro processo, nodo per nodo</span><span style="font-size: 12.5px;color: #6b7280;line-height: 1.3">La mappa interattiva del motore</span></span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex: none"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
      </a>
      <a href="/" style="display: inline-flex;align-items: center;justify-content: center;gap: 7px;margin-top: 2px;color: rgba(255,255,255,.9);font-weight: 700;font-size: 13px">← Torna alla landing</a>
    </div>
  </div>
</section>

</div>
`;
