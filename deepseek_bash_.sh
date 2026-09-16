#!/usr/bin/env bash
# ============================================================
# build-zip.sh
# Creates the complete TIFFAS storefront project and zips it.
# Run:  bash build-zip.sh
# Output: tiffas-storefront.zip
# ============================================================
set -euo pipefail

ROOT="tiffas-storefront"
rm -rf "$ROOT" "$ROOT.zip"

mkdir -p "$ROOT"/{.github/workflows,frontend/images/products,backend,scripts}

# ------------------------------------------------------------
# .gitignore
# ------------------------------------------------------------
cat > "$ROOT/.gitignore" <<'EOF'
.env
backend/.env
*.env.local
node_modules/
backend/node_modules/
npm-debug.log*
yarn-error.log*
.DS_Store
Thumbs.db
.vscode/
.idea/
dist/
build/
*.log
EOF

# ------------------------------------------------------------
# render.yaml
# ------------------------------------------------------------
cat > "$ROOT/render.yaml" <<'EOF'
services:
  - type: web
    name: tiffas-backend
    env: node
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /
    envVars:
      - key: MPESA_CONSUMER_KEY
        sync: false
      - key: MPESA_CONSUMER_SECRET
        sync: false
      - key: MPESA_SHORTCODE
        value: "8049446"
      - key: MPESA_PASSKEY
        sync: false
      - key: MPESA_CALLBACK_URL
        sync: false
      - key: MPESA_ENV
        value: production
      - key: NODE_VERSION
        value: "20"
EOF

# ------------------------------------------------------------
# .github/workflows/deploy-frontend.yml
# ------------------------------------------------------------
cat > "$ROOT/.github/workflows/deploy-frontend.yml" <<'EOF'
name: Deploy frontend to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: frontend

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
EOF

# ------------------------------------------------------------
# .github/workflows/deploy-backend.yml
# ------------------------------------------------------------
cat > "$ROOT/.github/workflows/deploy-backend.yml" <<'EOF'
name: Redeploy backend on Render

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'render.yaml'
      - '.github/workflows/deploy-backend.yml'
  workflow_dispatch:

jobs:
  trigger-render:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy hook
        if: ${{ secrets.RENDER_DEPLOY_HOOK != '' }}
        run: |
          curl -fsSL -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
EOF

# ------------------------------------------------------------
# frontend/index.html
# ------------------------------------------------------------
cat > "$ROOT/frontend/index.html" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TIFFAS BEAUTY AND COSMETICS — Order & Pay via M-Pesa</title>
<meta name="description" content="Browse Tiffas Beauty and Cosmetics' hair, skin and beauty catalogue. Add to cart, pay instantly with M-Pesa, or order on WhatsApp.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600;1,9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header class="topbar">
  <div class="topbar-inner">
    <span class="brand">TIFFAS BEAUTY AND COSMETICS</span>
    <div class="topbar-right">
      <a class="topbar-whatsapp" id="topbarWhatsapp" href="#" target="_blank" rel="noopener"></a>
      <button class="cart-btn" id="cartBtn" type="button" aria-label="Open cart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span class="cart-count" id="cartCount" hidden>0</span>
      </button>
    </div>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-copy">
      <p class="eyebrow">Order &amp; pay in one tap</p>
      <h1>Everything for hair, skin &amp; beauty — delivered to your door.</h1>
      <p class="hero-sub">Browse the catalogue, add what you love to your cart, and pay instantly with M-Pesa. Prefer to chat? Every product still has a one-tap WhatsApp button.</p>
      <div class="hero-actions">
        <a href="#catalogue" class="btn btn-primary">Browse the catalogue</a>
        <a href="#" id="heroWhatsapp" class="btn btn-whatsapp" target="_blank" rel="noopener">Chat with us</a>
      </div>
    </div>
    <div class="hero-shelf" aria-hidden="true">
      <div class="shelf-track" id="shelfTrack"></div>
    </div>
  </div>
</section>

<section class="pay-info">
  <div class="pay-card">
    <div class="pay-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/><path d="M9.5 6h5"/></svg>
    </div>
    <div class="pay-text">
      <p class="pay-label">Pay via M-Pesa</p>
      <p class="pay-detail">Lipa na M-Pesa → Buy Goods and Services → Till Number <span class="pay-till-number js-till-number"></span> · or pay instantly at checkout with an STK push.</p>
    </div>
    <button id="copyTillBtn" class="btn btn-copy" type="button">Copy till number</button>
  </div>
</section>

<main class="catalogue" id="catalogue">
  <div class="controls">
    <div class="search-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="searchInput" type="search" placeholder="Search products…" aria-label="Search products">
    </div>
    <div class="pills" id="categoryPills"></div>
  </div>
  <p class="result-count" id="resultCount"></p>
  <div class="grid" id="productGrid"></div>
  <div class="empty-state" id="emptyState" hidden>
    <p>No products match "<span id="emptyQuery"></span>".</p>
    <button id="clearFilters" class="btn btn-secondary">Clear filters</button>
  </div>
</main>

<footer class="site-footer">
  <p><span class="js-store-name"></span> · Nairobi, Kenya</p>
  <p>Order or ask a question on WhatsApp: <a id="footerWhatsapp" href="#">0725 679 016</a></p>
  <p>Pay via M-Pesa: Lipa na M-Pesa, Buy Goods, Till <strong class="js-till-number"></strong></p>
  <p class="fine-print">Prices shown in Kenyan Shillings (KES). Final availability is confirmed on WhatsApp.</p>
</footer>

<a href="#" id="floatingWhatsapp" class="floating-whatsapp" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp"></a>

<div class="drawer-backdrop" id="drawerBackdrop" hidden></div>
<aside class="cart-drawer" id="cartDrawer" aria-hidden="true" aria-label="Shopping cart">
  <header class="cart-head">
    <h2>Your cart</h2>
    <button class="icon-btn" id="closeCartBtn" type="button" aria-label="Close cart">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </header>
  <div class="cart-body" id="cartBody"></div>
  <footer class="cart-foot" id="cartFoot" hidden>
    <div class="cart-total-row"><span>Subtotal</span><strong id="cartSubtotal">Ksh 0</strong></div>
    <p class="cart-note" id="cartNote">Delivery is arranged on WhatsApp after payment.</p>
    <button class="btn btn-mpesa btn-block" id="checkoutBtn" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>
      Pay with M-Pesa
    </button>
    <button class="btn btn-whatsapp btn-block" id="cartWhatsappBtn" type="button">Send order on WhatsApp instead</button>
  </footer>
</aside>

