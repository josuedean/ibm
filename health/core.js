export const VERSION = '1.0.0';
export const TYPES = { strength: 'Repetitions', timed: 'Timed hold', carry: 'Carry', cardio: 'Cardio' };
export const BASES = { plates: 'Plates only · bar excluded', dumbbell: 'Per dumbbell', perArm: 'Per arm', machine: 'Machine stack / total plates', added: 'Added weight', bodyweight: 'Body weight' };
export const GROUPS = ['Push', 'Pull', 'Legs', 'Core', 'Carry', 'Cardio', 'Other'];
export const DEFAULT_GOAL = { id:'preferences', gainKg:5, deadline:'2026-12-15', baselineKg:null, weeklyTarget:2 };
export const clone = v => JSON.parse(JSON.stringify(v));
export const uid = () => globalThis.crypto?.randomUUID?.() || 'sb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,12);
export const normalize = s => String(s || '').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const numberOrNull = value => value === '' || value == null ? null : Number.isFinite(Number(value)) ? Number(value) : null;
export const formatNumber = (v, decimals=1) => v == null ? '—' : Number(v).toLocaleString(undefined,{maximumFractionDigits:decimals});
export function today() {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
}
export function dateLabel(date, opts={}) {
  return date ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',...opts}).format(new Date(date+'T12:00:00')) : 'Date not recorded';
}
export function emptyState() {
  return {schemaVersion:1,exercises:[],sessions:[],measurements:[],settings:[],pending:[],conflicts:[],activeSessionId:null,lastSync:null};
}
export function resolveExercise(exercises,id) {
  let e = exercises.find(x=>x.id===id), seen=new Set();
  while(e?.redirectId && !seen.has(e.id)) { seen.add(e.id); e=exercises.find(x=>x.id===e.redirectId)||e; }
  return e;
}
export function findExercise(exercises,name) {
  const n=normalize(name);
  const e=exercises.find(x=>normalize(x.name)===n || (x.aliases||[]).some(a=>normalize(a)===n));
  return e ? resolveExercise(exercises,e.id) : null;
}
export function exerciseForEntry(state,entry) { return resolveExercise(state.exercises,entry.exerciseId) || entry; }
export function completedSets(session) { return (session.entries||[]).flatMap(e=>e.sets||[]).filter(s=>s.completed); }
export function completedExercises(session) { return (session.entries||[]).filter(e=>(e.sets||[]).some(s=>s.completed)).length; }
export function guessExercise(name) {
  const n=normalize(name);
  let type=/carry|walk/.test(n)?'carry':/run|treadmill|bike|cycle|elliptical|rowing erg/.test(n)?'cardio':/isometric|hang|plank|hold/.test(n)?'timed':'strength';
  let loadBasis=/dumbbell/.test(n)?'dumbbell':/carry/.test(n)?'perArm':/barbell|smith|romanian|t-bar/.test(n)?'plates':/machine|cable|pulldown|hack|leg press|leg curl|leg extension/.test(n)?'machine':/dip|push-up|hang|plank|isometric/.test(n)?'bodyweight':'added';
  let group=type==='cardio'?'Cardio':type==='carry'?'Carry':/squat|deadlift|leg |calf/.test(n)?'Legs':/row|curl|pull/.test(n)&&!/triceps|pushdown/.test(n)?'Pull':/press|fly|dip|triceps|raise|push-up/.test(n)?'Push':/hang|core|back extension|plank/.test(n)?'Core':'Other';
  return {type,loadBasis,group};
}
export function blankSet(previous={}) {
  return {id:uid(),loadKg:previous.loadKg??null,reps:previous.reps??null,seconds:previous.seconds??null,distanceM:previous.distanceM??null,speedKmh:previous.speedKmh??null,incline:previous.incline??null,failure:false,kind:'work',completed:false,estimated:false};
}
export function queueRecord(state,entity,payload) {
  const key=entity+':'+payload.id, existing=state.pending.find(o=>o.key===key);
  const op={key,entity,id:payload.id,baseRevision:existing?.baseRevision??payload._rev??0,mutationId:uid(),payload:clone(payload)};
  delete op.payload._rev; delete op.payload.updatedAt; delete op.payload.lastMutationId;
  state.pending=state.pending.filter(o=>o.key!==key); state.pending.push(op);
  // An edit after a detected conflict is still a conflict until the user chooses a version.
  return op;
}
const collection = e => ({session:'sessions',measurement:'measurements',exercise:'exercises',settings:'settings'}[e]);
export function mergeSync(state,response,sent=[]) {
  for(const ack of response.applied||[]) {
    const key=ack.entity+':'+ack.id, current=state.pending.find(o=>o.key===key), old=sent.find(o=>o.key===key);
    if(current && old && current.mutationId===old.mutationId) state.pending=state.pending.filter(o=>o.key!==key);
    else if(current && old) current.baseRevision=ack.revision;
    state.conflicts=state.conflicts.filter(c=>c.key!==key);
  }
  for(const c of response.conflicts||[]) {
    const key=c.entity+':'+c.id;
    state.conflicts=state.conflicts.filter(x=>x.key!==key); state.conflicts.push({...c,key});
  }
  if(response.snapshot) {
    for(const k of ['sessions','exercises','measurements','settings']) state[k]=clone(response.snapshot[k]||[]);
    for(const op of state.pending) {
      const k=collection(op.entity); if(!k) continue;
      const current=state[k].find(x=>x.id===op.id);
      const value={...clone(op.payload),_rev:op.baseRevision,updatedAt:current?.updatedAt||null};
      const index=state[k].findIndex(x=>x.id===op.id); if(index<0)state[k].push(value);else state[k][index]=value;
    }
    // Keep locally created exercise definitions available until their session is accepted.
    for(const op of state.pending.filter(o=>o.entity==='session')) for(const e of op.payload.entries||[]) {
      if(!state.exercises.some(x=>x.id===e.exerciseId) && (e.sets||[]).some(s=>s.completed)) state.exercises.push({id:e.exerciseId,name:e.name,type:e.type,loadBasis:e.loadBasis,group:e.group,aliases:[],_rev:0});
    }
  }
  state.lastSync=new Date().toISOString();
  return state;
}
export function validateSet(set,type) {
  for(const key of ['loadKg','reps','seconds','distanceM','speedKmh','incline']) {
    const v=set[key]; if(v!=null && (!Number.isFinite(v)||v<0)) return 'Enter a valid, non-negative number.';
  }
  if(set.reps!=null&&!Number.isInteger(set.reps)) return 'Repetitions must be a whole number.';
  if(type==='strength' && !(set.reps>0)) return 'Enter repetitions before completing this set.';
  if(type==='timed' && !(set.seconds>0)) return 'Enter a hold duration before completing this set.';
  if(type==='carry' && !(set.distanceM>0||set.seconds>0)) return 'Enter a distance or duration before completing this carry.';
  if(type==='cardio' && !(set.seconds>0||set.distanceM>0)) return 'Enter a duration or distance before completing this activity.';
  return null;
}
export function sessionSummary(s) { return `${completedExercises(s)} exercises · ${completedSets(s).length} completed sets`; }
export function previousEntry(state,exerciseId,currentId) {
  const target=resolveExercise(state.exercises,exerciseId)?.id||exerciseId;
  const current=state.sessions.find(s=>s.id===currentId);
  for(const s of [...state.sessions].reverse().filter(s=>!s.deleted&&s.id!==currentId&&(!current?.date||!s.date||s.date<=current.date)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.finishedAt||b.startedAt||'').localeCompare(a.finishedAt||a.startedAt||''))) {
    const e=(s.entries||[]).find(e=>(resolveExercise(state.exercises,e.exerciseId)?.id||e.exerciseId)===target&&(e.sets||[]).some(x=>x.completed));
    if(e) return {session:s,entry:e};
  }
  return null;
}
export function setDescription(s,e) {
  const parts=[];
  if(s.loadKg!=null)parts.push(`${formatNumber(s.loadKg)} kg${e.loadBasis==='dumbbell'?' / DB':e.loadBasis==='perArm'?' / arm':e.loadBasis==='plates'?' plates':''}`);
  else if(e.loadBasis==='bodyweight')parts.push('BW');
  if(s.reps!=null)parts.push(`${s.reps} reps`);
  if(s.seconds!=null)parts.push(s.seconds>=60?`${formatNumber(s.seconds/60)} min`:`${formatNumber(s.seconds)} sec`);
  if(s.distanceM!=null)parts.push(`${formatNumber(s.distanceM)} m`);
  if(s.speedKmh!=null)parts.push(`${formatNumber(s.speedKmh)} km/h`);
  return parts.join(' × ')||'Details not recorded';
}
export function exerciseSeries(state,id,metric='load',includeEstimated=true) {
  const target=resolveExercise(state.exercises,id)?.id||id, points=[];
  for(const s of state.sessions.filter(s=>!s.deleted&&s.status==='completed'&&s.date)) {
    const sets=(s.entries||[]).filter(e=>(resolveExercise(state.exercises,e.exerciseId)?.id||e.exerciseId)===target).flatMap(e=>(e.sets||[])).filter(x=>x.completed&&(includeEstimated||!x.estimated));
    let candidates=sets.filter(x=>metric==='sets'||x[{load:'loadKg',reps:'reps',duration:'seconds',distance:'distanceM'}[metric]]!=null);
    if(!candidates.length)continue;
    let value=metric==='sets'?candidates.length:Math.max(...candidates.map(x=>x[{load:'loadKg',reps:'reps',duration:'seconds',distance:'distanceM'}[metric]]));
    points.push({date:s.date,value,estimated:candidates.some(x=>x.estimated),label:s.label||dateLabel(s.date)});
  }
  return points.sort((a,b)=>a.date.localeCompare(b.date));
}
export function measurementSeries(state,key) {
  return state.measurements.filter(m=>!m.deleted&&m.date&&m[key]!=null).map(m=>({date:m.date,value:m[key],label:dateLabel(m.date)})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function weeklySeries(state,weeks=8,now=today()) {
  const end=new Date(now+'T12:00:00Z'), day=(end.getUTCDay()+6)%7; end.setUTCDate(end.getUTCDate()-day);
  const result=[];
  for(let i=weeks-1;i>=0;i--) {
    const d=new Date(end); d.setUTCDate(d.getUTCDate()-i*7);const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+7);const next=d.toISOString().slice(0,10);
    result.push({date:start,label:dateLabel(start),value:state.sessions.filter(s=>!s.deleted&&s.status==='completed'&&completedSets(s).length>0&&s.date>=start&&s.date<next).length});
  }
  return result;
}
export function goalProgress(state) {
  const goal={...DEFAULT_GOAL,...state.settings.find(x=>x.id==='preferences'&&!x.deleted)}, series=measurementSeries(state,'skeletalMuscleKg');
  const baseline=goal.baselineKg??series[0]?.value, latest=series.at(-1)?.value;
  return {goal,baseline,latest,change:baseline!=null&&latest!=null?latest-baseline:null,baselineDate:goal.baselineKg!=null?null:series[0]?.date};
}
