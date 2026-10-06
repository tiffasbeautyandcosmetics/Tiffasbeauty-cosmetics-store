(()=>{
const REPO="Tiffasbeautyandcosmetics/Tiffasbeauty-cosmetics-store";
const API="https://api.github.com";
let codes=[],editingIndex=-1;

function q(id){return document.getElementById(id)}
function esc(s){return String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
function money(n){return "Ksh "+Number(n||0).toLocaleString("en-KE",{maximumFractionDigits:2})}
function codeNorm(s){return String(s||"").trim().toUpperCase().replace(/\s+/g,"-")}
function context(){return window.TIFFAS_ADMIN_CONTEXT}
async function githubFile(path){const c=context();if(!c||typeof c.getFile!=="function")throw Error("Admin connection is not ready. Connect to GitHub first.");return c.getFile(path)}
async function put(path,content,sha,message){const c=context();if(!c||typeof c.putFile!=="function")throw Error("Admin connection is not ready. Connect to GitHub first.");return c.putFile(path,content,sha,message)}
function randomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="TIFFAS-";for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s}
function loadDefaults(){
 const now=new Date();now.setDate(now.getDate()+30);
 q("discountCode").value="";
 q("discountType").value="percent";
 q("discountValue").value="10";
 q("discountMin").value="0";
 q("discountUsage").value="0";
 q("discountExpiry").value=now.toISOString().slice(0,10);
 q("discountActive").checked=true;
 editingIndex=-1;
 q("discountSave").textContent="Create discount";
 q("discountCancel").hidden=true;
}
function fillForm(x){
 q("discountCode").value=x.code||"";
 q("discountType").value=x.type||"percent";
 q("discountValue").value=x.value??0;
 q("discountMin").value=x.minSubtotal??0;
 q("discountUsage").value=x.usageLimit??0;
 q("discountExpiry").value=x.expiresAt?String(x.expiresAt).slice(0,10):"";
 q("discountActive").checked=x.active!==false;
 q("discountSave").textContent="Update discount";
 q("discountCancel").hidden=false;
}
function render(){
 const body=q("discountRows"),empty=q("discountEmpty");if(!body)return;
 body.innerHTML=codes.map((x,i)=>{
   const kind=x.type==="percent"?Number(x.value||0)+"%":money(x.value);
   const usage=Number(x.usageLimit||0)>0?Number(x.usedCount||0)+" / "+Number(x.usageLimit):Number(x.usedCount||0)+" used";
   const expired=x.expiresAt&&new Date(String(x.expiresAt).length<=10?String(x.expiresAt)+"T23:59:59":x.expiresAt).getTime()<Date.now();
   const state=x.active===false?"Inactive":expired?"Expired":"Active";
   return "<tr><td><b>"+esc(x.code)+"</b><small>"+esc(x.id||"")+"</small></td><td>"+kind+"</td><td>"+money(x.minSubtotal||0)+"</td><td>"+usage+"</td><td>"+esc(x.expiresAt||"—")+"</td><td>"+esc(state)+"</td><td><div class="actions"><button class="btn light" data-discount-edit=""+i+"">Edit</button><button class="btn light" data-discount-toggle=""+i+"">"+(x.active===false?"Activate":"Deactivate")+"</button><button class="btn danger" data-discount-delete=""+i+"">Delete</button></div></td></tr>";
 }).join("");
 empty.hidden=codes.length>0;
}
async function loadOnline(){
 const f=await githubFile("catalog/discounts.json");
 codes=JSON.parse(f.content||"[]");if(!Array.isArray(codes))codes=[];
 render();
 const c=context();if(c)c.setStatus?.("Discount codes loaded: "+codes.length);
}
async function saveOnline(){
 const c=context();if(!navigator.onLine||!c?.isOnline?.()||!c?.hasToken?.())throw Error("Connect to GitHub before saving discount codes.");
 const code=codeNorm(q("discountCode").value);
 if(!code)return alert("Enter a discount code.");
 if(!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code))return alert("Use 3–40 characters: letters, numbers and hyphens only.");
 const type=q("discountType").value==="fixed"?"fixed":"percent";
 const value=Number(q("discountValue").value||0);
 const minSubtotal=Math.max(0,Number(q("discountMin").value||0));
 const usageLimit=Math.max(0,Math.floor(Number(q("discountUsage").value||0)));
 const expiry=q("discountExpiry").value.trim();
 if(value<=0)return alert("Discount value must be greater than zero.");
 if(type==="percent"&&value>100)return alert("Percentage discount cannot exceed 100%.");
 if(expiry&&!/^\d{4}-\d{2}-\d{2}$/.test(expiry))return alert("Expiry date is invalid.");
 const duplicate=codes.findIndex((x,i)=>i!==editingIndex&&codeNorm(x.code)===code);
 if(duplicate>=0)return alert("That discount code already exists.");
 const old=editingIndex>=0?codes[editingIndex]:{};
 const item={...old,id:old.id||code.toLowerCase().replace(/[^a-z0-9]+/g,"-"),code,type,value,minSubtotal,usageLimit,usedCount:Number(old.usedCount||0),expiresAt:expiry||null,active:q("discountActive").checked,createdAt:old.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 if(usageLimit>0&&item.usedCount>usageLimit)item.usedCount=usageLimit;
 if(item.usedCount<0)item.usedCount=0;
 editingIndex>=0?codes[editingIndex]=item:codes.unshift(item);
 const f=await githubFile("catalog/discounts.json");
 await put("catalog/discounts.json",JSON.stringify(codes,null,2)+"\n",f.sha,"Update TIFFAS discount codes");
 loadDefaults();render();alert("Discount code saved: "+code);
 if(c)c.setStatus?.("Discount code saved online.");
}
function wire(){
 q("discountGenerate").onclick=()=>{q("discountCode").value=randomCode();};
 q("discountSave").onclick=()=>saveOnline().catch(e=>alert(e.message));
 q("discountCancel").onclick=loadDefaults;
 q("discountReload").onclick=()=>loadOnline().catch(e=>alert(e.message));
 q("discountRows").onclick=async e=>{
   const edit=e.target.closest("[data-discount-edit]"),tog=e.target.closest("[data-discount-toggle]"),del=e.target.closest("[data-discount-delete]");
   if(edit){editingIndex=Number(edit.dataset.discountEdit);fillForm(codes[editingIndex]);window.scrollTo({top:q("discountPanel").offsetTop-20,behavior:"smooth"});return;}
   if(tog){const i=Number(tog.dataset.discountToggle),x=codes[i];if(!x)return;x.active=x.active===false;codes[i]=x;try{const f=await githubFile("catalog/discounts.json");await put("catalog/discounts.json",JSON.stringify(codes,null,2)+"\n",f.sha,"Toggle TIFFAS discount code");render();}catch(err){alert(err.message)}return;}
   if(del){const i=Number(del.dataset.discountDelete),x=codes[i];if(!x||!confirm("Delete discount code "+x.code+"?"))return;codes.splice(i,1);try{const f=await githubFile("catalog/discounts.json");await put("catalog/discounts.json",JSON.stringify(codes,null,2)+"\n",f.sha,"Delete TIFFAS discount code");render();}catch(err){alert(err.message)}}};
 q("discountPanel")?.addEventListener("click",e=>{});
 loadDefaults();
}
function mount(){
 const app=q("app");if(!app||q("discountPanel"))return;
 const s=document.createElement("section");s.id="discountPanel";s.className="card discount-panel";
 s.innerHTML='<div class=\"section-head\"><div><h2>Discount codes</h2><p>Create promo codes for students, campaigns, ambassadors and repeat customers. Codes are live on the customer checkout.</p></div><div class=\"actions\"><button id=\"discountReload\" class=\"btn light\">Reload codes</button></div></div><div class=\"formgrid\"><label>Code<input id=\"discountCode\" maxlength=\"40\" placeholder=\"e.g. UON10\"></label><label>Discount type<select id=\"discountType\"><option value=\"percent\">Percentage</option><option value=\"fixed\">Fixed KSh</option></select></label><label>Value<input id=\"discountValue\" type=\"number\" min=\"0\" step=\"0.01\"></label><label>Minimum order (KSh)<input id=\"discountMin\" type=\"number\" min=\"0\" step=\"1\"></label><label>Usage limit (0 = unlimited)<input id=\"discountUsage\" type=\"number\" min=\"0\" step=\"1\"></label><label>Expiry date<input id=\"discountExpiry\" type=\"date\"></label></div><label class=\"check\"><input id=\"discountActive\" type=\"checkbox\"> Active</label><div class=\"actions\"><button id=\"discountGenerate\" class=\"btn light\">Generate code</button><button id=\"discountSave\" class=\"btn primary\">Create discount</button><button id=\"discountCancel\" class=\"btn light\" hidden>Cancel edit</button></div><p class=\"hint\">Usage limits are enforced from the published code list. Because the storefront is GitHub Pages (static), redemption counts are not automatically written back to GitHub; update <b>Used</b> in the JSON/admin workflow when you confirm an order.</p><div class=\"table-wrap\"><table><thead><tr><th>Code</th><th>Discount</th><th>Minimum</th><th>Usage</th><th>Expiry</th><th>Status</th><th></th></tr></thead><tbody id=\"discountRows\"></tbody></table></div><div id=\"discountEmpty\" class=\"empty\">No discount codes created yet.</div>';
 app.querySelector(".catalogue-card")?.after(s);
 wire();
 setTimeout(()=>loadOnline().catch(()=>{}),600);
}
const timer=setInterval(()=>{if(q("app")&&!q("discountPanel")){mount();clearInterval(timer)}},250);
})();