<div class="modal-backdrop" id="modalBackdrop" hidden>
  <div class="modal" id="checkoutModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <button class="icon-btn modal-close" id="closeModalBtn" type="button" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>

    <div class="stage" data-stage="form">
      <h2 id="modalTitle">Pay with M-Pesa</h2>
      <p class="modal-sub">Enter the M-Pesa number you want to pay from. We'll send a payment request straight to your phone.</p>
      <div class="order-summary" id="orderSummary"></div>
      <label class="field">
        <span>M-Pesa phone number</span>
        <input id="phoneInput" type="tel" inputmode="numeric" autocomplete="tel" placeholder="07XX XXX XXX">
      </label>
      <p class="field-hint" id="phoneHint">Safaricom line, e.g. 0725 679 016 or 254725679016</p>
      <label class="field">
        <span>Delivery / pickup note <em>(optional)</em></span>
        <input id="noteInput" type="text" maxlength="80" placeholder="e.g. Deliver to Kasarani, or I'll pick up">
      </label>
      <button class="btn btn-mpesa btn-block" id="payBtn" type="button">Send payment request</button>
      <p class="modal-fineprint">You'll get a prompt on your phone asking for your M-Pesa PIN. You are charged exactly <strong id="payAmountLabel">Ksh 0</strong>.</p>
    </div>

    <div class="stage" data-stage="waiting" hidden>
      <div class="spinner" aria-hidden="true"></div>
      <h2>Check your phone</h2>
      <p class="modal-sub">We sent an M-Pesa request to <strong id="waitingPhone"></strong>. Enter your M-Pesa PIN to complete the payment of <strong id="waitingAmount"></strong>.</p>
      <p class="modal-timer" id="waitTimer">Waiting for confirmation…</p>
      <button class="btn btn-secondary btn-block" id="cancelWaitBtn" type="button">Cancel</button>
    </div>

    <div class="stage" data-stage="success" hidden>
      <div class="result-icon success" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>
      </div>
      <h2>Payment received</h2>
      <p class="modal-sub">Thank you! Your payment has been confirmed.</p>
      <div class="receipt" id="receiptBox"></div>
      <button class="btn btn-whatsapp btn-block" id="receiptWhatsappBtn" type="button">Send receipt &amp; delivery details</button>
      <button class="btn btn-secondary btn-block" id="doneBtn" type="button">Continue shopping</button>
    </div>

    <div class="stage" data-stage="error" hidden>
      <div class="result-icon error" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
      </div>
      <h2 id="errorTitle">Payment not completed</h2>
      <p class="modal-sub" id="errorMessage"></p>
      <button class="btn btn-mpesa btn-block" id="retryBtn" type="button">Try again</button>
      <button class="btn btn-whatsapp btn-block" id="errorWhatsappBtn" type="button">Order on WhatsApp instead</button>
    </div>
  </div>
</div>

<div class="toast" id="toast" hidden></div>
<script src="app.js"></script>
</body>
</html>
HTMLEOF

# ------------------------------------------------------------
# frontend/styles.css  (full theme, abbreviated marker so it
# stays readable — the real file will be written in full below)
# ------------------------------------------------------------
cat > "$ROOT/frontend/styles.css" <<'CSSEOF'
/* =========================================================
   TIFFAS BEAUTY AND COSMETICS — Purple & Pink Theme
   ========================================================= */
:root {
  --violet-950: #2A0A2E;
  --violet-800: #4A0E4E;
  --violet-600: #7B2D8E;
  --violet-400: #A855F7;
  --violet-200: #D8B4FE;
  --pink-500: #E91E8C;
  --pink-400: #F472B6;
  --pink-300: #F9A8D4;
  --pink-200: #FBCFE8;
  --pink-100: #FCE7F3;
  --pink-50: #FDF2F8;
  --lavender-50: #FAF5FF;
  --lavender-100: #F3E8FF;
  --paper: #FFFFFF;
  --ink-900: #1F0A2E;
  --ink-700: #4A2B5C;
  --ink-500: #7D5B8F;
  --line: #E9D5F5;
  --gold-500: #C9A45C;
  --whatsapp: #25D366;
  --whatsapp-dark: #128C4A;
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 28px;
  --shadow-card: 0 1px 2px rgba(42,10,46,.06), 0 8px 24px -12px rgba(42,10,46,.18);
  --shadow-pop: 0 10px 30px -8px rgba(42,10,46,.35);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; background: var(--pink-50); color: var(--ink-900);
  font-family: var(--font-body); font-size: 16px; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; display: block; }
a { color: inherit; }
h1,h2,h3 { font-family: var(--font-display); font-weight: 600; margin: 0; color: var(--violet-950); }
.eyebrow { font-size: .78rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--pink-500); margin: 0 0 .75rem; }
:focus-visible { outline: 2px solid var(--pink-500); outline-offset: 2px; border-radius: 4px; }

