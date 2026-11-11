// Cloudflare Worker: V3.5 AI tutor backend (not deployed)
// Secrets: OPENAI_API_KEY, FAMILY_ACCESS_TOKEN
// Vars: ALLOWED_ORIGIN (exact GitHub Pages origin, e.g. https://starfly168-lin.github.io)
const reply=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}});
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=env.ALLOWED_ORIGIN&&origin===env.ALLOWED_ORIGIN;
  if(request.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers:allowed?{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, authorization','access-control-max-age':'600'}:{}});
  if(!allowed)return reply({error:'Origin not allowed'},403);
  if(new URL(request.url).pathname!=='/api/tutor'||request.method!=='POST')return reply({error:'Not found'},404,origin);
  const token=request.headers.get('Authorization')||'';
  if(!env.FAMILY_ACCESS_TOKEN||token!==('Bearer '+env.FAMILY_ACCESS_TOKEN))return reply({error:'Unauthorized'},401,origin);
  if(!env.OPENAI_API_KEY)return reply({error:'AI service not configured'},503,origin);
  const length=Number(request.headers.get('content-length')||0);
  if(length>12000)return reply({error:'Request too large'},413,origin);
  let data;try{data=await request.json()}catch{return reply({error:'Invalid JSON'},400,origin)}
  const {grade,question,studentAnswer,studentThought,stage}=data||{};
  if(!['7','8'].includes(String(grade))||typeof question!=='string'||question.length>3000||typeof studentAnswer!=='string'||studentAnswer.length>1000||typeof studentThought!=='string'||studentThought.length>1500||!['hint','review','verify'].includes(stage))return reply({error:'Invalid input'},400,origin);
  const instructions='你是台灣國中數學家教。學生為國'+(grade==='7'?'一':'二')+'。一次只講一個觀念，先詢問學生思路；答錯先給提示而非答案；語氣尊重、不責備。若階段為verify，給一題同觀念但數字不同的變化題，不要附答案。若階段為review，分析錯誤並引導學生自己訂正。禁止索取姓名、學校或聯絡方式。';
  try{
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),18000);
   let upstream;
   try{upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',instructions,input:JSON.stringify({question,studentAnswer,studentThought,stage}),max_output_tokens:400,store:false}),signal:controller.signal})}finally{clearTimeout(timeout)}
   if(!upstream.ok)return reply({error:'AI temporarily unavailable'},502,origin);
   const result=await upstream.json();const answer=(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
   return reply({answer:answer||'目前無法產生提示，請稍後重試。'},200,origin);
  }catch{return reply({error:'AI request timed out'},504,origin)}
 }
};