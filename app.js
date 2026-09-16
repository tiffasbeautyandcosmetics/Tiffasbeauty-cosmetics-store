document.addEventListener("DOMContentLoaded", () => {
  const C = window.TIFFAS_CONFIG || {};
  const STORE_NAME = C.STORE_NAME || "TIFFAS BEAUTY AND COSMETICS";
  const API_BASE = String(C.API_BASE || "").replace(/\/$/, "");
  const WHATSAPP = C.WHATSAPP_NUMBER || "254725679016";
  const TILL = C.MPESA_TILL || "8049446";
  let products = [], category = "All", query = "", poll = null;
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("tiffas_cart") || "[]"); if (!Array.isArray(cart)) cart = []; } catch (_) { cart = []; }
  const $ = (id) => document.getElementById(id);
  const money = (n) => `Ksh ${Number(n || 0).toLocaleString("en-KE")}`;
  const esc = (s) => String(s ?? "").replace(/[&<>\"]/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[m]));
  const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const save = () => { try { localStorage.setItem("tiffas_cart", JSON.stringify(cart)); } catch (_) {} };
  const subtotal = () => cart.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 0), 0);
  const required = ["search","categories","count","grid","empty","cartItems","subtotal","cartBadge"];
  if (required.some((id) => !$(id))) return;
  function toast(msg) { const el=$("toast"); if(!el)return; el.textContent=msg; el.hidden=false; clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.hidden=true,2200); }
  function card(p) {
    const img=p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`:`<span class="placeholder">${esc((p.name||"B").charAt(0))}</span>`;
    const add=(p.price!=null&&p.inStock!==false)?`<button class="add" data-add="${esc(p.id)}">Add</button>`:`<button class="add" disabled>Out of stock</button>`;
    return `<article class="card"><div class="card-media">${img}</div><div class="card-body"><small>${esc(p.category||"Beauty & Cosmetics")}</small><h3>${esc(p.name)}</h3><strong>${p.price==null?"Price on request":money(p.price)}</strong><div class="card-actions"><a class="mini-wa" href="${wa(`Hi ${STORE_NAME}! I'd like to order ${p.name}.`)}" target="_blank" rel="noopener">WhatsApp</a>${add}</div></div></article>`;
  }
  function render(){
    const term=query.trim().toLowerCase();
    const list=products.filter(p=>(category==="All"||p.category===category)&&(!term||String(p.name||"").toLowerCase().includes(term)));
    $("count").textContent=`Showing ${list.length} of ${products.length} products`;
    $("grid").innerHTML=list.map(card).join(""); $("empty").hidden=list.length!==0;
  }
  function categories(){
    const cats=["All",...new Set(products.map(p=>p.category).filter(Boolean))];
    $("categories").innerHTML=cats.map(c=>`<button type="button" class="pill ${c===category?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  }
  function renderCart(){
    $("cartBadge").hidden=cart.length===0; $("cartBadge").textContent=String(cart.reduce((s,i)=>s+Number(i.qty||0),0)); $("subtotal").textContent=money(subtotal());
    $("cartItems").innerHTML=cart.length?cart.map(i=>`<div class="cart-item"><div><b>${esc(i.name)}</b><small>${money(i.price)} × ${i.qty}</small></div><div class="qty"><button type="button" data-dec="${esc(i.id)}">−</button><span>${i.qty}</span><button type="button" data-inc="${esc(i.id)}">+</button></div></div>`).join(""):"<div class='empty'>Your cart is empty.</div>";
  }
  function openCart(){ $("cartDrawer")?.classList.add("open"); if($("drawerOverlay"))$("drawerOverlay").hidden=false; renderCart(); }
  function closeCart(){ $("cartDrawer")?.classList.remove("open"); if($("drawerOverlay"))$("drawerOverlay").hidden=true; }
  function openModal(){
    if(!cart.length)return toast("Your cart is empty.");
    $("modalOverlay").hidden=false;
    $("modalContent").innerHTML=`<h2 id="modalTitle">M-Pesa checkout</h2><p>Total: <b>${money(subtotal())}</b></p><label>Safaricom number<input id="phone" type="tel" placeholder="0725 679 016" autocomplete="tel"></label><button id="pay" type="button" class="btn primary full">Send M-Pesa prompt</button><p class="hint">You will receive the STK prompt on your phone.</p><div id="status" role="status"></div>`;
    $("pay").onclick=pay;
  }
  function closeModal(){ clearInterval(poll); if($("modalOverlay"))$("modalOverlay").hidden=true; }
  function phone(v){ let d=String(v||"").replace(/\D/g,""); if(d.startsWith("0"))d="254"+d.slice(1); if(d.length===9&&(d.startsWith("7")||d.startsWith("1")))d="254"+d; return /^254[17]\d{8}$/.test(d)?d:null; }
  async function pay(){
    const p=phone($("phone")?.value), status=$("status"), btn=$("pay");
    if(!p){status.textContent="Enter a valid Kenyan mobile number.";return;}
    btn.disabled=true;btn.textContent="Sending…";
    try{
      const r=await fetch(`${API_BASE}/api/mpesa/stkpush`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:p,amount:subtotal(),accountReference:"TIFFAS",transactionDesc:"Beauty order"})});
      const d=await r.json(); if(!r.ok||!d.success)throw Error(d.message||"Payment request failed");
      status.textContent="STK prompt sent. Enter your M-Pesa PIN on your phone.";
      let elapsed=0; clearInterval(poll); poll=setInterval(async()=>{elapsed+=3;if(elapsed>90){clearInterval(poll);status.textContent="Timed out. You can retry or order through WhatsApp.";return;}try{const s=await fetch(`${API_BASE}/api/mpesa/status/${encodeURIComponent(d.checkoutRequestId)}`),x=await s.json();if(x.status==="completed"){clearInterval(poll);status.innerHTML=`Payment received. Receipt: <b>${esc(x.receipt||"N/A")}</b>`;cart=[];save();renderCart();}else if(x.status==="failed"){clearInterval(poll);status.textContent=x.message||"Payment failed.";}}catch(_){}},3000);
    }catch(e){status.textContent=`${e.message} You can pay manually via Till ${TILL} or order on WhatsApp.`;}finally{btn.disabled=false;btn.textContent="Send M-Pesa prompt";}
  }
  function cartMessage(){return `Hi ${STORE_NAME}! I'd like to order:\n\n${cart.map(i=>`• ${i.name} × ${i.qty} — ${money(i.price*i.qty)}`).join("\n")}\n\nTotal: ${money(subtotal())}`;}
  $("search").addEventListener("input",e=>{query=e.target.value;render();});
  $("categories").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;category=b.dataset.cat;categories();render();});
  $("grid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b||b.disabled)return;const p=products.find(x=>String(x.id)===String(b.dataset.add));if(!p)return;const i=cart.find(x=>String(x.id)===String(p.id));i?i.qty++:cart.push({id:p.id,name:p.name,price:p.price,qty:1});save();renderCart();toast("Added to cart");});
  $("cartItems").addEventListener("click",e=>{const inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]"),id=(inc||dec)?.dataset[inc?"inc":"dec"];if(!id)return;const i=cart.find(x=>String(x.id)===String(id));if(!i)return;i.qty+=inc?1:-1;if(i.qty<1)cart=cart.filter(x=>String(x.id)!==String(id));save();renderCart();});
  $("cartOpen")?.addEventListener("click",openCart); $("cartClose")?.addEventListener("click",closeCart); $("drawerOverlay")?.addEventListener("click",closeCart); $("checkout")?.addEventListener("click",()=>{closeCart();openModal();}); $("modalClose")?.addEventListener("click",closeModal); $("modalOverlay")?.addEventListener("click",e=>{if(e.target===$("modalOverlay"))closeModal();});
  $("cartWhatsapp")?.addEventListener("click",()=>window.open(wa(cartMessage()),"_blank","noopener"));
  $("copyTill")?.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(TILL);toast("Till number copied")}catch(_){toast(TILL)}});
  ["topWhatsapp","heroWhatsapp","footerWhatsapp"].forEach(id=>{const el=$(id);if(el)el.href=wa(`Hi ${STORE_NAME}! I'd like to know more about your products.`);});
  if($("footerWhatsapp"))$("footerWhatsapp").textContent="0725 679 016"; if($("tillHero"))$("tillHero").textContent=TILL; if($("tillStrip"))$("tillStrip").textContent=TILL; if($("tillFooter"))$("tillFooter").textContent=TILL; document.title=STORE_NAME;
  async function loadProducts(){
    try{
      if(API_BASE){
        const api=await fetch(`${API_BASE}/api/products?v=4`,{cache:"no-store"});
        if(api.ok){const data=await api.json(); if(Array.isArray(data)&&data.length){return data;}}
      }
    }catch(e){console.warn("Backend catalogue unavailable; falling back to products.json",e);}
    const r=await fetch("products.json?v=4",{cache:"no-store"});
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    return r.json();
  }
  loadProducts().then(d=>{products=Array.isArray(d)?d:[];categories();render();renderCart();}).catch(e=>{console.error(e);$("count").textContent="Catalogue unavailable";$("grid").innerHTML="<div class='empty'>The catalogue could not be loaded. Please refresh the page.</div>";$ ("empty").hidden=true;});
});