.btn { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; padding:.85rem 1.5rem; border-radius:999px; font-family:var(--font-body); font-weight:600; font-size:.95rem; text-decoration:none; border:1px solid transparent; cursor:pointer; transition:transform .15s ease, box-shadow .15s ease, background .15s ease; white-space:nowrap; }
.btn:hover { transform: translateY(-1px); }
.btn-primary { background: var(--violet-800); color:#fff; }
.btn-primary:hover { background: var(--violet-600); }
.btn-whatsapp,.btn-order { background: var(--whatsapp); color:#fff; }
.btn-whatsapp:hover,.btn-order:hover { background: var(--whatsapp-dark); }
.btn-secondary { background: transparent; color: var(--violet-800); border-color: var(--violet-800); }
.btn-secondary:hover { background: var(--violet-800); color:#fff; }
.btn-copy { background: var(--pink-50); color: var(--violet-800); border-color: var(--line); padding:.6rem 1.1rem; font-size:.82rem; }
.btn-copy:hover { border-color: var(--pink-500); background: var(--paper); }
.btn-copy.copied { background: var(--whatsapp); color:#fff; border-color: var(--whatsapp); }
.btn-mpesa { background: var(--pink-500); color:#fff; }
.btn-mpesa:hover { background: var(--pink-400); }
.btn-block { width:100%; }
.btn svg { width:18px; height:18px; flex-shrink:0; }

.icon-btn { background:transparent; border:none; cursor:pointer; padding:.4rem; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--ink-700); transition:background .15s ease; }
.icon-btn:hover { background: var(--lavender-100); }
.icon-btn svg { width:22px; height:22px; }

.topbar { position: sticky; top:0; z-index:40; background: var(--violet-800); color:#fff; }
.topbar-inner { max-width:1180px; margin:0 auto; padding:.85rem 1.25rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
.brand { font-family: var(--font-display); font-style: italic; font-size:1.05rem; font-weight:600; color:#fff; letter-spacing:.02em; }
.topbar-right { display:flex; align-items:center; gap:.75rem; }
.topbar-whatsapp { display:inline-flex; align-items:center; gap:.45rem; font-size:.85rem; font-weight:600; color:#fff; text-decoration:none; padding:.45rem .9rem; border:1px solid rgba(255,255,255,.25); border-radius:999px; transition:border-color .15s ease, background .15s ease; }
.topbar-whatsapp:hover { border-color: var(--whatsapp); background: rgba(37,211,102,.15); }
.topbar-whatsapp svg { width:16px; height:16px; fill: var(--whatsapp); }
.cart-btn { position:relative; background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:#fff; width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s ease; }
.cart-btn:hover { background: rgba(255,255,255,.22); }
.cart-btn svg { width:20px; height:20px; }
.cart-count { position:absolute; top:-4px; right:-4px; background: var(--pink-500); color:#fff; font-size:.68rem; font-weight:700; min-width:20px; height:20px; border-radius:999px; display:flex; align-items:center; justify-content:center; padding:0 4px; border:2px solid var(--violet-800); }

.hero { background: linear-gradient(135deg, var(--violet-800) 0%, var(--violet-600) 50%, var(--pink-400) 100%); color:#fff; overflow:hidden; }
.hero-inner { max-width:1180px; margin:0 auto; padding:3.5rem 1.25rem 0; display:grid; gap:2.5rem; }
.hero-copy h1 { color:#fff; font-size: clamp(1.9rem, 4.5vw, 2.9rem); line-height:1.12; max-width:18ch; }
.hero-sub { margin:1.1rem 0 0; max-width:46ch; color: rgba(255,255,255,.82); font-size:1.02rem; }
.hero-actions { display:flex; flex-wrap:wrap; gap:.85rem; margin-top:1.75rem; }
.hero-actions .btn-primary { background:#fff; color: var(--violet-800); }
.hero-actions .btn-primary:hover { background: var(--pink-100); }
.hero-shelf { position:relative; width:100%; overflow:hidden; padding-bottom:3.25rem; -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%); mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%); }
.shelf-track { display:flex; gap:1rem; width:max-content; animation: shelf-scroll 42s linear infinite; }
.hero-shelf:hover .shelf-track { animation-play-state: paused; }
@keyframes shelf-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
.shelf-tag { flex:0 0 auto; width:132px; background:var(--paper); border-radius:var(--radius-sm); padding:.65rem; box-shadow: var(--shadow-pop); transform: rotate(var(--tilt,-1.5deg)); }
.shelf-tag:nth-child(3n){--tilt:2deg}
.shelf-tag:nth-child(3n+1){--tilt:-2.5deg}
.shelf-tag-media { width:100%; aspect-ratio:1; border-radius:8px; background: var(--lavender-50); display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:.5rem; }
.shelf-tag-media img { width:100%; height:100%; object-fit:cover; }
.shelf-tag-media svg { width:46%; height:46%; color: var(--pink-400); }
.shelf-tag-name { font-size:.68rem; font-weight:600; color: var(--ink-900); line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.shelf-tag-price { font-size:.72rem; font-weight:700; color: var(--pink-500); margin-top:.2rem; }
@media (prefers-reduced-motion: reduce) { .shelf-track { animation:none; } }
@media (min-width: 860px) { .hero-inner { grid-template-columns: 1fr; padding-top:4.5rem; } .hero-copy { max-width:640px; } }

.pay-info { max-width:1180px; margin:-1.5rem auto 0; padding:0 1.25rem; position:relative; z-index:10; }
.pay-card { background: var(--paper); border:1px solid var(--line); border-radius: var(--radius-md); box-shadow: var(--shadow-card); padding:1.15rem 1.4rem; display:flex; flex-wrap:wrap; align-items:center; gap:.9rem 1.4rem; }
.pay-icon { width:44px; height:44px; flex-shrink:0; border-radius:50%; background: var(--pink-100); display:flex; align-items:center; justify-content:center; color: var(--pink-500); }
.pay-icon svg { width:22px; height:22px; }
.pay-text { flex:1 1 240px; }
.pay-label { font-size:.68rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color: var(--gold-500); margin:0 0 .2rem; }
.pay-detail { margin:0; font-size:.92rem; color: var(--ink-900); }
.pay-till-number { font-weight:700; color: var(--pink-500); letter-spacing:.03em; }

.catalogue { max-width:1180px; margin:0 auto; padding:2.75rem 1.25rem 1rem; }
.controls { position:sticky; top:60px; z-index:30; background: var(--pink-50); padding:.85rem 0 1rem; display:flex; flex-direction:column; gap:.9rem; }
.search-wrap { position:relative; max-width:420px; }
.search-wrap svg { position:absolute; left:14px; top:50%; transform:translateY(-50%); width:18px; height:18px; color: var(--ink-500); }
#searchInput { width:100%; padding:.75rem 1rem .75rem 2.6rem; border-radius:999px; border:1px solid var(--line); background: var(--paper); font-family: var(--font-body); font-size:.95rem; color: var(--ink-900); }
#searchInput:focus { border-color: var(--pink-500); }
.pills { display:flex; flex-wrap:wrap; gap:.55rem; }
.pill { border:1px solid var(--line); background: var(--paper); color: var(--ink-900); padding:.5rem 1rem; border-radius:999px; font-size:.82rem; font-weight:600; cursor:pointer; transition:background .15s ease, color .15s ease, border-color .15s ease; }
.pill:hover { border-color: var(--pink-400); }
.pill.active { background: var(--violet-800); border-color: var(--violet-800); color:#fff; }
.result-count { margin:.25rem 0 1.25rem; font-size:.85rem; color: var(--ink-500); }

.grid { display:grid; grid-template-columns: repeat(2,1fr); gap:1rem; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3,1fr); gap:1.25rem; } }
@media (min-width: 960px) { .grid { grid-template-columns: repeat(4,1fr); } }
.card { background: var(--paper); border-radius: var(--radius-md); overflow:hidden; box-shadow: var(--shadow-card); display:flex; flex-direction:column; transition:transform .18s ease, box-shadow .18s ease; }
.card:hover { transform: translateY(-3px); box-shadow: var(--shadow-pop); }
.card-media { aspect-ratio:1; background: var(--lavender-100); display:flex; align-items:center; justify-content:center; overflow:hidden; }
.card-media img { width:100%; height:100%; object-fit:cover; }
.card-media svg { width:42%; height:42%; color: var(--pink-400); }
.card-body { padding:.85rem .9rem 1rem; display:flex; flex-direction:column; gap:.4rem; flex:1; }
.card-category { font-size:.66rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color: var(--gold-500); }
.card-name { font-size:.9rem; font-weight:600; color: var(--ink-900); line-height:1.3; margin:0; flex:1; }
.card-price { font-weight:700; font-size:1rem; color: var(--pink-500); }
.card-price.on-request { font-size:.82rem; font-weight:600; color: var(--ink-500); font-style:italic; }
.card-actions { display:flex; gap:.5rem; margin-top:.35rem; }
.card-cta { flex:1; padding:.6rem .75rem; font-size:.82rem; }
.card-add { width:40px; height:40px; border-radius:50%; background: var(--violet-800); color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background .15s ease, transform .15s ease; }
.card-add:hover { background: var(--pink-500); transform: scale(1.05); }
.card-add svg { width:18px; height:18px; }
.card-add.added { background: var(--whatsapp); }

.empty-state { text-align:center; padding:3.5rem 1rem; color: var(--ink-500); }
.empty-state p { margin:0 0 1.1rem; font-size:1rem; }
.site-footer { background: var(--violet-950); color: rgba(255,255,255,.82); text-align:center; padding:2.5rem 1.25rem 6.5rem; margin-top:2rem; }
.site-footer p { margin:.3rem 0; font-size:.9rem; }
.site-footer a { color: var(--pink-400); text-decoration:none; font-weight:600; }
.site-footer a:hover { text-decoration:underline; }
.fine-print { font-size:.78rem; opacity:.7; margin-top:.75rem; }
.floating-whatsapp { position:fixed; right:1.25rem; bottom:1.25rem; z-index:50; width:56px; height:56px; border-radius:50%; background: var(--whatsapp); display:flex; align-items:center; justify-content:center; box-shadow: var(--shadow-pop); animation: pulse-ring 2.6s ease-out infinite; }
.floating-whatsapp svg { width:28px; height:28px; fill:#fff; }
.floating-whatsapp:hover { background: var(--whatsapp-dark); }
@keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(37,211,102,.5),var(--shadow-pop)} 70%{box-shadow:0 0 0 12px rgba(37,211,102,0),var(--shadow-pop)} 100%{box-shadow:0 0 0 0 rgba(37,211,102,0),var(--shadow-pop)} }
@media (prefers-reduced-motion: reduce) { .floating-whatsapp { animation:none; } }

.drawer-backdrop { position:fixed; inset:0; background: rgba(42,10,46,.4); backdrop-filter: blur(2px); z-index:60; opacity:0; transition:opacity .25s ease; }
.drawer-backdrop.visible { opacity:1; }
.cart-drawer { position:fixed; top:0; right:0; width: min(420px, 100vw); height:100vh; height:100dvh; background: var(--paper); z-index:70; display:flex; flex-direction:column; transform: translateX(100%); transition: transform .3s cubic-bezier(.4,0,.2,1); box-shadow: -8px 0 40px rgba(42,10,46,.2); }
.cart-drawer.open { transform: translateX(0); }
.cart-head { display:flex; align-items:center; justify-content:space-between; padding:1.1rem 1.25rem; border-bottom:1px solid var(--line); }
.cart-head h2 { font-size:1.15rem; }
.cart-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; }
.cart-empty { text-align:center; padding:3rem 1rem; color: var(--ink-500); }
.cart-empty svg { width:64px; height:64px; color: var(--pink-300); margin-bottom:1rem; }
.cart-item { display:flex; gap:.85rem; padding:.85rem 0; border-bottom:1px solid var(--line); }
.cart-item:last-child { border-bottom:none; }
.cart-item-media { width:64px; height:64px; border-radius:10px; background: var(--lavender-100); flex-shrink:0; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.cart-item-media img { width:100%; height:100%; object-fit:cover; }
.cart-item-media svg { width:50%; height:50%; color: var(--pink-400); }
.cart-item-info { flex:1; min-width:0; }
.cart-item-name { font-size:.85rem; font-weight:600; color: var(--ink-900); margin:0 0 .25rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cart-item-price { font-size:.82rem; font-weight:700; color: var(--pink-500); margin:0 0 .4rem; }
.cart-qty { display:flex; align-items:center; gap:.5rem; }
.qty-btn { width:28px; height:28px; border-radius:50%; border:1px solid var(--line); background: var(--paper); color: var(--ink-900); font-size:1rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: background .15s ease, border-color .15s ease; }
.qty-btn:hover { background: var(--pink-100); border-color: var(--pink-400); }
.qty-value { font-size:.85rem; font-weight:600; min-width:20px; text-align:center; }
.cart-item-remove { background:none; border:none; color: var(--ink-500); cursor:pointer; padding:.2rem; align-self:flex-start; transition: color .15s ease; }
.cart-item-remove:hover { color: var(--pink-500); }
.cart-item-remove svg { width:16px; height:16px; }
.cart-foot { padding:1.1rem 1.25rem 1.5rem; border-top:1px solid var(--line); background: var(--pink-50); }
.cart-total-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem; font-size:1rem; }
.cart-total-row strong { font-size:1.2rem; color: var(--pink-500); }
.cart-note { font-size:.78rem; color: var(--ink-500); margin:0 0 .85rem; }
.cart-foot .btn { margin-bottom:.5rem; }
.cart-foot .btn:last-child { margin-bottom:0; }

.modal-backdrop { position:fixed; inset:0; background: rgba(42,10,46,.5); backdrop-filter: blur(3px); z-index:80; display:flex; align-items:center; justify-content:center; padding:1rem; opacity:0; transition: opacity .25s ease; }
.modal-backdrop.visible { opacity:1; }
.modal { background: var(--paper); border-radius: var(--radius-lg); width: min(480px,100%); max-height:90vh; overflow-y:auto; padding:2rem 1.75rem 1.75rem; position:relative; box-shadow: 0 25px 60px -12px rgba(42,10,46,.4); transform: translateY(12px) scale(.98); transition: transform .25s ease; }
.modal-backdrop.visible .modal { transform: translateY(0) scale(1); }
.modal-close { position:absolute; top:1rem; right:1rem; }
.stage h2 { font-size:1.35rem; margin-bottom:.5rem; }
.modal-sub { font-size:.9rem; color: var(--ink-500); margin:0 0 1.25rem; }
.order-summary { background: var(--lavender-50); border-radius: var(--radius-sm); padding:.85rem 1rem; margin-bottom:1.25rem; font-size:.85rem; }
.order-summary .line { display:flex; justify-content:space-between; padding:.2rem 0; }
.order-summary .line.total { border-top:1px solid var(--line); margin-top:.4rem; padding-top:.5rem; font-weight:700; color: var(--pink-500); }
.field { display:block; margin-bottom:1rem; }
.field span { display:block; font-size:.82rem; font-weight:600; color: var(--ink-700); margin-bottom:.35rem; }
.field span em { font-weight:400; font-style:normal; color: var(--ink-500); }
.field input { width:100%; padding:.75rem 1rem; border-radius: var(--radius-sm); border:1px solid var(--line); font-family: var(--font-body); font-size:.95rem; color: var(--ink-900); background: var(--paper); }
.field input:focus { border-color: var(--pink-500); outline:none; }
.field-hint { font-size:.75rem; color: var(--ink-500); margin:-.6rem 0 .9rem; }
.modal-fineprint { font-size:.75rem; color: var(--ink-500); text-align:center; margin:.75rem 0 0; line-height:1.4; }
.spinner { width:48px; height:48px; border:4px solid var(--pink-200); border-top-color: var(--pink-500); border-radius:50%; animation: spin .8s linear infinite; margin:0 auto 1.25rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-timer { font-size:.82rem; color: var(--ink-500); text-align:center; margin:1rem 0 1.5rem; }
.result-icon { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem; }
.result-icon.success { background:#DCFCE7; color:#16A34A; }
.result-icon.error { background:#FEE2E2; color:#DC2626; }
.result-icon svg { width:32px; height:32px; }
.receipt { background: var(--lavender-50); border-radius: var(--radius-sm); padding:1rem; margin:1rem 0; font-size:.85rem; }
.receipt .line { display:flex; justify-content:space-between; padding:.2rem 0; }
.receipt .line strong { color: var(--pink-500); }
.toast { position:fixed; bottom:5.5rem; left:50%; transform: translateX(-50%) translateY(10px); background: var(--violet-800); color:#fff; padding:.75rem 1.25rem; border-radius:999px; font-size:.85rem; font-weight:600; z-index:100; opacity:0; transition: opacity .25s ease, transform .25s ease; pointer-events:none; white-space:nowrap; }
.toast.visible { opacity:1; transform: translateX(-50%) translateY(0); }
CSSEOF

# ------------------------------------------------------------
# frontend/app.js
# ------------------------------------------------------------
cat > "$ROOT/frontend/app.js" <<'JSEOF'
/* =========================================================
   TIFFAS BEAUTY AND COSMETICS — Frontend logic
   ========================================================= */
const STORE_NAME = "TIFFAS BEAUTY AND COSMETICS";
const WHATSAPP_NUMBER = "254725679016";
const MPESA_TILL = "8049446";

// Set this to your Render backend URL after deploying.
const API_BASE = window.location.hostname.includes("github.io")
  ? "https://YOUR-BACKEND.onrender.com"
  : "http://localhost:3000";

const CATEGORY_ORDER = [
  "Hair Extensions & Braids",
  "Hair Care & Styling",
  "Skin & Body Care",
  "Accessories & Tools",
  "Makeup & Nails",
  "Fragrances & Body Mist",
  "Other Beauty Products",
];

const CATEGORY_ICONS = {
  "Hair Extensions & Braids": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3c0 4-3 5-3 9s3 5 3 9M12 3c0 4-3 5-3 9s3 5 3 9M16 3c0 4-3 5-3 9s3 5 3 9"/></svg>`,
  "Hair Care & Styling": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8c4-4 12-4 16 0M6 12h12M7 16h10M9 20h6"/></svg>`,
  "Skin & Body Care": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3h6v3.2c2.4 1 4 3.3 4 6.3 0 3.6-2.9 6.5-6.5 6.5S6 16.1 6 12.5c0-3 1.6-5.3 4-6.3V3Z"/><path d="M9 11h6"/></svg>`,
  "Accessories & Tools": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><path d="M10.2 10.2l3.6 3.6"/></svg>`,
  "Makeup & Nails": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 15c0-4 1.5-9 3-11 1.5 2 3 7 3 11a3 3 0 0 1-6 0Z"/><path d="M9 15h6"/></svg>`,
  "Fragrances & Body Mist": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v3M9 5h6l1 3H8l1-3Z"/><path d="M8 8h8l1 13H7L8 8Z"/></svg>`,
  "Other Beauty Products": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
};

const WHATSAPP_GLYPH = `<svg viewBox="0 0 32 32"><path d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.35.65 4.55 1.78 6.43L4 29l7.72-1.75a12.9 12.9 0 0 0 4.3.74h.01c6.62 0 12.02-5.4 12.02-12.02C28.05 8.4 22.65 3 16.02 3Zm7.05 17.13c-.3.83-1.7 1.6-2.36 1.7-.6.1-1.37.14-2.2-.14-.5-.16-1.16-.38-1.99-.75-3.5-1.52-5.79-5.05-5.97-5.29-.17-.24-1.43-1.9-1.43-3.63s.9-2.57 1.23-2.93c.32-.35.7-.44.94-.44.23 0 .47 0 .67.01.22.01.5-.08.78.6.3.7.99 2.44 1.08 2.62.09.17.15.38.03.62-.12.24-.18.38-.35.58-.18.2-.37.45-.53.6-.18.17-.36.36-.16.7.21.34.92 1.52 1.98 2.46 1.36 1.21 2.5 1.59 2.85 1.77.35.17.55.14.75-.08.2-.23.87-1 1.1-1.35.23-.35.46-.29.77-.17.32.12 2.02.95 2.37 1.13.35.17.58.26.66.4.09.15.09.85-.22 1.67Z"/></svg>`;

let allProducts = [];
let activeCategory = "All";
let searchTerm = "";
let cart = JSON.parse(localStorage.getItem("tiffas_cart") || "[]");
let pendingPhone = "";
let pendingAmount = 0;
let pollTimer = null;

function waLink(text){ return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`; }
function genericGreeting(){ return `Hi _${STORE_NAME}_! I'd like to know more about your products.`; }
function orderMessage(p){
  if (p.price == null) return `Hi! I'd like to enquire about:\n\n${p.name}\n\nCould you let me know the price and availability?`;
  return `Hi! I'd like to order:\n\n${p.name}\nPrice: Ksh ${p.price.toLocaleString()}\n\nI'll pay via M-Pesa Till ${MPESA_TILL} — please confirm availability.`;
}
function escapeHtml(str){ return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function mediaHtml(p){ return p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" width="300" height="300">` : (CATEGORY_ICONS[p.category] || CATEGORY_ICONS["Other Beauty Products"]); }
function priceHtml(p){ return p.price == null ? `<span class="card-price on-request">Price on request</span>` : `<span class="card-price">Ksh ${p.price.toLocaleString()}</span>`; }
function saveCart(){ localStorage.setItem("tiffas_cart", JSON.stringify(cart)); }
function cartSubtotal(){ return cart.reduce((s,i)=> s + (i.price||0)*i.qty, 0); }
function cartCount(){ return cart.reduce((s,i)=> s + i.qty, 0); }

function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  requestAnimationFrame(()=> t.classList.add("visible"));
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.classList.remove("visible"); setTimeout(()=> t.hidden = true, 250); }, 2200);
}

function cardHtml(p){
  const ctaLabel = p.price == null ? "Enquire" : "Order";
  const addBtn = p.price != null ? `<button class="card-add" data-id="${p.id}" aria-label="Add to cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>` : "";
  return `<article class="card">
    <div class="card-media">${mediaHtml(p)}</div>
    <div class="card-body">
      <p class="card-category">${escapeHtml(p.category)}</p>
      <p class="card-name">${escapeHtml(p.name)}</p>
      ${priceHtml(p)}
      <div class="card-actions">
        <a class="btn btn-order card-cta" href="${waLink(orderMessage(p))}" target="_blank" rel="noopener">${WHATSAPP_GLYPH.replace('viewBox="0 0 32 32"','viewBox="0 0 32 32" width="14" height="14"')} ${ctaLabel}</a>
        ${addBtn}
      </div>
    </div>
  </article>`;
}

function render(){
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  const countEl = document.getElementById("resultCount");
  const term = searchTerm.trim().toLowerCase();
  const filtered = allProducts.filter(p => {
    const mc = activeCategory === "All" || p.category === activeCategory;
    const ms = !term || p.name.toLowerCase().includes(term);
    return mc && ms;
  });
  countEl.textContent = `Showing ${filtered.length} of ${allProducts.length} products`;
  if (filtered.length === 0){
    grid.innerHTML = ""; grid.hidden = true; empty.hidden = false;
    document.getElementById("emptyQuery").textContent = searchTerm || "this category";
  } else {
    empty.hidden = true; grid.hidden = false;
    grid.innerHTML = filtered.map(cardHtml).join("");
  }
}

function buildCategoryPills(){
  const counts = {};
  allProducts.forEach(p => counts[p.category] = (counts[p.category]||0) + 1);
  const cats = CATEGORY_ORDER.filter(c => counts[c]);
  const html = [`<button class="pill active" data-cat="All">All (${allProducts.length})</button>`]
    .concat(cats.map(c => `<button class="pill" data-cat="${escapeHtml(c)}">${escapeHtml(c)} (${counts[c]})</button>`)).join("");
  const wrap = document.getElementById("categoryPills");
  wrap.innerHTML = html;
  wrap.addEventListener("click", e => {
    const btn = e.target.closest(".pill"); if (!btn) return;
    activeCategory = btn.dataset.cat;
    wrap.querySelectorAll(".pill").forEach(p => p.classList.toggle("active", p === btn));
    render();
  });
}

function buildShelf(){
  const withPhotos = allProducts.filter(p => p.image);
  const pool = (withPhotos.length >= 8 ? withPhotos : allProducts).slice(0, 14);
  const tags = pool.map(p => `
    <div class="shelf-tag">
      <div class="shelf-tag-media">${mediaHtml(p)}</div>
      <div class="shelf-tag-name">${escapeHtml(p.name)}</div>
      <div class="shelf-tag-price">${p.price == null ? "Ask price" : "Ksh " + p.price.toLocaleString()}</div>
    </div>`).join("");
  document.getElementById("shelfTrack").innerHTML = tags + tags;
}

function wireWhatsappLinks(){
  const generic = waLink(genericGreeting());
  ["topbarWhatsapp","heroWhatsapp","footerWhatsapp","floatingWhatsapp"].forEach(id => {
    const el = document.getElementById(id); if (el) el.href = generic;
  });
}

function applyBranding(){
  document.title = `${STORE_NAME} — Order & Pay via M-Pesa`;
  const b = document.querySelector(".brand"); if (b) b.textContent = STORE_NAME;
  document.querySelectorAll(".js-store-name").forEach(el => el.textContent = STORE_NAME);
  document.querySelectorAll(".js-till-number").forEach(el => el.textContent = MPESA_TILL);
}

function wireCopyButton(){
  const btn = document.getElementById("copyTillBtn"); if (!btn) return;
  const label = btn.textContent;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(MPESA_TILL);
      btn.textContent = "Copied!"; btn.classList.add("copied");
      setTimeout(() => { btn.textContent = label; btn.classList.remove("copied"); }, 1800);
    } catch(e){}
  });
}

function renderCart(){
  const body = document.getElementById("cartBody");
  const foot = document.getElementById("cartFoot");
  const countEl = document.getElementById("cartCount");
  const subtotalEl = document.getElementById("cartSubtotal");
  const count = cartCount();
  if (count === 0){
    countEl.hidden = true; foot.hidden = true;
    body.innerHTML = `<div class="cart-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <p>Your cart is empty.</p><p style="font-size:.82rem;">Add products to pay with M-Pesa.</p></div>`;
    return;
  }
  countEl.hidden = false; countEl.textContent = count; foot.hidden = false;
  subtotalEl.textContent = `Ksh ${cartSubtotal().toLocaleString()}`;
  body.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-media">${item.image ? `<img src="${item.image}" alt="">` : (CATEGORY_ICONS[item.category] || CATEGORY_ICONS["Other Beauty Products"])}</div>
      <div class="cart-item-info">
        <p class="cart-item-name">${escapeHtml(item.name)}</p>
        <p class="cart-item-price">Ksh ${(item.price||0).toLocaleString()}</p>
        <div class="cart-qty">
          <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-action="remove" data-id="${item.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`).join("");
}

function openCart(){
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden","false");
  const bd = document.getElementById("drawerBackdrop"); bd.hidden = false;
  requestAnimationFrame(() => bd.classList.add("visible"));
  renderCart();
}
function closeCart(){
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden","true");
  const bd = document.getElementById("drawerBackdrop");
  bd.classList.remove("visible"); setTimeout(() => bd.hidden = true, 250);
}

function addToCart(id){
  const p = allProducts.find(x => x.id === id); if (!p || p.price == null) return;
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty += 1; else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, qty: 1 });
  saveCart(); renderCart(); showToast(`${p.name} added to cart`);
}
function updateQty(id, delta){
  const item = cart.find(i => i.id === id); if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}
function removeFromCart(id){ cart = cart.filter(i => i.id !== id); saveCart(); renderCart(); }

function cartWhatsappMessage(){
  const lines = cart.map(i => `• ${i.name} × ${i.qty} — Ksh ${((i.price||0)*i.qty).toLocaleString()}`);
  return `Hi _${STORE_NAME}_! I'd like to order:\n\n${lines.join("\n")}\n\nSubtotal: Ksh ${cartSubtotal().toLocaleString()}\n\nI'll pay via M-Pesa Till ${MPESA_TILL} — please confirm availability.`;
}

function openModal(){
  const bd = document.getElementById("modalBackdrop"); bd.hidden = false;
  requestAnimationFrame(() => bd.classList.add("visible"));
  showStage("form"); renderOrderSummary();
  document.getElementById("phoneInput").value = "";
  document.getElementById("noteInput").value = "";
  document.getElementById("phoneHint").textContent = "Safaricom line, e.g. 0725 679 016 or 254725679016";
}
function closeModal(){
  const bd = document.getElementById("modalBackdrop");
  bd.classList.remove("visible"); setTimeout(() => bd.hidden = true, 250);
  stopPolling();
}
function showStage(name){ document.querySelectorAll(".stage").forEach(s => s.hidden = s.dataset.stage !== name); }
function renderOrderSummary(){
  const el = document.getElementById("orderSummary");
  const lines = cart.map(i => `<div class="line"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>Ksh ${((i.price||0)*i.qty).toLocaleString()}</span></div>`);
  lines.push(`<div class="line total"><span>Total</span><span>Ksh ${cartSubtotal().toLocaleString()}</span></div>`);
  el.innerHTML = lines.join("");
  document.getElementById("payAmountLabel").textContent = `Ksh ${cartSubtotal().toLocaleString()}`;
}

function normalizePhone(raw){
  let d = String(raw).replace(/\D/g,"");
  if (d.startsWith("0")) d = "254" + d.slice(1);
  if (d.startsWith("7") || d.startsWith("1")) d = "254" + d;
  if (!d.startsWith("254")) return null;
  if (d.length !== 12) return null;
  return d;
}
function stopPolling(){ if (pollTimer){ clearInterval(pollTimer); pollTimer = null; } }

async function sendStkPush(){
  const raw = document.getElementById("phoneInput").value.trim();
  const phone = normalizePhone(raw);
  if (!phone){
    document.getElementById("phoneHint").textContent = "Please enter a valid Safaricom number, e.g. 0725 679 016.";
    document.getElementById("phoneInput").focus(); return;
  }
  const amount = cartSubtotal();
  if (amount <= 0){ showToast("Your cart is empty."); return; }
  const note = document.getElementById("noteInput").value.trim();
  pendingPhone = phone; pendingAmount = amount;
  const payBtn = document.getElementById("payBtn");
  payBtn.disabled = true; payBtn.textContent = "Sending…";
  try {
    const res = await fetch(`${API_BASE}/api/mpesa/stkpush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, amount, accountReference: `TIFFAS-${Date.now().toString().slice(-6)}`, transactionDesc: "Tiffas order", note }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Could not send payment request.");
    document.getElementById("waitingPhone").textContent = phone;
    document.getElementById("waitingAmount").textContent = `Ksh ${amount.toLocaleString()}`;
    document.getElementById("waitTimer").textContent = "Waiting for confirmation…";
    showStage("waiting");
    startPolling(data.checkoutRequestId);
  } catch(err){
    showError("Could not send payment request", err.message + "\n\nYou can still order on WhatsApp and pay manually via Till " + MPESA_TILL + ".");
  } finally {
    payBtn.disabled = false; payBtn.textContent = "Send payment request";
  }
}

function startPolling(id){
  let elapsed = 0; const maxWait = 90;
  stopPolling();
  pollTimer = setInterval(async () => {
    elapsed += 3;
    document.getElementById("waitTimer").textContent = `Waiting for confirmation… (${elapsed}s)`;
    if (elapsed >= maxWait){
      stopPolling();
      showError("Payment timed out", "We didn't receive a confirmation. If you completed the M-Pesa prompt, check your messages. Otherwise try again.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/mpesa/status/${id}`);
      const data = await res.json();
      if (data.status === "completed"){ stopPolling(); showSuccess(data.receipt); }
      else if (data.status === "failed"){ stopPolling(); showError("Payment failed", data.message || "The M-Pesa payment was not completed."); }
    } catch(e){}
  }, 3000);
}

function showSuccess(receipt){
  showStage("success");
  document.getElementById("receiptBox").innerHTML = `
    <div class="line"><span>Receipt</span><strong>${receipt || "N/A"}</strong></div>
    <div class="line"><span>Amount</span><strong>Ksh ${pendingAmount.toLocaleString()}</strong></div>
    <div class="line"><span>Phone</span><span>${pendingPhone}</span></div>`;
  cart = []; saveCart(); renderCart();
}
function showError(title, message){
  document.getElementById("errorTitle").textContent = title;
  document.getElementById("errorMessage").textContent = message;
  showStage("error");
}

function wireControls(){
  document.getElementById("searchInput").addEventListener("input", e => { searchTerm = e.target.value; render(); });
  document.getElementById("clearFilters").addEventListener("click", () => {
    searchTerm = ""; activeCategory = "All";
    document.getElementById("searchInput").value = "";
    document.querySelectorAll(".pill").forEach(p => p.classList.toggle("active", p.dataset.cat === "All"));
    render();
  });
}

function wireCart(){
  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("closeCartBtn").addEventListener("click", closeCart);
  document.getElementById("drawerBackdrop").addEventListener("click", closeCart);
  document.getElementById("cartBody").addEventListener("click", e => {
    const btn = e.target.closest("[data-action]"); if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "inc") updateQty(id, 1);
    if (btn.dataset.action === "dec") updateQty(id, -1);
    if (btn.dataset.action === "remove") removeFromCart(id);
  });
  document.getElementById("cartWhatsappBtn").addEventListener("click", () => {
    if (cart.length === 0) return;
    window.open(waLink(cartWhatsappMessage()), "_blank");
  });
  document.getElementById("checkoutBtn").addEventListener("click", () => {
    if (cart.length === 0) return;
    closeCart(); openModal();
  });
  document.getElementById("productGrid").addEventListener("click", e => {
    const btn = e.target.closest(".card-add"); if (!btn) return;
    addToCart(btn.dataset.id);
    btn.classList.add("added"); setTimeout(() => btn.classList.remove("added"), 800);
  });
}

function wireCheckout(){
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById("payBtn").addEventListener("click", sendStkPush);
  document.getElementById("cancelWaitBtn").addEventListener("click", () => { stopPolling(); closeModal(); });
  document.getElementById("retryBtn").addEventListener("click", () => showStage("form"));
  document.getElementById("doneBtn").addEventListener("click", closeModal);
  document.getElementById("receiptWhatsappBtn").addEventListener("click", () => {
    const msg = `Hi! I've paid Ksh ${pendingAmount.toLocaleString()} via M-Pesa (Receipt: ${document.querySelector("#receiptBox .line strong")?.textContent || "N/A"}). Here are my delivery details: `;
    window.open(waLink(msg), "_blank");
  });
  document.getElementById("errorWhatsappBtn").addEventListener("click", () => {
    window.open(waLink(cartWhatsappMessage()), "_blank");
  });
}

async function init(){
  applyBranding();
  try {
    const res = await fetch("products.json");
    allProducts = await res.json();
  } catch(err){
    console.error("Could not load products.json", err);
    document.getElementById("productGrid").innerHTML = "<p>Products could not be loaded.</p>";
    return;
  }
  document.getElementById("floatingWhatsapp").innerHTML = WHATSAPP_GLYPH;
  document.getElementById("topbarWhatsapp").innerHTML = `${WHATSAPP_GLYPH.replace('viewBox="0 0 32 32"','viewBox="0 0 32 32" width="14" height="14"')} 0725 679 016`;
  wireWhatsappLinks(); wireCopyButton(); buildCategoryPills(); buildShelf();
  wireControls(); wireCart(); wireCheckout();
  render(); renderCart();
}

init();
JSEOF

# ------------------------------------------------------------
# frontend/products.json  (placeholder — copy your real one in)
# ------------------------------------------------------------
cat > "$ROOT/frontend/products.json" <<'JSONEOF'
[
  {
    "id": "papayas-oil-200ml",
    "name": "PAPAYAS OIL 200ML",
    "category": "Skin & Body Care",
    "price": 400,
    "inStock": true,
    "image": null
  },
  {
    "id": "bamsi-white-conditioner-500ml",
    "name": "BAMSI WHITE CONDITIONER 500ML",
    "category": "Hair Care & Styling",
    "price": 190,
    "inStock": true,
    "image": null
  },
  {
    "id": "rose-leaf-ponds-big",
    "name": "ROSE LEAF PONDS BIG",
    "category": "Skin & Body Care",
    "price": 150,
    "inStock": false,
    "image": null
  },
  {
    "id": "1-million",
    "name": "1 MILLION",
    "category": "Fragrances & Body Mist",
    "price": 200,
    "inStock": false,
    "image": null
  }
]
JSONEOF
# ^^^ This is a small sample. After unzipping, replace frontend/products.json
#     with your full 498-product file (the one already in your project).

# ------------------------------------------------------------
# backend/package.json
# ------------------------------------------------------------
cat > "$ROOT/backend/package.json" <<'PKGEOF'
{
  "name": "tiffas-backend",
  "version": "1.0.0",
  "description": "M-Pesa Daraja STK Push backend for TIFFAS storefront",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "engines": { "node": ">=18" },
  "dependencies": {
    "axios": "^1.7.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  }
}
PKGEOF

# ------------------------------------------------------------
# backend/.env.example
# ------------------------------------------------------------
cat > "$ROOT/backend/.env.example" <<'ENVEOF'
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=8049446
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://YOUR-BACKEND.onrender.com/api/mpesa/callback
MPESA_ENV=production
PORT=3000
ENVEOF

# ------------------------------------------------------------
# backend/.gitignore
# ------------------------------------------------------------
cat > "$ROOT/backend/.gitignore" <<'GITEOF'
.env
node_modules/
*.log
GITEOF

# ------------------------------------------------------------
# backend/server.js
# ------------------------------------------------------------
cat > "$ROOT/backend/server.js" <<'SRVEOF'
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

const allowedOrigins = [
  /^https:\/\/[a-z0-9-]+\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.onrender\.com$/,
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:5500",
];
app.use(cors({
  origin: (origin, cb) =>
    !origin || allowedOrigins.some(r => typeof r === "string" ? r === origin : r.test(origin))
      ? cb(null, true)
      : cb(new Error("Not allowed by CORS: " + origin)),
}));
app.use(express.json());

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL;
const ENV = process.env.MPESA_ENV || "sandbox";
const PORT = process.env.PORT || 3000;

const BASE = ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

const payments = new Map();

async function getAccessToken(){
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await axios.get(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
  return res.data.access_token;
}
function timestamp(){
  const d = new Date(); const p = n => String(n).padStart(2,"0");
  return d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

app.get("/", (_req,res) => res.json({ ok:true, service:"tiffas-backend", env: ENV }));

app.post("/api/mpesa/stkpush", async (req, res) => {
  const { phone, amount, accountReference, transactionDesc } = req.body;
  if (!phone || !amount) return res.status(400).json({ success:false, message:"phone and amount are required." });
  try {
    const token = await getAccessToken();
    const ts = timestamp();
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64");
    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: (accountReference || "TIFFAS").slice(0,12),
      TransactionDesc: (transactionDesc || "Tiffas order").slice(0,13),
    };
    const stkRes = await axios.post(`${BASE}/mpesa/stkpush/v1/processrequest`, payload, { headers: { Authorization: `Bearer ${token}` } });
    const data = stkRes.data;
    if (data.ResponseCode === "0"){
      payments.set(data.CheckoutRequestID, { status:"pending", phone, amount, createdAt: Date.now() });
      return res.json({ success:true, message:"STK push sent.", checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID });
    }
    return res.status(400).json({ success:false, message: data.ResponseDescription || "STK push failed.", raw: data });
  } catch(err){
    console.error("STK push error:", err.response?.data || err.message);
    return res.status(500).json({ success:false, message: err.response?.data?.errorMessage || "Could not reach M-Pesa." });
  }
});

app.post("/api/mpesa/callback", (req, res) => {
  const cb = req.body?.Body?.stkCallback;
  if (!cb) return res.json({ ResultCode:0, ResultDesc:"Accepted" });
  const record = payments.get(cb.CheckoutRequestID);
  if (record){
    if (cb.ResultCode === 0){
      const items = cb.CallbackMetadata?.Item || [];
      const receipt = items.find(i => i.Name === "MpesaReceiptNumber")?.Value || "N/A";
      record.status = "completed"; record.receipt = receipt;
    } else {
      record.status = "failed"; record.message = cb.ResultDesc || "Payment failed.";
    }
  }
  res.json({ ResultCode:0, ResultDesc:"Accepted" });
});

app.get("/api/mpesa/status/:id", (req, res) => {
  const r = payments.get(req.params.id);
  if (!r) return res.json({ status:"pending" });
  if (Date.now() - r.createdAt > 5*60*1000 && r.status === "pending"){ r.status = "failed"; r.message = "Payment request timed out."; }
  if (r.status === "completed") return res.json({ status:"completed", receipt: r.receipt });
  if (r.status === "failed") return res.json({ status:"failed", message: r.message });
  return res.json({ status:"pending" });
});

app.listen(PORT, () => console.log(`TIFFAS backend on :${PORT} (env=${ENV})`));
SRVEOF

# ------------------------------------------------------------
# scripts/deploy.sh
# ------------------------------------------------------------
cat > "$ROOT/scripts/deploy.sh" <<'DEPEOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "▸ TIFFAS storefront deploy"
if [ ! -d ".git" ]; then
  git init -q && git branch -M main
  read -rp "  GitHub remote URL: " REMOTE
  git remote add origin "$REMOTE"
fi
git add -A
if git diff --cached --quiet; then echo "Nothing to commit."; else
  read -rp "  Commit message [deploy: update]: " MSG
  git commit -q -m "${MSG:-deploy: update}"
fi
read -rp "Push to origin/main? [Y/n]: " P
if [[ "${P:-Y}" =~ ^[Yy]$ ]]; then git push -u origin main; fi
read -rp "Render Deploy Hook URL (blank to skip): " HOOK
if [ -n "$HOOK" ]; then curl -fsSL -X POST "$HOOK" && echo "Render triggered."; fi
echo "Done."
DEPEOF
chmod +x "$ROOT/scripts/deploy.sh"

# ------------------------------------------------------------
# README.md
# ------------------------------------------------------------
cat > "$ROOT/README.md" <<'RMEOF'
# TIFFAS BEAUTY AND COSMETICS — Storefront

Purple-and-pink storefront with cart, M-Pesa STK Push checkout, and
WhatsApp fallback ordering. Split into `frontend/` (GitHub Pages) and
`backend/` (Render).

## Structure
- `frontend/`  → static site (HTML, CSS, JS, products.json, images)
- `backend/`   → Node.js server for M-Pesa Daraja STK Push
- `.github/workflows/` → auto-deploy to Pages + auto-redeploy Render
- `render.yaml` → Render Blueprint
- `scripts/deploy.sh` → one-shot git push + Render trigger

## First-time deploy

1. **Push to GitHub** (create a public repo):