// DOM behavior test (not a substitute for browser layout/WebWorker validation).
// Requires jsdom; use JSDOM_PATH if it is installed outside this project.
import {createRequire} from 'node:module';import fs from 'node:fs';import assert from 'node:assert/strict';import {Worker as Thread} from 'node:worker_threads';
const require=createRequire(import.meta.url);const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const dom=new JSDOM(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.org/strategy-lab/'});
const win=dom.window;globalThis.document=win.document;globalThis.addEventListener=win.addEventListener.bind(win);globalThis.matchMedia=()=>({matches:false});globalThis.ResizeObserver=class{observe(){}};
win.HTMLCanvasElement.prototype.getContext=()=>({scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},setLineDash(){}});
class Worker{constructor(url){this.w=new Thread(new URL('./node-worker-bridge.cjs',import.meta.url),{workerData:{url:url.href}});this.w.on('message',data=>this.onmessage?.({data}));this.w.on('error',e=>this.onerror?.({message:e.message,preventDefault(){}}));}postMessage(d){this.w.postMessage(d);}terminate(){this.w.terminate();}}
globalThis.Worker=Worker;
const api={};document.modelContext={registerTool:tool=>{api[tool.name]=tool;}};
const $=id=>document.getElementById(id);const change=(id,val)=>{$(id).value=val;$(id).dispatchEvent(new win.Event('change'));};
const wait=async fn=>{const start=Date.now();while(!fn()){if(Date.now()-start>180000)throw Error('Timeout: '+$('status').textContent);await new Promise(r=>setTimeout(r,100));}};
await import('../js/app.js');assert.equal($('name-a').textContent,'Random');assert.match($('description-b').textContent,/prohibited/);assert.equal(Object.keys(api).length,2);
await assert.rejects(async()=>api.read_revealed_match.execute({bad:true}));
change('select-a','upload');const source='def space_exploration_strategy(h,r,m):\n assert len(h)==r-1\n return "S"';Object.defineProperty($('file-a'),'files',{configurable:true,value:[{name:'example_strategy.py',size:source.length,text:async()=>source}]});$('file-a').dispatchEvent(new win.Event('change'));await wait(()=>!$('run').disabled);assert.match($('source-a').textContent,/def space/);
change('select-b','always-keep');$('rounds').value='10';change('speed','1500');const result=await api.run_configured_match.execute({});assert.equal(result.status,'complete',$('status').textContent);$('play').click();assert.equal($('result-state').textContent,'WAITING FOR PLAYBACK');assert.equal(api.read_revealed_match.execute({}).revealed_rounds,0);
let exported;const original=URL.createObjectURL;URL.createObjectURL=blob=>{exported=blob;return original(blob);};win.HTMLAnchorElement.prototype.click=function(){};
$('round-csv').click();const csv=await exported.text();assert.equal(csv.trim().split('\r\n').length,11);assert.match(csv,/example_strategy.py/);
$('skip').click();assert.equal($('total-a').textContent,'10');assert.equal($('total-b').textContent,'50');assert.match($('analysis').textContent,/Strategy B wins/);assert.equal(api.read_revealed_match.execute({}).revealed_rounds,10);$('replay').click();$('play').click();$('next').click();assert.equal($('total-a').textContent,'1');$('skip').click();assert.equal($('total-a').textContent,'10');
// Changing setup must not alter existing results; same-seed rerun uses saved source/settings.
change('select-a','always-keep');$('rounds').value='20';$('same').click();await wait(()=>$('cancel').hidden);$('skip').click();assert.equal($('total-a').textContent,'10');assert.equal($('total-b').textContent,'50');assert.match($('snapshot').textContent,/10 rounds/);
$('summary-csv').click();assert.match(await exported.text(),/complete/);console.log('PASS UI uploads, snapshots, playback, CSV downloads, optional API registration and actions');
// Zero-round failures must export metadata but never announce a winner.
change('select-a','upload');const bad='import os';Object.defineProperty($('file-a'),'files',{configurable:true,value:[{name:'bad.py',size:bad.length,text:async()=>bad}]});$('file-a').dispatchEvent(new win.Event('change'));await wait(()=>!$('run').disabled);await api.run_configured_match.execute({});assert.equal($('result-state').textContent,'INCOMPLETE');assert.match($('analysis').textContent,/no winner/);assert.equal($('round-csv').disabled,false);console.log('PASS UI validation failure and zero-round export');
dom.window.close();
