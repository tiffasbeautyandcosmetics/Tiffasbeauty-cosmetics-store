/* =========================================================
   TIFFAS BEAUTY AND COSMETICS — Frontend Logic
   ========================================================= */

const STORE_NAME = "TIFFAS BEAUTY AND COSMETICS";
const WHATSAPP_NUMBER = "254725679016";
const MPESA_TILL = "8049446";
const API_BASE = window.location.origin.includes("localhost")
  ? "http://localhost:3000"
  : ""; // set to your deployed backend URL, e.g. "https://tiffas-backend.onrender.com"

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

/* ---------- helpers ---------- */
function waLink(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
function genericGreeting() {
  return `Hi _${STORE_NAME}_! I'd like to know more about your products.`;
}
function orderMessage(p) {
  if (p.price == null) {
    return `Hi! I'd like to enquire about:\n\n${p.name}\n\nCould you let me know the price and availability?`;
  }
  return `Hi! I'd like to order:\n\n${p.name}\nPrice: Ksh ${p.price.toLocaleString()}\n\nI'll pay via M-Pesa Till ${MPESA_TILL} — please confirm availability.`;
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function mediaHtml(p) {
  if (p.image) {
    return `<img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" width="300" height="300">`;
  }
  return CATEGORY_ICONS[p.category] || CATEGORY_ICONS["Other Beauty Products"];
}
function priceHtml(p) {
  if (p.price == null) {
    return `<span class="card-price on-request">Price on request</span>`;
  }
  return `<span class="card-price">Ksh ${p.price.toLocaleString()}</span>`;
}
function saveCart() {
  localStorage.setItem("tiffas_cart", JSON.stringify(cart));
}
function cartSubtotal() {
  return cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
}
function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

/* ---------- toast ---------- */
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("visible"));
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => (toast.hidden = true), 250);
  }, 2200);
}

/* ---------- product grid ---------- */
function cardHtml(p) {
  const ctaLabel = p.price == null ? "Enquire" : "Order";
  const addBtn = p.price != null
    ? `<button class="card-add" data-id="${p.id}" aria-label="Add ${escapeHtml(p.name)} to cart">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
       </button>`
    : "";
  return `
    <article class="card">
      <div class="card-media">${mediaHtml(p)}</div>
      <div class="card-body">
        <p class="card-category">${escapeHtml(p.category)}</p>
        <p class="card-name">${escapeHtml(p.name)}</p>
        ${priceHtml(p)}
        <div class="card-actions">
          <a class="btn btn-order card-cta" href="${waLink(orderMessage(p))}" target="_blank" rel="noopener">
            ${WHATSAPP_GLYPH.replace('viewBox="0 0 32 32"', 'viewBox="0 0 32 32" width="14" height="14"')} ${ctaLabel}
          </a>
          ${addBtn}
        </div>
      </div>
    </article>
  `;
}

function render() {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  const countEl = document.getElementById("resultCount");
  const term = searchTerm.trim().toLowerCase();

  const filtered = allProducts.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = !term || p.name.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  countEl.textContent = `Showing ${filtered.length} of ${allProducts.length} products`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    grid.hidden = true;
    empty.hidden = false;
    document.getElementById("emptyQuery").textContent = searchTerm || "this category";
  } else {
    empty.hidden = true;
    grid.hidden = false;
    grid.innerHTML = filtered.map(cardHtml).join("");
  }
}

/* ---------- category pills ---------- */
function buildCategoryPills() {
  const counts = {};
  allProducts.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
  const cats = CATEGORY_ORDER.filter((c) => counts[c]);
  const pillsHtml = [`<button class="pill active" data-cat="All">All (${allProducts.length})</button>`]
    .concat(cats.map((c) => `<button class="pill" data-cat="${escapeHtml(c)}">${escapeHtml(c)} (${counts[c]})</button>`))
    .join("");
  const wrap = document.getElementById("categoryPills");
  wrap.innerHTML = pillsHtml;
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    wrap.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p === btn));
    render();
  });
}

/* ---------- shelf ---------- */
function buildShelf() {
  const withPhotos = allProducts.filter((p) => p.image);
  const pool = (withPhotos.length >= 8 ? withPhotos : allProducts).slice(0, 14);
  const tags = pool
    .map(
      (p) => `
      <div class="shelf-tag">
        <div class="shelf-tag-media">${mediaHtml(p)}</div>
        <div class="shelf-tag-name">${escapeHtml(p.name)}</div>
        <div class="shelf-tag-price">${p.price == null ? "Ask price" : "Ksh " + p.price.toLocaleString()}</div>
      </div>`
    )
    .join("");
  document.getElementById("shelfTrack").innerHTML = tags + tags;
}

/* ---------- whatsapp links ---------- */
function wireWhatsappLinks() {
  const generic = waLink(genericGreeting());
  ["topbarWhatsapp", "heroWhatsapp", "footerWhatsapp", "floatingWhatsapp"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = generic;
  });
}

