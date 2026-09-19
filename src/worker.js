import { scenarios } from '../public/scenarios.js';
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if(url.pathname!='/api/evaluate') return json({error:'找不到此 API。'},404);
  if(request.method!=='POST') return json({error:'請使用 POST。'},405);
  if(request.headers.get('Origin') && request.headers.get('Origin')!==url.origin) return json({error:'不接受跨網站請求。'},403);
  if(!env.TYPESAFE_API_KEY) return json({error:'尚未設定模型服務金鑰。'},503);
  if(Number(request.headers.get('Content-Length'))>16000) return json({error:'訊息過長。'},413);
  const reader=request.body?.getReader(); let text='',size=0; const decoder=new TextDecoder();
  if(!reader) return json({error:'請提供訊息。'},400);
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();return json({error:'訊息過長。'},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  let body;try{body=JSON.parse(text);}catch{return json({error:'無效的 JSON。'},400);}
  if(!body || !Object.hasOwn(scenarios,body.scenario) || typeof body.message!=='string' || !body.message.trim() || body.message.length>2000) return json({error:'請選擇情境，並輸入 1–2000 字的訊息。'},400);
  if(env.RATE_LIMITER){const limit=await env.RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'});if(!limit.success)return json({error:'操作太頻繁，請稍候一分鐘再試。'},429);}
  const start=Date.now();
  try {
   const upstream=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'jev-latest',state:{message:body.message.trim()},questions:scenarios[body.scenario].questions}),signal:AbortSignal.timeout(25000)});
   if(!upstream.ok) return json({error:upstream.status===429||upstream.status===529?'模型目前忙碌，請稍後再試。':'模型服務暫時無法完成請求，請稍後再試。'},upstream.status===429?429:502);
   const data=await upstream.json();
   if(!data.answers?.route || !data.answers?.signal || !data.answers?.intensity) return json({error:'模型回傳格式不完整。'},502);
   return json({...data,elapsed_ms:Date.now()-start});
  }catch(error){return json({error:error.name==='TimeoutError'?'模型回應逾時，請再試一次。':'連線失敗，請稍後重試。'},502);}
 }
};
