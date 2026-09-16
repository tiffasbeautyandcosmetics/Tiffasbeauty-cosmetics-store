const C = window.TIFFAS_CONFIG || {};
const STORE_NAME = C.STORE_NAME || "TIFFAS BEAUTY AND COSMETICS";
const API_BASE = (C.API_BASE || "").replace(/\/$/, "");
const WHATSAPP = C.WHATSAPP_NUMBER || "254725679016";
const TILL = C.MPESA_TILL || "8049446";
let products = [], category = "All", query = "";
let cart = JSON.parse(localStorage.getItem("tiffas_cart") || "[]");
let poll;

const $ = id => document.getElementById(id);
const money = n => `Ksh ${Number(n || 0).toLocaleString("en-KE")}`;
const esc = s => String(s ?? "").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const wa = text => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const save = () => localStorage.setItem("tiffas_cart", JSON.stringify(cart));
const subtotal = () => cart.reduce((s, i) => s + Number(i.price || 0) * i.qty, 0);

function toast(msg){ $("toast").textContent=msg; $("toast").hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>$("toast").hidden=true,2200); }
function card(p){
  const img = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : `<span class="placeholder">${esc((p.name||"B").charAt(0))}</span>`;
  const price = p.price == null ? "Price on request" : money(p.price);
  return `<article class="card"><div class="card-media">${img}</div><div class="card-body"><small>${esc(p.category||"Beauty")}</small><h3>${esc(p.name)}</h3><strong>${price}</strong><div class="card-actions"><a class="mini-wa" href="${wa(`Hi TIFFAS BEAUTY AND COSMETICS! I'd like to order ${p.name}.`)}" target="_blank" rel="noopener">WhatsApp</a>${p.price != null ? `<button class="add" data-add="${esc(p.id)}">Add</button>` : ""}</div></div></article>`;
}
function render(){
  const term=query.trim().toLowerCase();
  const list=products.filter(p=>(category==="All"||p.category===category)&&(!term||String(p.name).toLowerCase().includes(term)));
  $("count").textContent=`Showing ${list.length} of ${products.length} products`;
  $("grid").innerHTML=list.map(card).join(""); $("empty").hidden=list.length>0;
}
function categories(){
  const cats=["All",...new Set(products.map(p=>p.category).filter(Boolean))];
  $("categories").innerHTML=cats.map(c=>`<button class="pill ${c===category?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
}
function renderCart(){
  $("cartBadge").hidden=cart.length===0; $("cartBadge").textContent=cart.reduce((s,i)=>s+i.qty,0); $("subtotal").textContent=money(subtotal());
  $("cartItems").innerHTML=cart.length?cart.map(i=>`<div class="cart-item"><div><b>${esc(i.name)}</b><small>${money(i.price)} × ${i.qty}</small></div><div class="qty"><button data-dec="${esc(i.id)}">−</button><span>${i.qty}</span><button data-inc="${esc(i.id)}">+</button></div></div>`).join(""):"<div class='empty'>Your cart is empty.</div>";
}
function openCart(){ $("cartDrawer").classList.add("open"); $("drawerOverlay").hidden=false; renderCart(); }
function closeCart(){ $("cartDrawer").classList.remove("open"); $("drawerOverlay").hidden=true; }
function openModal(){
  if(!cart.length)return toast("Your cart is empty.");
  $("modalOverlay").hidden=false;
  $("modalContent").innerHTML=`<h2 id="modalTitle">M-Pesa checkout</h2><p>Total: <b>${money(subtotal())}</b></p><label>Safaricom number<input id="phone" type="tel" placeholder="0725 679 016" autocomplete="tel"></label><button id="pay" class="btn primary full">Send M-Pesa prompt</button><p class="hint">You will receive the STK prompt on your phone.</p><div id="status"></div>`;
  $("pay").onclick=pay;
}
function closeModal(){clearInterval(poll);$("modalOverlay").hidden=true;}
function phone(v){let d=String(v).replace(/\D/g,"");if(d.startsWith("0"))d="254"+d.slice(1);if(d.length===9&&(d.startsWith("7")||d.startsWith("1")))d="254"+d;if(!/^254[17]\d{8}$/.test(d))return null;return d;}
async function pay(){
  const p=phone($("phone").value); if(!p)return $("status").textContent="Enter a valid Kenyan mobile number.";
  const btn=$("pay");btn.disabled=true;btn.textContent="Sending…";
  try{
    const r=await fetch(`${API_BASE}/api/mpesa/stkpush`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:p,amount:subtotal(),accountReference:"TIFFAS",transactionDesc:"Beauty order"})});
    const d=await r.json();if(!r.ok||!d.success)throw Error(d.message||"Payment request failed");
    $("status").textContent="STK prompt sent. Enter your M-Pesa PIN on your phone.";
    let elapsed=0;clearInterval(poll);poll=setInterval(async()=>{elapsed+=3;if(elapsed>90){clearInterval(poll);$("status").textContent="Timed out. You can retry or order through WhatsApp.";return;}try{const s=await fetch(`${API_BASE}/api/mpesa/status/${d.checkoutRequestId}`);const x=await s.json();if(x.status==="completed"){clearInterval(poll);$("status").innerHTML=`Payment received. Receipt: <b>${esc(x.receipt||"N/A")}</b>`;cart=[];save();renderCart();}else if(x.status==="failed"){clearInterval(poll);$("status").textContent=x.message||"Payment failed.";}}catch(e){}},3000);
  }catch(e){$("status").textContent=e.message+" You can pay manually via Till "+TILL+" or order on WhatsApp.";}finally{btn.disabled=false;btn.textContent="Send M-Pesa prompt";}
}
function cartMessage(){return `Hi ${STORE_NAME}! I'd like to order:\n\n${cart.map(i=>`• ${i.name} × ${i.qty} — ${money(i.price*i.qty)}`).join("\n")}\n\nTotal: ${money(subtotal())}`;}

$("search").oninput=e=>{query=e.target.value;render()};
$("categories").onclick=e=>{const b=e.target.closest("[data-cat]");if(!b)return;category=b.dataset.cat;categories();render()};
$("grid").onclick=e=>{const b=e.target.closest("[data-add]");if(!b)return;const p=products.find(x=>String(x.id)===String(b.dataset.add));if(!p)return;const i=cart.find(x=>String(x.id)===String(p.id));i?i.qty++:cart.push({id:p.id,name:p.name,price:p.price,qty:1});save();renderCart();toast("Added to cart")};
$("cartItems").onclick=e=>{const inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]");const id=(inc||dec)?.dataset[inc?"inc":"dec"];if(!id)return;const i=cart.find(x=>String(x.id)===String(id));if(!i)return;i.qty += inc?1:-1;if(i.qty<1)cart=cart.filter(x=>String(x.id)!==String(id));save();renderCart()};
$("cartOpen").onclick=openCart;$("cartClose").onclick=closeCart;$("drawerOverlay").onclick=closeCart;$("checkout").onclick=()=>{closeCart();openModal()};$("modalClose").onclick=closeModal;$("modalOverlay").onclick=e=>{if(e.target===$("modalOverlay"))closeModal()};
$("cartWhatsapp").onclick=()=>window.open(wa(cartMessage()),"_blank");
$("copyTill").onclick=async()=>{try{await navigator.clipboard.writeText(TILL);toast("Till number copied")}catch(e){toast(TILL)}};

["topWhatsapp","heroWhatsapp","footerWhatsapp"].forEach(id=>$(id).href=wa(`Hi ${STORE_NAME}! I'd like to know more about your products.`));$("footerWhatsapp").textContent="0725 679 016";$("tillHero").textContent=TILL;$("tillStrip").textContent=TILL;$("tillFooter").textContent=TILL;document.title=STORE_NAME;
fetch("products.json").then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{products=Array.isArray(d)?d:[];categories();render();renderCart()}).catch(()=>{$("grid").innerHTML="<div class='empty'>Products could not be loaded. Check products.json.</div>"});