/* ---------- branding ---------- */
function applyBranding() {
  document.title = `${STORE_NAME} — Order & Pay via M-Pesa`;
  const brandEl = document.querySelector(".brand");
  if (brandEl) brandEl.textContent = STORE_NAME;
  document.querySelectorAll(".js-store-name").forEach((el) => (el.textContent = STORE_NAME));
  document.querySelectorAll(".js-till-number").forEach((el) => (el.textContent = MPESA_TILL));
}

/* ---------- copy till ---------- */
function wireCopyButton() {
  const btn = document.getElementById("copyTillBtn");
  if (!btn) return;
  const defaultLabel = btn.textContent;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(MPESA_TILL);
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = defaultLabel;
        btn.classList.remove("copied");
      }, 1800);
    } catch (err) {}
  });
}

/* ---------- cart UI ---------- */
function renderCart() {
  const body = document.getElementById("cartBody");
  const foot = document.getElementById("cartFoot");
  const countEl = document.getElementById("cartCount");
  const subtotalEl = document.getElementById("cartSubtotal");

  const count = cartCount();
  if (count === 0) {
    countEl.hidden = true;
    foot.hidden = true;
    body.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <p>Your cart is empty.</p>
        <p style="font-size:0.82rem;">Add products to pay with M-Pesa.</p>
      </div>`;
    return;
  }

  countEl.hidden = false;
  countEl.textContent = count;
  foot.hidden = false;
  subtotalEl.textContent = `Ksh ${cartSubtotal().toLocaleString()}`;

  body.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-media">${item.image ? `<img src="${item.image}" alt="">` : CATEGORY_ICONS[item.category] || CATEGORY_ICONS["Other Beauty Products"]}</div>
        <div class="cart-item-info">
          <p class="cart-item-name">${escapeHtml(item.name)}</p>
          <p class="cart-item-price">Ksh ${(item.price || 0).toLocaleString()}</p>
          <div class="cart-qty">
            <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Decrease">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Increase">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-action="remove" data-id="${item.id}" aria-label="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>`
    )
    .join("");
}

function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "false");
  document.getElementById("drawerBackdrop").hidden = false;
  requestAnimationFrame(() => document.getElementById("drawerBackdrop").classList.add("visible"));
  renderCart();
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "true");
  const bd = document.getElementById("drawerBackdrop");
  bd.classList.remove("visible");
  setTimeout(() => (bd.hidden = true), 250);
}

/* ---------- cart actions ---------- */
function addToCart(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product || product.price == null) return;
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      qty: 1,
    });
  }
  saveCart();
  renderCart();
  showToast(`${product.name} added to cart`);
}

function updateQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== productId);
  }
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  saveCart();
  renderCart();
}

/* ---------- WhatsApp cart order ---------- */
function cartWhatsappMessage() {
  const lines = cart.map((i) => `• ${i.name} × ${i.qty} — Ksh ${((i.price || 0) * i.qty).toLocaleString()}`);
  return `Hi _${STORE_NAME}_! I'd like to order:\n\n${lines.join("\n")}\n\nSubtotal: Ksh ${cartSubtotal().toLocaleString()}\n\nI'll pay via M-Pesa Till ${MPESA_TILL} — please confirm availability.`;
}

/* ---------- M-Pesa checkout ---------- */
function openModal() {
  const bd = document.getElementById("modalBackdrop");
  bd.hidden = false;
  requestAnimationFrame(() => bd.classList.add("visible"));
  showStage("form");
  renderOrderSummary();
  document.getElementById("phoneInput").value = "";
  document.getElementById("noteInput").value = "";
  document.getElementById("phoneHint").textContent = "Safaricom line, e.g. 0725 679 016 or 254725679016";
}
function closeModal() {
  const bd = document.getElementById("modalBackdrop");
  bd.classList.remove("visible");
  setTimeout(() => (bd.hidden = true), 250);
  stopPolling();
}
function showStage(name) {
  document.querySelectorAll(".stage").forEach((s) => {
    s.hidden = s.dataset.stage !== name;
  });
}
function renderOrderSummary() {
  const el = document.getElementById("orderSummary");
  const lines = cart.map(
    (i) => `<div class="line"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>Ksh ${((i.price || 0) * i.qty).toLocaleString()}</span></div>`
  );
  lines.push(`<div class="line total"><span>Total</span><span>Ksh ${cartSubtotal().toLocaleString()}</span></div>`);
  el.innerHTML = lines.join("");
  document.getElementById("payAmountLabel").textContent = `Ksh ${cartSubtotal().toLocaleString()}`;
}

