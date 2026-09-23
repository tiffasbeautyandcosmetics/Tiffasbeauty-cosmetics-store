require("dotenv").config();
const express=require("express");
const cors=require("cors");
const axios=require("axios");
const fs=require("fs");
const path=require("path");
const {Pool}=require("pg");

const app=express();
app.use(express.json({limit:"20mb"}));

app.use(cors({
  origin:(origin,cb)=>{
    if(!origin||/^https:\/\/[a-z0-9-]+\.github\.io$/.test(origin)||/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)||origin.startsWith("http://localhost")||origin.startsWith("http://127.0.0.1")) return cb(null,true);
    cb(new Error("CORS blocked"));
  }
}));

const KEY=process.env.MPESA_CONSUMER_KEY?.trim(),
  SECRET=process.env.MPESA_CONSUMER_SECRET?.trim(),
  SHORTCODE=(process.env.MPESA_SHORTCODE||"").trim(),
  TILL=(process.env.MPESA_TILL||"8049446").trim(),
  PASSKEY=process.env.MPESA_PASSKEY?.trim(),
  CALLBACK=process.env.MPESA_CALLBACK_URL?.trim(),
  ENV=(process.env.MPESA_ENV||"sandbox").trim().toLowerCase(),
  TRANSACTION_TYPE=(process.env.MPESA_TRANSACTION_TYPE||"CustomerBuyGoodsOnline").trim(),
  ADMIN_TOKEN=process.env.ADMIN_TOKEN?.trim()||"",
  PORT=process.env.PORT||3000;

const BASE=ENV==="production"?"https://api.safaricom.co.ke":"https://sandbox.safaricom.co.ke";
const payments=new Map();
const CATALOG_DIR=path.join(__dirname,"..","catalog");

function readCatalogFile(file){
  try{
    const parsed=JSON.parse(fs.readFileSync(file,"utf8"));
    return Array.isArray(parsed)?parsed:null;
  }catch(_){ return null; }
}
function readChunkCatalog(){
  try{
    if(!fs.existsSync(CATALOG_DIR)) return null;
    const files=fs.readdirSync(CATALOG_DIR).filter(f=>/^chunk-\d+\.json$/i.test(f)).sort();
    if(!files.length) return null;
    const all=[];
    for(const file of files){
      const part=readCatalogFile(path.join(CATALOG_DIR,file));
      if(Array.isArray(part)) all.push(...part);
    }
    return all.length?all:null;
  }catch(_){ return null; }
}
let catalog=readChunkCatalog()||[];
let catalogRevision=1;
let dbPool=null;
let dbReady=false;

async function initDatabase(){
  if(!DATABASE_URL) return false;
  dbPool=new Pool({
    connectionString:DATABASE_URL,
    max:5,
    idleTimeoutMillis:10000,
    connectionTimeoutMillis:10000
  });
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS catalog_products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const countResult=await dbPool.query("SELECT COUNT(*)::int AS count FROM catalog_products");
  if(countResult.rows[0].count===0 && catalog.length){
    await dbPool.query("BEGIN");
    try{
      for(const p of catalog){
        await dbPool.query(
          "INSERT INTO catalog_products (id,data) VALUES ($1,$2::jsonb)",
          [String(p.id),JSON.stringify(p)]
        );
      }
      await dbPool.query("COMMIT");
    }catch(e){
      await dbPool.query("ROLLBACK");
      throw e;
    }
  }
  const rows=await dbPool.query("SELECT data FROM catalog_products ORDER BY id");
  catalog=rows.rows.map(r=>r.data);
  catalogRevision=1;
  dbReady=true;
  return true;
}

async function persistCatalog(nextCatalog){
  if(!dbPool || !dbReady) throw new Error("DATABASE_URL is not configured or database is unavailable");
  await dbPool.query("BEGIN");
  try{
    await dbPool.query("TRUNCATE TABLE catalog_products");
    for(const p of nextCatalog){
      const id=String(p.id || "");
      if(!id) continue;
      await dbPool.query(
        "INSERT INTO catalog_products (id,data,updated_at) VALUES ($1,$2::jsonb,NOW())",
        [id,JSON.stringify(p)]
      );
    }
    await dbPool.query("COMMIT");
    catalog=nextCatalog;
    catalogRevision+=1;
  }catch(e){
    await dbPool.query("ROLLBACK");
    throw e;
  }
}

