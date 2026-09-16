require("dotenv").config();
const express=require("express");
const cors=require("cors");
const axios=require("axios");

const app=express();
app.use(express.json());
app.use(cors({origin:(origin,cb)=>{if(!origin||/^https:\/\/[a-z0-9-]+\.github\.io$/.test(origin)||/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)||origin.startsWith("http://localhost")||origin.startsWith("http://127.0.0.1"))return cb(null,true);cb(new Error("CORS blocked"));}}));

const KEY=process.env.MPESA_CONSUMER_KEY?.trim();
const SECRET=process.env.MPESA_CONSUMER_SECRET?.trim();
const SHORTCODE=(process.env.MPESA_SHORTCODE||"8049446").trim();
const PASSKEY=process.env.MPESA_PASSKEY?.trim();
const CALLBACK=process.env.MPESA_CALLBACK_URL?.trim();
const ENV=(process.env.MPESA_ENV||"sandbox").trim().toLowerCase();
const TRANSACTION_TYPE=(process.env.MPESA_TRANSACTION_TYPE||"CustomerBuyGoodsOnline").trim();
const PORT=process.env.PORT||3000;
const BASE=ENV==="production"?"https://api.safaricom.co.ke":"https://sandbox.safaricom.co.ke";
const payments=new Map();

const configStatus=()=>({consumerKey:!!KEY,consumerSecret:!!SECRET,passkey:!!PASSKEY,callbackUrl:!!CALLBACK,shortcode:!!SHORTCODE,environment:ENV,transactionType:TRANSACTION_TYPE});

app.get("/",(_q,r)=>r.json({ok:true,service:"tiffas-backend",environment:ENV,mpesaConfigured:!!(KEY&&SECRET&&PASSKEY&&CALLBACK)}));
app.get("/api/mpesa/config",(_q,r)=>r.json(configStatus()));

async function token(){
  const r=await axios.get(`${BASE}/oauth/v1/generate`,{
    params:{grant_type:"client_credentials"},
    auth:{username:KEY,password:SECRET},
    headers:{Accept:"application/json"},
    timeout:20000
  });
  const access=r.data?.access_token;
  if(!access)throw new Error("Daraja OAuth returned no access token");
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
  const missing=Object.entries(cfg).filter(([k,v])=>["consumerKey","consumerSecret","passkey","callbackUrl"].includes(k)&&!v).map(([k])=>k);
  if(missing.length)return res.status(500).json({success:false,message:"M-Pesa environment variables are not configured on Render",missing});

  try{
    const t=stamp();
    const pwd=Buffer.from(`${SHORTCODE}${PASSKEY}${t}`).toString("base64");
    const accessToken=await token();
    const payload={
      BusinessShortCode:String(SHORTCODE),
      Password:pwd,
      Timestamp:t,
      TransactionType:TRANSACTION_TYPE,
      Amount:String(Math.round(Number(amount))),
      PartyA:String(phone),
      PartyB:String(SHORTCODE),
      PhoneNumber:String(phone),
      CallBackURL:CALLBACK,
      AccountReference:String(accountReference).slice(0,12),
      TransactionDesc:String(transactionDesc).slice(0,13)
    };

    console.log("Daraja STK request prepared",{
      base:BASE,
      businessShortCode:payload.BusinessShortCode,
      transactionType:payload.TransactionType,
      amount:payload.Amount,
      partyANormalized:payload.PartyA,
      partyB:payload.PartyB,
      phoneNumber:payload.PhoneNumber,
      callbackUrl:payload.CallBackURL,
      accountReference:payload.AccountReference,
      transactionDesc:payload.TransactionDesc,
      timestamp:payload.Timestamp,
      accessTokenPresent:!!accessToken,
      accessTokenLength:accessToken?.length||0
    });

    const r=await axios.post(`${BASE}/mpesa/stkpush/v1/processrequest`,payload,{
      headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json","Content-Type":"application/json"},
      timeout:25000
    });

    console.log("Daraja STK response",{
      httpStatus:r.status,
      responseCode:r.data?.ResponseCode,
      responseDescription:r.data?.ResponseDescription,
      errorCode:r.data?.errorCode,
      errorMessage:r.data?.errorMessage,
      merchantRequestId:r.data?.MerchantRequestID||null,
      checkoutRequestId:r.data?.CheckoutRequestID||null
    });

    if(r.data.ResponseCode!=="0")return res.status(400).json({success:false,message:r.data.ResponseDescription||"STK request failed"});
    payments.set(r.data.CheckoutRequestID,{status:"pending",createdAt:Date.now(),phone,amount});
    res.json({success:true,checkoutRequestId:r.data.CheckoutRequestID,merchantRequestId:r.data.MerchantRequestID});
  }catch(e){
    const d=e.response?.data;
    console.error("Daraja STK failed",{
      httpStatus:e.response?.status||null,
      providerCode:d?.errorCode||null,
      providerMessage:d?.errorMessage||null,
      responseDescription:d?.ResponseDescription||null,
      responseCode:d?.ResponseCode||null,
      message:e.message
    });
    res.status(500).json({
      success:false,
      message:d?.errorMessage||d?.ResponseDescription||"Could not reach M-Pesa",
      stage:d?.errorMessage?"stk":(e.message.includes("OAuth")?"oauth":"request"),
      httpStatus:e.response?.status||null,
      providerCode:d?.errorCode||null
    });
  }
});

app.post("/api/mpesa/callback",(req,res)=>{
  const cb=req.body?.Body?.stkCallback;
  if(cb){
    const p=payments.get(cb.CheckoutRequestID);
    if(p){
      if(cb.ResultCode===0){const item=cb.CallbackMetadata?.Item||[];p.status="completed";p.receipt=item.find(x=>x.Name==="MpesaReceiptNumber")?.Value||"N/A"}
      else{p.status="failed";p.message=cb.ResultDesc||"Payment failed"}
    }
  }
  res.json({ResultCode:0,ResultDesc:"Accepted"});
});

app.get("/api/mpesa/status/:id",(req,res)=>{
  const p=payments.get(req.params.id);
  if(!p)return res.json({status:"pending"});
  if(p.status==="completed")return res.json({status:"completed",receipt:p.receipt});
  if(p.status==="failed")return res.json({status:"failed",message:p.message});
  if(Date.now()-p.createdAt>300000){p.status="failed";p.message="Payment request timed out";return res.json({status:"failed",message:p.message})}
  res.json({status:"pending"});
});

app.listen(PORT,"0.0.0.0",()=>console.log(`TIFFAS backend listening on ${PORT}`));