function normalizePhone(raw) {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) digits = "254" + digits;
  if (!digits.startsWith("254")) return null;
  if (digits.length !== 12) return null;
  return digits;
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function sendStkPush() {
  const rawPhone = document.getElementById("phoneInput").value.trim();
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    document.getElementById("phoneHint").textContent = "Please enter a valid Safaricom number, e.g. 0725 679 016.";
    document.getElementById("phoneInput").focus();
    return;
  }

  const amount = cartSubtotal();
  if (amount <= 0) {
    showToast("Your cart is empty.");
    return;
  }

  const note = document.getElementById("noteInput").value.trim();

  pendingPhone = phone;
  pendingAmount = amount;

  const payBtn = document.getElementById("payBtn");
  payBtn.disabled = true;
  payBtn.textContent = "Sending…";

  try {
    const res = await fetch(`${API_BASE}/api/mpesa/stkpush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        amount,
        accountReference: `TIFFAS-${Date.now().toString().slice(-6)}`,
        transactionDesc: "Tiffas Beauty order",
        note,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not send payment request.");
    }

    // Show waiting stage
    document.getElementById("waitingPhone").textContent = phone;
    document.getElementById("waitingAmount").textContent = `Ksh ${amount.toLocaleString()}`;
    document.getElementById("waitTimer").textContent = "Waiting for confirmation…";
    showStage("waiting");

    // Start polling
    const checkoutId = data.checkoutRequestId;
    startPolling(checkoutId);
  } catch (err) {
    showError(
      "Could not send payment request",
      err.message + "\n\nYou can still order on WhatsApp and pay manually via Till " + MPESA_TILL + "."
    );
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = "Send payment request";
  }
}

function startPolling(checkoutId) {
  let elapsed = 0;
  const maxWait = 90; // seconds
  stopPolling();
  pollTimer = setInterval(async () => {
    elapsed += 3;
    document.getElementById("waitTimer").textContent = `Waiting for confirmation… (${elapsed}s)`;
    if (elapsed >= maxWait) {
      stopPolling();
      showError(
        "Payment timed out",
        "We didn't receive a confirmation. If you completed the M-Pesa prompt, please check your messages. Otherwise, try again."
      );
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/mpesa/status/${checkoutId}`);
      const data = await res.json();
      if (data.status === "completed") {
        stopPolling();
        showSuccess(data.receipt);
      } else if (data.status === "failed") {
        stopPolling();
        showError("Payment failed", data.message || "The M-Pesa payment was not completed. You can try again or order on WhatsApp.");
      }
    } catch (err) {
      // network hiccup — keep polling
    }
  }, 3000);
}

function showSuccess(receipt) {
  showStage("success");
  const el = document.getElementById("receiptBox");
  el.innerHTML = `
    <div class="line"><span>Receipt</span><strong>${receipt || "N/A"}</strong></div>
    <div class="line"><span>Amount</span><strong>Ksh ${pendingAmount.toLocaleString()}</strong></div>
    <div class="line"><span>Phone</span><span>${pendingPhone}</span></div>
  `;
  // Clear cart after successful payment
  cart = [];
  saveCart();
  renderCart();
}

function showError(title, message) {
  document.getElementById("errorTitle").textContent = title;
  document.getElementById("errorMessage").textContent = message;
  showStage("error");
}

/* ---------- init ---------- */
function wireControls() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    render();
  });
  document.getElementById("clearFilters").addEventListener("click", () => {
    searchTerm = "";
    activeCategory = "All";
    document.getElementById("searchInput").value = "";
    document.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p.dataset.cat === "All"));
    render();
  });
}

function wireCart() {
  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("closeCartBtn").addEventListener("click", closeCart);
  document.getElementById("drawerBackdrop").addEventListener("click", closeCart);

  document.getElementById("cartBody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
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
    closeCart();
    openModal();
  });

  document.getElementById("productGrid").addEventListener("click", (e) => {
    const btn = e.target.closest(".card-add");
    if (!btn) return;
    addToCart(btn.dataset.id);
    btn.classList.add("added");
    setTimeout(() => btn.classList.remove("added"), 800);
  });
}

function wireCheckout() {
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("payBtn").addEventListener("click", sendStkPush);
  document.getElementById("cancelWaitBtn").addEventListener("click", () => {
    stopPolling();
    closeModal();
  });
  document.getElementById("retryBtn").addEventListener("click", () => {
    showStage("form");
  });
  document.getElementById("doneBtn").addEventListener("click", () => {
    closeModal();
  });
  document.getElementById("receiptWhatsappBtn").addEventListener("click", () => {
    const msg = `Hi! I've paid Ksh ${pendingAmount.toLocaleString()} via M-Pesa (Receipt: ${document.querySelector("#receiptBox .line strong")?.textContent || "N/A"}). Here are my delivery details: `;
    window.open(waLink(msg), "_blank");
  });
  document.getElementById("errorWhatsappBtn").addEventListener("click", () => {
    window.open(waLink(cartWhatsappMessage()), "_blank");
  });
}

async function init() {
  applyBranding();
  try {
    const res = await fetch("products.json");
    allProducts = await res.json();
  } catch (err) {
    console.error("Could not load products.json", err);
    document.getElementById("productGrid").innerHTML = "<p>Products could not be loaded.</p>";
    return;
  }
  document.getElementById("floatingWhatsapp").innerHTML = WHATSAPP_GLYPH;
  document.getElementById("topbarWhatsapp").innerHTML = `${WHATSAPP_GLYPH.replace('viewBox="0 0 32 32"', 'viewBox="0 0 32 32" width="14" height="14"')} 0725 679 016`;
  wireWhatsappLinks();
  wireCopyButton();
  buildCategoryPills();
  buildShelf();
  wireControls();
  wireCart();
  wireCheckout();
  render();
  renderCart();
}

init();