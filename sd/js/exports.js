import {RULES} from './rules.js';
import {metrics,instructorMetrics} from './metrics.js';
export function metadata(r){const m={match_id:r.id,timestamp:r.timestamp,rules_version:RULES.version,metric_version:RULES.metricVersion,requested_rounds:r.rounds,master_seed:r.seed,seed_a:r.seed_a,seed_b:r.seed_b,resource_multiplier:RULES.multiplier,match_status:r.status,error:r.error||''};for(const side of ['a','b'])for(const key of ['id','name','team','faction','filename','hash'])m[`strategy_${side}_${key}`]=r[side][key]||'';return m;}
export function summaryRow(r){return {...metadata(r),...metrics(r.rows),winner:r.status==='complete'?(r.rows.at(-1).total_a===r.rows.at(-1).total_b?'draw':r.rows.at(-1).total_a>r.rows.at(-1).total_b?'A':'B'):'',...instructorMetrics(r.rows)};}
// Prefix dangerous text for spreadsheet formula safety; numeric values stay numeric.
export function csvCell(v){if(v===null||v===undefined)return '';let s=String(v);if(typeof v==='string'&&/^[=+\-@\t\r\n]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
export function csv(rows,headers=Object.keys(rows[0]||{})){return headers.join(',')+'\r\n'+rows.map(row=>headers.map(h=>csvCell(row[h])).join(',')).join('\r\n');}
export function roundCSV(r){return csv(r.rows.map(row=>({...metadata(r),...row})),[...Object.keys(metadata(r)),'round','move_a','move_b','outcome','points_a','points_b','total_a','total_b']);}
export function summaryCSV(r){return csv([summaryRow(r)]);}
export function download(name,content,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