async function loadCatalogFromDatabase(){
  if(!dbPool || !dbReady) return false;
  const rows=await dbPool.query("SELECT data FROM catalog_products ORDER BY id");
  catalog=rows.rows.map(r=>r.data);
  return true;
}

const configStatus=()=>({
  consumerKey:!!KEY,
  consumerSecret:!!SECRET,
  passkey:!!PASSKEY,
  callbackUrl:!!CALLBACK,
  shortcode:!!SHORTCODE,
  till:!!TILL,
  environment:ENV,
  transactionType:TRANSACTION_TYPE
});

app.get("/",(_q,r)=>r.json({
  ok:true,
  service:"tiffas-backend",
  environment:ENV,
  mpesaConfigured:!!(KEY&&SECRET&&PASSKEY&&CALLBACK&&SHORTCODE),
  catalogCount:catalog.length,
  catalogSource:"github-catalog-chunks",
  catalogRevision,
  persistentStorage:dbReady
}));

app.get("/api/mpesa/config",(_q,r)=>r.json(configStatus()));
app.get("/api/admin/storage",requireAdmin,(_q,r)=>r.json({persistent:dbReady,catalogCount:catalog.length,revision:catalogRevision}));
app.get("/api/products",async(_q,r)=>{try{await loadCatalogFromDatabase();}catch(e){console.error("Database catalogue read failed:",e.message)}r.set("Cache-Control","no-store");r.set("X-Catalog-Revision",String(catalogRevision));r.json(catalog);});
app.get("/admin",(_q,res)=>res.sendFile(path.join(__dirname,"admin.html")));

function requireAdmin(req,res,next){
  if(!ADMIN_TOKEN) return res.status(503).json({success:false,message:"ADMIN_TOKEN is not configured on Render. Use the Export button in the admin panel, or add ADMIN_TOKEN in Render Environment."});
  const supplied=String(req.get("x-admin-token")||"").trim();
  if(!supplied||supplied!==ADMIN_TOKEN) return res.status(401).json({success:false,message:"Invalid admin token"});
  next();
}

app.put("/api/admin/products",requireAdmin,async(req,res)=>{
  const nextCatalog=req.body?.products;
  if(!Array.isArray(nextCatalog)) return res.status(400).json({success:false,message:"products must be an array"});
  if(nextCatalog.length>2000) return res.status(400).json({success:false,message:"Too many products"});
  try{
    await persistCatalog(nextCatalog);
    res.json({success:true,count:catalog.length,revision:catalogRevision,persistent:true,message:"Catalogue saved permanently to PostgreSQL"});
  }catch(e){
    console.error("Persistent catalogue save failed:",e.message);
    res.status(503).json({success:false,message:"Catalogue database is not available"});
  }
});

app.post("/api/admin/reset-products",requireAdmin,async(_req,res)=>{
  const base=readChunkCatalog()||[];
  try{
    await persistCatalog(base);
    res.json({success:true,count:catalog.length,revision:catalogRevision,persistent:true,message:"Catalogue restored from GitHub source and saved to PostgreSQL"});
  }catch(e){
    console.error("Persistent catalogue reset failed:",e.message);
    res.status(503).json({success:false,message:"Catalogue database is not available"});
  }
});

async function token(){
  const r=await axios.get(`${BASE}/oauth/v1/generate`,{params:{grant_type:"client_credentials"},auth:{username:KEY,password:SECRET},headers:{Accept:"application/json"},timeout:20000});
  const access=r.data?.access_token;
  if(!access) throw new Error("Daraja OAuth returned no access token");
  return access;
}

app.get("/api/mpesa/token-test",async(_q,res)=>{
  try{
    if(!KEY||!SECRET)return res.status(500).json({success:false,stage:"config",message:"Consumer key or consumer secret is missing"});
    const access=await token();
    res.json({success:true,stage:"oauth",environment:ENV,tokenReceived:!!access,tokenLength:access.length});
  }catch(e){
    const d=e.response?.data;
    console.error("Daraja OAuth test failed:",d||e.message);
    res.status(502).json({success:false,stage:"oauth",environment:ENV,httpStatus:e.response?.status||null,providerCode:d?.errorCode||d?.error||null,providerMessage:d?.errorMessage||d?.message||null,message:"Daraja OAuth token generation failed"});
  }
});

