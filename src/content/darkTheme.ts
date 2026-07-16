// TEMA SCURO — mappa generata dai colori inline realmente usati nelle pagine
// (sfondi -> superfici scure, testi -> chiari, bordi tenui; accenti preservati).
export const DARK_CSS = `\n/* ===== TEMA SCURO (mappa completa dei colori inline realmente usati) ===== */
body[data-theme="dark"]{background:#0e0e10;color:#ededf0}
[data-theme="dark"]{color:#ededf0}
[data-theme="dark"] [data-nav]{background:rgba(14,14,16,.85)!important;box-shadow:0 10px 30px -12px rgba(0,0,0,.6)!important;border-color:rgba(255,255,255,.06)!important}
[data-theme="dark"] [data-lightglow]{background:radial-gradient(closest-side,rgba(10,10,14,.94),rgba(10,10,14,.6) 60%,transparent)!important}
[data-theme="dark"] [data-statbar]{background:rgba(20,20,24,.72)!important;border-color:rgba(255,255,255,.08)!important}
[data-theme="dark"] [data-btn-light]{background:#ededf0!important;color:#131316!important}
[data-theme="dark"] input,[data-theme="dark"] textarea,[data-theme="dark"] select{background:#161618!important;color:#ededf0!important;border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] input::placeholder,[data-theme="dark"] textarea::placeholder{color:#8a8a92!important}
[data-theme="dark"] hr{border-color:rgba(255,255,255,.1)!important}
[data-theme="dark"] [style*="background: #0e0e10"]{background:#0e0e10!important}
[data-theme="dark"] [style*="background: #131316"]{background:#242428!important}
[data-theme="dark"] [style*="background: #141416"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: #161618"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: #18181b"]{background:#26262b!important}
[data-theme="dark"] [style*="background: #1c1c1f"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: #22C55E"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #27272a"]{background:#2c2c31!important}
[data-theme="dark"] [style*="background: #34d399"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #39445C"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: #3f3f46"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: #52525b"]{background:#3f3f46!important}
[data-theme="dark"] [style*="background: #71717a"]{background:#3f3f46!important}
[data-theme="dark"] [style*="background: #AEB7C8"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #E0A83A"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #E4F5F2"]{background:rgba(14,147,132,.18)!important}
[data-theme="dark"] [style*="background: #EAF0FE"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: #EAFBF4"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: #EBB146"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #EEEDFB"]{background:rgba(91,87,217,.18)!important}
[data-theme="dark"] [style*="background: #F4F6FA"]{background:#161618!important}
[data-theme="dark"] [style*="background: #F59E0B"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #FBF3E0"]{background:rgba(198,138,34,.18)!important}
[data-theme="dark"] [style*="background: #FDEDF0"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: #FEF2F2"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: #a1a1aa"]{background:#3f3f46!important}
[data-theme="dark"] [style*="background: #d4d4d8"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: #e4e4e7"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: #f0fdf4"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: #f3f3f4"]{background:#111113!important}
[data-theme="dark"] [style*="background: #f4f4f5"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #fafafa"]{background:#161618!important}
[data-theme="dark"] [style*="background: #fbbf24"]{background:#17171a!important}
[data-theme="dark"] [style*="background: #fff"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(113, 113, 122)"]{background:#3f3f46!important}
[data-theme="dark"] [style*="background: rgb(14, 14, 16)"]{background:#0e0e10!important}
[data-theme="dark"] [style*="background: rgb(15, 23, 42)"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: rgb(161, 161, 170)"]{background:#3f3f46!important}
[data-theme="dark"] [style*="background: rgb(174, 183, 200)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(19, 19, 22)"]{background:#242428!important}
[data-theme="dark"] [style*="background: rgb(20, 20, 22)"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: rgb(212, 212, 216)"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: rgb(22, 22, 24)"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: rgb(224, 168, 58)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(228, 228, 231)"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: rgb(228, 245, 242)"]{background:rgba(14,147,132,.18)!important}
[data-theme="dark"] [style*="background: rgb(234, 240, 254)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(234, 251, 244)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(235, 177, 70)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(236, 253, 246)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(238, 237, 251)"]{background:rgba(91,87,217,.18)!important}
[data-theme="dark"] [style*="background: rgb(238, 241, 248)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(238, 241, 255)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(238, 242, 248)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(24, 24, 27)"]{background:#26262b!important}
[data-theme="dark"] [style*="background: rgb(240, 253, 244)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(241, 244, 249)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(243, 243, 244)"]{background:#111113!important}
[data-theme="dark"] [style*="background: rgb(244, 244, 245)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(244, 246, 250)"]{background:#161618!important}
[data-theme="dark"] [style*="background: rgb(245, 158, 11)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(245, 247, 251)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(247, 249, 252)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(250, 250, 250)"]{background:#161618!important}
[data-theme="dark"] [style*="background: rgb(251, 191, 36)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(251, 243, 224)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(253, 237, 240)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(254, 242, 242)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(255, 255, 255)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(28, 28, 31)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(34, 197, 94)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(39, 39, 42)"]{background:#2c2c31!important}
[data-theme="dark"] [style*="background: rgb(52, 211, 153)"]{background:#17171a!important}
[data-theme="dark"] [style*="background: rgb(57, 68, 92)"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: rgb(63, 63, 70)"]{background:#2a2a2e!important}
[data-theme="dark"] [style*="background: rgb(82, 82, 91)"]{background:#3f3f46!important}
[data-theme="dark"] [style*="background: rgba(15, 23, 42, 0.08)"]{background:rgba(255,255,255,.10)!important}
[data-theme="dark"] [style*="background: rgba(15, 23, 42, 0.1)"]{background:rgba(255,255,255,.10)!important}
[data-theme="dark"] [style*="background: rgba(15,23,42,.08)"]{background:rgba(255,255,255,.10)!important}
[data-theme="dark"] [style*="background: rgba(15,23,42,.1)"]{background:rgba(255,255,255,.10)!important}
[data-theme="dark"] [style*="background: rgba(24,24,27,.12)"]{background:rgba(255,255,255,.10)!important}
[data-theme="dark"] [style*="background: rgba(24,24,27,.14)"]{background:rgba(255,255,255,.10)!important}
[data-theme="dark"] [style*="color: #000000"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: #0e0e10"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: #131316"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: #18181b"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: #27272a"]{color:#d4d4d8!important}
[data-theme="dark"] [style*="color: #3E63DD"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: #3f3f46"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: #52525b"]{color:#bcbcc2!important}
[data-theme="dark"] [style*="color: #6b7280"]{color:#a1a1aa!important}
[data-theme="dark"] [style*="color: #71717a"]{color:#a6a6ad!important}
[data-theme="dark"] [style*="color: #8B5CF6"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: #B4552D"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(0, 0, 0)"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: rgb(100, 116, 139)"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(107, 114, 128)"]{color:#a1a1aa!important}
[data-theme="dark"] [style*="color: rgb(113, 113, 122)"]{color:#a6a6ad!important}
[data-theme="dark"] [style*="color: rgb(139, 92, 246)"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(14, 14, 16)"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: rgb(15, 23, 42)"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: rgb(180, 85, 45)"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(19, 19, 22)"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: rgb(24, 24, 27)"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: rgb(30, 41, 59)"]{color:#ededf0!important}
[data-theme="dark"] [style*="color: rgb(39, 39, 42)"]{color:#d4d4d8!important}
[data-theme="dark"] [style*="color: rgb(51, 65, 85)"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(62, 99, 221)"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(63, 63, 70)"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(71, 85, 105)"]{color:#c7c7cc!important}
[data-theme="dark"] [style*="color: rgb(82, 82, 91)"]{color:#bcbcc2!important}
[data-theme="dark"] [style*="solid #131316"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid #52525b"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid #8B5CF6"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgb(139, 92, 246)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgb(19, 19, 22)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgb(82, 82, 91)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.05)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.06)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.07)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.1)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.12)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.14)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.16)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.05)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.06)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.07)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.08)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.1)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.12)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.13)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.14)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15,23,42,.16)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(24,24,27,.05)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(24,24,27,.06)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(24,24,27,.07)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(24,24,27,.08)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(24,24,27,.14)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(24,24,27,.25)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(63,63,70,.22)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(63,63,70,.25)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(79,70,229,.3)"]{border-color:rgba(255,255,255,.14)!important}
/* gradienti clippati sul testo: la meta\x27 scura diventa chiara nel tema scuro */\n[data-theme="dark"] [style*="linear-gradient(100deg,#18181b,#5B57D9)"]{background-image:linear-gradient(100deg,#f4f4f5,#8b87ff)!important}\n[data-theme="dark"] [style*="linear-gradient(90deg,#18181b,#52525b)"]{background-image:linear-gradient(90deg,#f4f4f5,#c7c7cc)!important}\n[data-theme="dark"] [style*="linear-gradient(100deg,#71717a,#a1a1aa)"]{background-image:linear-gradient(100deg,#c7c7cc,#ededf0)!important}\n`;
