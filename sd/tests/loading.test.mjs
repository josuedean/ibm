import assert from 'node:assert/strict';import {MatchEngine} from '../js/engine.js';
let mode='fail';
globalThis.Worker=class{constructor(){if(mode==='fail')queueMicrotask(()=>this.onmessage?.({data:{fatal:'Python runtime could not load. Check your internet connection and access to cdn.jsdelivr.net, then retry.'}}));}terminate(){}postMessage(){}};
const s={source:'',filename:'test.py'},settings={a:s,b:s,rounds:10,seed:'test'};
const failed=await new MatchEngine().run(settings);assert.equal(failed.status,'incomplete');assert.match(failed.error,/runtime could not load/);assert.equal(failed.rows.length,0);
mode='stall';const e=new MatchEngine();const result=e.run(settings);queueMicrotask(()=>e.cancel());const cancelled=await result;assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.rows.length,0);console.log('PASS runtime-load failure and cancellation while loading');