function stamp(){const d=new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds())}

app.post("/api/mpesa/stkpush",async(req,res)=>{
  const {phone,amount,accountReference="TIFFAS",transactionDesc="Beauty order"}=req.body;
  if(!phone||!amount)return res.status(400).json({success:false,message:"phone and amount are required"});
  const cfg=configStatus();
  const missing=Object.entries(cfg).filter(([k,v])=>["consumerKey","consumerSecret","passkey","callbackUrl","shortcode"].includes(k)&&!v).map(([k])=>k);
  if(missing.length)return res.status(500).json({success:false,message:"M-Pesa environment variables are not configured on Render",missing});
  try{
    const partyA=String(phone).replace(/\D/g,"");
    const t=stamp();
    const pwd=Buffer.from(`${SHORTCODE}${PASSKEY}${t}`).toString("base64");
    const accessToken=await token();
    const payload={BusinessShortCode:SHORTCODE,Password:pwd,Timestamp:t,TransactionType:TRANSACTION_TYPE,Amount:String(Math.max(1,Math.round(Number(amount)))),PartyA:partyA,PartyB:TILL,PhoneNumber:partyA,CallBackURL:CALLBACK,AccountReference:String(accountReference).slice(0,12),TransactionDesc:String(transactionDesc).slice(0,13)};
    console.log("Daraja STK request prepared",{base:BASE,businessShortCode:SHORTCODE,till:TILL,transactionType:TRANSACTION_TYPE,amount:payload.Amount,partyANormalized:partyA,partyB:TILL,phoneNumber:partyA,callbackUrl:CALLBACK,accountReference:payload.AccountReference,transactionDesc:payload.TransactionDesc,timestamp:t,accessTokenPresent:!!accessToken,accessTokenLength:accessToken.length});
    const r=await axios.post(`${BASE}/mpesa/stkpush/v1/processrequest`,payload,{headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json","Content-Type":"application/json"},timeout:25000});
    if(r.data.ResponseCode!=="0")return res.status(400).json({success:false,message:r.data.ResponseDescription||"STK request failed"});
    payments.set(r.data.CheckoutRequestID,{status:"pending",createdAt:Date.now(),phone:partyA,amount});
    res.json({success:true,checkoutRequestId:r.data.CheckoutRequestID,merchantRequestId:r.data.MerchantRequestID});
  }catch(e){
    const d=e.response?.data;
    console.error("Daraja STK failed",{httpStatus:e.response?.status||null,providerCode:d?.errorCode||null,providerMessage:d?.errorMessage||null,responseDescription:d?.ResponseDescription||null,responseCode:d?.ResponseCode||null,message:e.message});
    res.status(500).json({success:false,message:d?.errorMessage||d?.ResponseDescription||"Could not reach M-Pesa",stage:d?.errorMessage?"stk":(e.message.includes("OAuth")?"oauth":"request")});
  }
});

app.post("/api/mpesa/callback",(req,res)=>{const cb=req.body?.Body?.stkCallback;if(cb){const p=payments.get(cb.CheckoutRequestID);if(p){if(cb.ResultCode===0){const item=cb.CallbackMetadata?.Item||[];p.status="completed";p.receipt=item.find(x=>x.Name==="MpesaReceiptNumber")?.Value||"N/A"}else{p.status="failed";p.message=cb.ResultDesc||"Payment failed"}}}res.json({ResultCode:0,ResultDesc:"Accepted"})});
app.get("/api/mpesa/status/:id",(req,res)=>{const p=payments.get(req.params.id);if(!p)return res.json({status:"pending"});if(p.status==="completed")return res.json({status:"completed",receipt:p.receipt});if(p.status==="failed")return res.json({status:"failed",message:p.message});if(Date.now()-p.createdAt>300000){p.status="failed";p.message="Payment request timed out";return res.json({status:"failed",message:p.message})}res.json({status:"pending"})});
(async()=>{
  try{
    await initDatabase();
    if(dbReady) console.log(`TIFFAS persistent catalogue ready with ${catalog.length} products`);
  }catch(e){
    console.error("Catalogue database initialization failed:",e.message);
  }
  app.listen(PORT,"0.0.0.0",()=>console.log(`TIFFAS backend listening on ${PORT}`));
})();
