export const css = `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#f3f3f4;color:#18181b;font-family:Mulish,ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:#5B57D9;text-decoration:none}
a:hover{color:#4744C4}
::selection{background:rgba(20,184,166,.22)}
@keyframes qsUp{0%{opacity:0;transform:translateY(24px)}100%{opacity:1;transform:none}}
@keyframes qsGrow{0%{height:0}100%{height:var(--h)}}
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
    <span style="margin-left: 14px;font: 600 12px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #a1a1aa">/ obiettivo</span>
    <div style="margin-left: auto;display: flex;align-items: center;gap: 14px">
      <a href="/" style="font-size: 13.5px;font-weight: 600;color: #3f3f46">← Landing</a>
      <a href="/ecosistema" style="font-size: 13.5px;font-weight: 600;color: #3f3f46">Il motore</a>
      <a href="/" style="display: inline-flex;align-items: center;height: 38px;padding: 0 18px;border-radius: 999px;white-space: nowrap;font: 700 13.5px Mulish,sans-serif;color: #fff;background: #18181b">Entra nella beta</a>
    </div>
  </div>
</header>

<!-- HERO -->
<section style="position: relative;max-width: 1024px;margin: 0 auto;padding: 132px 32px 72px;text-align: center;min-height: 520px">
  <div style="position: absolute;top: 0;bottom: 0;left: calc(50% - 50vw);width: 100vw;z-index: 0;overflow: hidden;pointer-events: none">
    <canvas data-neural style="display: block;width: 100%;height: 100%"></canvas>
    <div style="position: absolute;inset: 0;background: linear-gradient(180deg,rgba(243,243,244,0) 50%,rgba(243,243,244,.92) 100%)"></div>
  </div>
  <div style="position: relative;z-index: 1;animation: qsUp .7s both">
    <span style="display: inline-flex;align-items: center;gap: 6px;border-radius: 999px;padding: 5px 12px;font: 600 11.5px/1 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;white-space: nowrap;background: #18181b;color: #B9B7F4">L'obiettivo finale</span>
    <h1 style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 46px;line-height: 1.08;letter-spacing: -.02em;margin: 20px auto 0;color: #18181b;max-width: 20ch">Non solo una piattaforma. Un fondo, costruito <span style="background: linear-gradient(100deg,#18181b,#3f3f46 45%,#3f3f46);-webkit-background-clip: text;background-clip: text;color: transparent">insieme</span>.</h1>
    <p style="color: #52525b;font-size: 16.5px;line-height: 1.65;margin: 24px auto 0;max-width: 640px">Lyra non nasce per essere «l'ennesima piattaforma di trading». Nasce per <b style="color: #18181b;font-weight: 600">costruire un fondo d'investimento scovando talenti in una community aperta a chiunque</b> — e per dare a tutti la possibilità di accedere, un giorno, a quel fondo.</p>
    <div style="display: flex;flex-wrap: wrap;align-items: center;justify-content: center;gap: 10px;margin-top: 26px">
      <span style="padding: 8px 14px;border-radius: 999px;background: #fff;border: 1px solid rgba(15,23,42,.08);font: 600 12.5px Mulish,sans-serif;color: #3f3f46">Aperto a chiunque</span>
      <span style="padding: 8px 14px;border-radius: 999px;background: #fff;border: 1px solid rgba(15,23,42,.08);font: 600 12.5px Mulish,sans-serif;color: #3f3f46">Selezione per merito</span>
      <span style="padding: 8px 14px;border-radius: 999px;background: #fff;border: 1px solid rgba(15,23,42,.08);font: 600 12.5px Mulish,sans-serif;color: #3f3f46">Revenue share</span>
    </div>
  </div>
</section>

<!-- THESIS -->
<section style="max-width: 1152px;margin: 0 auto;padding: 24px 32px 24px">
  <div data-reveal style="border-radius: 24px;background: #0e0e10;padding: 48px;text-align: center;opacity: 0;transform: translateY(24px);transition: opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1);position: relative;overflow: hidden">
    <div style="position: absolute;inset: 0;background-image: linear-gradient(rgba(150,180,190,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(150,180,190,.08) 1px,transparent 1px);background-size: 44px 44px;-webkit-mask-image: radial-gradient(120% 100% at 50% 0,#000 40%,transparent 82%);mask-image: radial-gradient(120% 100% at 50% 0,#000 40%,transparent 82%);opacity: .6;pointer-events: none"></div>
    <div style="position: relative">
      <h2 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 32px;line-height: 1.2;margin: 0;color: #E9EFF1;max-width: 22ch;margin-left: auto;margin-right: auto">Il talento nel trading è <span style="color: #71717a">ovunque</span>. L'accesso al capitale, <span style="color: #a1a1aa">no</span>.</h2>
      <p style="color: #a1a1aa;font-size: 15px;line-height: 1.65;margin: 18px auto 0;max-width: 640px">Migliaia di persone hanno intuizioni valide ma restano invisibili: nessuno le verifica, nessuno alloca capitale sul merito. I fondi tradizionali selezionano per pedigree e network, dietro porte chiuse. Noi vogliamo ribaltarlo.</p>
    </div>
  </div>
</section>

<!-- DAL TALENTO AL FONDO -->
<section style="max-width: 1152px;margin: 0 auto;padding: 64px 32px 24px">
  <div data-reveal style="text-align: center;max-width: 640px;margin: 0 auto 44px;opacity: 0;transform: translateY(24px);transition: opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)">
    <span style="display: inline-flex;align-items: center;gap: 6px;border-radius: 999px;padding: 5px 12px;font: 600 11.5px/1 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;white-space: nowrap;background: #EEEDFB;color: #5B57D9">Il meccanismo</span>
    <h2 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 32px;line-height: 1.14;letter-spacing: -.01em;margin: 14px 0 0;color: #18181b">Dal talento al <span style="background: linear-gradient(100deg,#18181b,#5B57D9);-webkit-background-clip: text;background-clip: text;color: transparent">fondo collettivo</span></h2>
    <p style="color: #6b7280;font-size: 15px;line-height: 1.6;margin: 14px 0 0">Un percorso in cui a contare sono i risultati verificati, non le conoscenze giuste.</p>
  </div>

  <div style="position: relative;display: grid;grid-template-columns: repeat(5,1fr);gap: 14px">
    <div style="position: absolute;left: 8%;right: 8%;top: 33px;height: 2px;background: linear-gradient(90deg,#18181b,#3f3f46 50%,#52525b);z-index: 0;opacity: .35"></div>
    <div data-reveal data-reveal-d="0" style="position: relative;z-index: 1;text-align: center;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: grid;place-items: center;height: 66px;width: 66px;border-radius: 999px;margin: 0 auto;background: #fff;border: 1px solid rgba(15,23,42,.08);box-shadow: 0 10px 24px -12px rgba(15,23,42,.2);color: #18181b"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <p style="font: 600 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;margin: 14px 0 0">01</p>
      <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;margin: 5px 0 0;color: #18181b">Community aperta</h3>
      <p style="color: #6b7280;font-size: 12.5px;line-height: 1.5;margin: 7px 0 0">Chiunque entra: nessun pedigree, solo voglia di costruire.</p>
    </div>
    <div data-reveal data-reveal-d="90" style="position: relative;z-index: 1;text-align: center;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: grid;place-items: center;height: 66px;width: 66px;border-radius: 999px;margin: 0 auto;background: #fff;border: 1px solid rgba(15,23,42,.08);box-shadow: 0 10px 24px -12px rgba(15,23,42,.2);color: #3f3f46"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg></div>
      <p style="font: 600 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;margin: 14px 0 0">02</p>
      <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;margin: 5px 0 0;color: #18181b">Costruisci &amp; valida</h3>
      <p style="color: #6b7280;font-size: 12.5px;line-height: 1.5;margin: 7px 0 0">Trasformi le idee in strategie e le dimostri con test onesti.</p>
    </div>
    <div data-reveal data-reveal-d="180" style="position: relative;z-index: 1;text-align: center;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: grid;place-items: center;height: 66px;width: 66px;border-radius: 999px;margin: 0 auto;background: #fff;border: 1px solid rgba(15,23,42,.08);box-shadow: 0 10px 24px -12px rgba(15,23,42,.2);color: #C68A22"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
      <p style="font: 600 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;margin: 14px 0 0">03</p>
      <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;margin: 5px 0 0;color: #18181b">Contest &amp; verifica</h3>
      <p style="color: #6b7280;font-size: 12.5px;line-height: 1.5;margin: 7px 0 0">Le migliori emergono nei contest e passano la verifica interna.</p>
    </div>
    <div data-reveal data-reveal-d="270" style="position: relative;z-index: 1;text-align: center;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: grid;place-items: center;height: 66px;width: 66px;border-radius: 999px;margin: 0 auto;background: #fff;border: 1px solid rgba(15,23,42,.08);box-shadow: 0 10px 24px -12px rgba(15,23,42,.2);color: #18181b"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
      <p style="font: 600 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;margin: 14px 0 0">04</p>
      <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;margin: 5px 0 0;color: #18181b">Selezione per merito</h3>
      <p style="color: #6b7280;font-size: 12.5px;line-height: 1.5;margin: 7px 0 0">Contano i risultati verificati, non chi conosci.</p>
    </div>
    <div data-reveal data-reveal-d="360" style="position: relative;z-index: 1;text-align: center;opacity: 0;transform: translateY(20px);transition: opacity .6s ease,transform .6s ease">
      <div style="display: grid;place-items: center;height: 66px;width: 66px;border-radius: 999px;margin: 0 auto;background: linear-gradient(135deg,#5B57D9,#18181b);box-shadow: 0 12px 26px -10px rgba(79,70,229,.55);color: #fff"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg></div>
      <p style="font: 600 10.5px 'IBM Plex Mono',monospace;color: #18181b;margin: 14px 0 0">05</p>
      <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 15.5px;margin: 5px 0 0;color: #18181b">Fondo &amp; revenue share</h3>
      <p style="color: #6b7280;font-size: 12.5px;line-height: 1.5;margin: 7px 0 0">Il capitale alloca alle migliori; i rendimenti tornano a chi le ha create.</p>
    </div>
  </div>
  <p data-reveal style="text-align: center;font: 500 12px 'IBM Plex Mono',monospace;color: #a1a1aa;margin: 34px 0 0;opacity: 0;transform: translateY(14px);transition: opacity .6s ease,transform .6s ease">L'accesso al fondo è soggetto a verifica e ai requisiti previsti dalla normativa applicabile.</p>
</section>

<!-- APERTO A CHIUNQUE -->
<section style="background: linear-gradient(180deg,#f3f3f4,#EAEEF7 30%,#EAEEF7 70%,#f3f3f4);padding: 72px 0;margin-top: 44px">
  <div style="max-width: 1152px;margin: 0 auto;padding: 0 32px">
    <div data-reveal style="text-align: center;max-width: 600px;margin: 0 auto 40px;opacity: 0;transform: translateY(24px);transition: opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)">
      <span style="display: inline-flex;align-items: center;gap: 6px;border-radius: 999px;padding: 5px 12px;font: 600 11.5px/1 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;white-space: nowrap;background: #E4F5F2;color: #0E9384">Aperto a chiunque</span>
      <h2 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 32px;line-height: 1.14;letter-spacing: -.01em;margin: 14px 0 0;color: #18181b">Tre modi per <span style="background: linear-gradient(100deg,#18181b,#5B57D9);-webkit-background-clip: text;background-clip: text;color: transparent">farne parte</span></h2>
    </div>
    <div style="display: grid;grid-template-columns: repeat(3,1fr);gap: 16px">
      <div data-reveal data-reveal-d="0" style="background: #fff;border: 1px solid rgba(15,23,42,.06);border-radius: 18px;box-shadow: 0 10px 30px -16px rgba(15,23,42,.2);padding: 28px;opacity: 0;transform: translateY(24px);transition: opacity .6s ease,transform .6s ease">
        <div style="display: grid;place-items: center;height: 48px;width: 48px;border-radius: 14px;background: #f4f4f5;color: #18181b"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg></div>
        <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 19px;margin: 16px 0 0;color: #18181b">Come builder</h3>
        <p style="color: #6b7280;font-size: 14px;line-height: 1.6;margin: 9px 0 0">Costruisci strategie, superane la verifica, punta all'allocazione. Il tuo edge diventa reddito, con revenue share.</p>
      </div>
      <div data-reveal data-reveal-d="90" style="background: #fff;border: 1px solid rgba(15,23,42,.06);border-radius: 18px;box-shadow: 0 10px 30px -16px rgba(15,23,42,.2);padding: 28px;opacity: 0;transform: translateY(24px);transition: opacity .6s ease,transform .6s ease">
        <div style="display: grid;place-items: center;height: 48px;width: 48px;border-radius: 14px;background: #f4f4f5;color: #3f3f46"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg></div>
        <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 19px;margin: 16px 0 0;color: #18181b">Per accedere al fondo</h3>
        <p style="color: #6b7280;font-size: 14px;line-height: 1.6;margin: 9px 0 0">Non devi saper tradare: l'obiettivo è aprire a tutti la partecipazione al fondo collettivo alimentato dai talenti della community.</p>
      </div>
      <div data-reveal data-reveal-d="180" style="background: #fff;border: 1px solid rgba(15,23,42,.06);border-radius: 18px;box-shadow: 0 10px 30px -16px rgba(15,23,42,.2);padding: 28px;opacity: 0;transform: translateY(24px);transition: opacity .6s ease,transform .6s ease">
        <div style="display: grid;place-items: center;height: 48px;width: 48px;border-radius: 14px;background: #f4f4f5;color: #18181b"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 19px;margin: 16px 0 0;color: #18181b">Come community</h3>
        <p style="color: #6b7280;font-size: 14px;line-height: 1.6;margin: 9px 0 0">Impara, confrontati, cresci. Ogni backtest condiviso e ogni discussione alzano il livello di tutti.</p>
      </div>
    </div>
  </div>
</section>

<!-- COMPARE -->
<section style="max-width: 1152px;margin: 0 auto;padding: 72px 32px 24px">
  <div data-reveal style="text-align: center;max-width: 600px;margin: 0 auto 40px;opacity: 0;transform: translateY(24px);transition: opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)">
    <span style="display: inline-flex;align-items: center;gap: 6px;border-radius: 999px;padding: 5px 12px;font: 600 11.5px/1 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;white-space: nowrap;background: #FBF3E0;color: #C68A22">Il ribaltamento</span>
    <h2 style="font-family: 'Space Grotesk',sans-serif;font-weight: 600;font-size: 32px;line-height: 1.14;letter-spacing: -.01em;margin: 14px 0 0;color: #18181b">Un fondo, ma <span style="background: linear-gradient(100deg,#18181b,#5B57D9);-webkit-background-clip: text;background-clip: text;color: transparent">al contrario</span></h2>
  </div>
  <div style="display: grid;grid-template-columns: 1fr 1fr;gap: 18px">
    <div data-reveal data-reveal-dir="left" style="background: #fff;border: 1px solid rgba(15,23,42,.06);border-radius: 18px;padding: 28px;opacity: 0;transform: translateX(-40px);transition: opacity .6s ease,transform .6s ease">
      <p style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #a1a1aa;margin: 0">Fondo tradizionale</p>
      <div style="display: flex;flex-direction: column;gap: 14px;margin-top: 18px">
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: #FEF2F2;color: #E11D48;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span><p style="margin: 0;color: #6b7280;font-size: 14px;line-height: 1.5">Chiuso a pochi, dietro porte inaccessibili.</p></div>
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: #FEF2F2;color: #E11D48;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span><p style="margin: 0;color: #6b7280;font-size: 14px;line-height: 1.5">Seleziona per pedigree, titoli e network.</p></div>
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: #FEF2F2;color: #E11D48;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span><p style="margin: 0;color: #6b7280;font-size: 14px;line-height: 1.5">Processo opaco: fidati e basta.</p></div>
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: #FEF2F2;color: #E11D48;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span><p style="margin: 0;color: #6b7280;font-size: 14px;line-height: 1.5">Accesso riservato ai grandi patrimoni.</p></div>
      </div>
    </div>
    <div data-reveal data-reveal-dir="right" data-reveal-d="80" style="background: linear-gradient(160deg,#18181b,#132132);border: 1px solid rgba(70,214,192,.25);border-radius: 18px;padding: 28px;opacity: 0;transform: translateX(40px);transition: opacity .6s ease,transform .6s ease">
      <p style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #d4d4d8;margin: 0">Lyra</p>
      <div style="display: flex;flex-direction: column;gap: 14px;margin-top: 18px">
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: rgba(70,214,192,.16);color: #a1a1aa;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><p style="margin: 0;color: #d4d4d8;font-size: 14px;line-height: 1.5">Aperto a chiunque voglia costruire.</p></div>
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: rgba(70,214,192,.16);color: #a1a1aa;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><p style="margin: 0;color: #d4d4d8;font-size: 14px;line-height: 1.5">Seleziona per risultati verificati.</p></div>
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: rgba(70,214,192,.16);color: #a1a1aa;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><p style="margin: 0;color: #d4d4d8;font-size: 14px;line-height: 1.5">Codice e backtest trasparenti, sempre.</p></div>
        <div style="display: flex;gap: 11px;align-items: flex-start"><span style="display: grid;place-items: center;height: 22px;width: 22px;border-radius: 999px;flex: none;background: rgba(70,214,192,.16);color: #a1a1aa;margin-top: 1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><p style="margin: 0;color: #d4d4d8;font-size: 14px;line-height: 1.5">Pensato per aprirsi alla community.</p></div>
      </div>
    </div>
  </div>
</section>

<!-- CTA + FOOTER -->
<section style="max-width: 1152px;margin: 0 auto;padding: 64px 32px 64px">
  <div data-reveal style="position: relative;overflow: hidden;border-radius: 28px;background: linear-gradient(135deg,#18181b 0%,#000000 48%,#3f3f46 100%);text-align: center;padding: 60px 24px;box-shadow: 0 30px 70px -30px rgba(79,70,229,.6);opacity: 0;transform: translateY(24px);transition: opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)">
    <div style="position: absolute;inset: 0;background-image: radial-gradient(rgba(255,255,255,.1) 1px,transparent 1px);background-size: 22px 22px;-webkit-mask-image: radial-gradient(120% 100% at 50% 0,#000,transparent 75%);mask-image: radial-gradient(120% 100% at 50% 0,#000,transparent 75%);pointer-events: none"></div>
    <div style="position: relative">
      <h2 style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 32px;line-height: 1.12;margin: 0;color: #fff;max-width: 600px;margin-left: auto;margin-right: auto">Costruiamo il fondo. Insieme.</h2>
      <p style="color: rgba(255,255,255,.85);font-size: 15.5px;margin: 14px auto 0;max-width: 520px;line-height: 1.6">Entra nella beta e inizia a costruire. I talenti che troviamo oggi sono il fondo di domani.</p>
      <div style="display: flex;flex-wrap: wrap;align-items: center;justify-content: center;gap: 12px;margin-top: 28px">
        <a href="/" style="display: inline-flex;align-items: center;gap: 8px;height: 48px;padding: 0 26px;border-radius: 12px;white-space: nowrap;font: 700 15px Mulish,sans-serif;color: #000000;background: #fff">Entra nella beta <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
        <a href="/ecosistema" style="display: inline-flex;align-items: center;gap: 8px;height: 48px;padding: 0 22px;border-radius: 12px;white-space: nowrap;font: 700 15px Mulish,sans-serif;color: #fff;background: rgba(255,255,255,.16)">Vedi il motore</a>
      </div>
    </div>
  </div>
  <p style="text-align: center;font-size: 11.5px;line-height: 1.6;color: #a1a1aa;margin: 28px auto 0;max-width: 820px">Il trading comporta rischi di perdita del capitale. Nulla in questa pagina costituisce consulenza finanziaria o sollecitazione all'investimento. L'eventuale fondo collettivo e l'accesso ad esso sono soggetti a verifica e ai requisiti previsti dalla normativa applicabile. I rendimenti passati non garantiscono risultati futuri.</p>
</section>

</div>
`;
