import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const req=(body,headers={})=>new Request('https://demo.test/api/evaluate',{method:'POST',headers,body:typeof body==='string'?body:JSON.stringify(body)});
const env={TYPESAFE_API_KEY:'test',RATE_LIMITER:{limit:async()=>({success:true})}};
test('rejects invalid and oversized inputs before model invocation',async()=>{
 for(const body of ['{',null,{scenario:'constructor',message:'hi'},{scenario:'support',message:' '},{scenario:'support',message:'x'.repeat(2001)}])assert.equal((await worker.fetch(req(body),env)).status,400);
 assert.equal((await worker.fetch(req('x'.repeat(16001)),env)).status,413);
});
test('blocks cross origin, missing config and excessive requests',async()=>{
 assert.equal((await worker.fetch(req({}, {Origin:'https://other.test'}),env)).status,403);
 assert.equal((await worker.fetch(req({}),{})).status,503);
 assert.equal((await worker.fetch(req({scenario:'support',message:'hi'}),{...env,RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
});
test('server owns questions and keeps credentials out of response',async()=>{
 const original=globalThis.fetch;let payload;
 globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.typesafe.ai/v1/systemone');payload=JSON.parse(init.body);assert.equal(init.headers.Authorization,'Bearer test');return Response.json({model:'jev-latest',answers:{route:{type:'choice'},signal:{type:'noul'},intensity:{type:'score'}},usage:{input_tokens:10,output_tokens:3}});};
 try{const res=await worker.fetch(req({scenario:'support',message:'hello',questions:{malicious:true}}),env);assert.equal(res.status,200);assert.equal(payload.model,'jev-latest');assert.equal(Object.keys(payload.questions).length,3);assert.equal(payload.questions.malicious,undefined);assert.ok(!(await res.text()).includes('Bearer'));}finally{globalThis.fetch=original;}
});
test('upstream errors are sanitized',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>new Response('secret diagnostic',{status:401});try{const res=await worker.fetch(req({scenario:'support',message:'hello'}),env);assert.equal(res.status,502);assert.ok(!(await res.text()).includes('secret diagnostic'));}finally{globalThis.fetch=original;}});
