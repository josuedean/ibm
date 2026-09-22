import {scoreRound,sideSeed,RULES} from './rules.js';
export class PythonClient{
 constructor(label,onStage=()=>{}){
  this.label=label;this.pending=new Map();this.counter=0;this.closed=false;
  this.worker=new Worker(new URL('./worker.js',import.meta.url));
  this.ready=new Promise((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;});
  this.loadTimer=setTimeout(()=>this.stop('Runtime loading timed out after 60 seconds. Check your connection, then retry.'),60000);
  this.worker.onmessage=({data:d})=>{if(d.stage)onStage(`${label}: ${d.stage}`);if(d.ready){clearTimeout(this.loadTimer);this.readyResolve();}if(d.fatal)this.stop(d.fatal);if(d.id){const p=this.pending.get(d.id);if(p){clearTimeout(p.timer);this.pending.delete(d.id);d.error?p.reject(Error(`${label}: ${d.error}`)):p.resolve(d.value);}}};
  this.worker.onerror=e=>{e.preventDefault();this.stop('Worker failed: '+e.message);};
 }
 async call(data){await this.ready;if(this.closed)throw Error('Worker stopped');return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>this.stop(`${data.filename||this.filename} · round ${data.round||0} · execution timeout (2 seconds)`),2000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({...data,id});});}
 init(s,seed){this.filename=s.filename;return this.call({type:'init',source:s.source,filename:s.filename,seed});}
 stop(reason='Cancelled'){if(this.closed)return;this.closed=true;clearTimeout(this.loadTimer);this.worker.terminate();this.readyReject(Error(`${this.label}: ${reason}`));for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(`${this.label}: ${reason}`));}this.pending.clear();}
}
export class MatchEngine{
 constructor(){this.clients=[];this.cancelled=false;}
 cancel(){this.cancelled=true;this.clients.forEach(c=>c.stop('Cancelled by user'));}
 async run(settings,onProgress=()=>{},onStage=()=>{}){
  this.cancelled=false;
  const r={...structuredClone(settings),id:crypto.randomUUID(),timestamp:new Date().toISOString(),seed_a:sideSeed(settings.seed,'A'),seed_b:sideSeed(settings.seed,'B'),rows:[],status:'running',error:''};
  const create=()=>{if(this.cancelled)throw Error('Cancelled by user');return this.clients=['A','B'].map(side=>new PythonClient(side,onStage));};
  try{
   if(!Number.isInteger(r.rounds)||r.rounds<1||r.rounds>RULES.maxRounds)throw Error('Rounds must be 1–5000');
   // Validation runs in disposable interpreters. Real match starts in fresh workers.
   let clients=create();await Promise.all(clients.map((c,i)=>c.init(r[i?'b':'a'],r[i?'seed_b':'seed_a'])));clients.forEach(c=>c.stop());
   onStage('Both files validated. Starting fresh strategy states…');
   clients=create();await Promise.all(clients.map((c,i)=>c.init(r[i?'b':'a'],r[i?'seed_b':'seed_a'])));
   for(let round=1;round<=r.rounds;round++){
    if(this.cancelled)throw Error('Cancelled by user');
    const last=r.rows.at(-1);
    const [a,b]=await Promise.all(clients.map((c,i)=>c.call({type:'decide',round,previous:last?(i?[last.move_b,last.move_a]:[last.move_a,last.move_b]):null})));
    r.rows.push(scoreRound(a,b,last,round));
    if(round%10===0||round===r.rounds)onProgress(round,r.rounds);
   }
   r.status='complete';
  }catch(error){r.status=this.cancelled?'cancelled':'incomplete';r.error=error.message;}
  finally{this.clients.forEach(c=>c.stop());this.clients=[];}
  return r;
 }
}
