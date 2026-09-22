export function metrics(rows){
 const n=rows.length, last=rows.at(-1), m={completed_rounds:n,total_a:last?.total_a||0,total_b:last?.total_b||0};
 const rate=k=>n?100*k/n:null;
 for(const outcome of ['SS','SK','KS','KK']){m[`outcome_${outcome}_count`]=rows.filter(r=>r.outcome===outcome).length;m[`outcome_${outcome}_pct`]=rate(m[`outcome_${outcome}_count`]);}
 for(const side of ['a','b']){
  const share=rows.filter(r=>r[`move_${side}`]==='S').length;
  Object.assign(m,{[`share_${side}_count`]:share,[`keep_${side}_count`]:n-share,[`share_${side}_pct`]:rate(share),[`keep_${side}_pct`]:rate(n-share),[`average_${side}`]:n?m[`total_${side}`]/n:null,
   [`first_move_${side}`]:rows[0]?.[`move_${side}`]??null,[`first_keep_${side}`]:rows.find(r=>r[`move_${side}`]==='K')?.round??null});
  for(const kind of ['benefit','exposure']){const outcome=(side==='a')===(kind==='benefit')?'KS':'SK';m[`${kind}_${side}_count`]=m[`outcome_${outcome}_count`];m[`${kind}_${side}_pct`]=rate(m[`${kind}_${side}_count`]);}
 }
 const first=rows.find(r=>r.outcome==='SK'||r.outcome==='KS');
 const recovered=first&&rows.find(r=>r.round>first.round&&r.outcome==='SS');
 const ending=rows.slice(-10);
 Object.assign(m,{difference_a_minus_b:m.total_a-m.total_b,absolute_gap:Math.abs(m.total_a-m.total_b),combined_score:m.total_a+m.total_b,
 mutual_sharing_pct:m.outcome_SS_pct,mutual_keeping_pct:m.outcome_KK_pct,one_sided_keeping_pct:rate(m.outcome_SK_count+m.outcome_KS_count),
 first_one_sided_keep_round:first?.round??null,first_one_sided_keep_side:first?(first.move_a==='K'?'A':'B'):null,
 recovery_rounds:recovered?recovered.round-first.round:null,recovery_status:!first?'not_applicable':recovered?'observed':'not_observed',
 ending_rounds:ending.length,combined_efficiency_pct:n?100*(m.total_a+m.total_b)/(6*n):null});
 for(const out of ['SS','SK','KS','KK']){m[`ending_${out}_count`]=ending.filter(r=>r.outcome===out).length;m[`ending_${out}_pct`]=ending.length?100*m[`ending_${out}_count`]/ending.length:null;}
 return m;
}
// Instructor extension point: return additional descriptive metrics; never modify scores.
export function instructorMetrics(rows){return {};}
export function summary(record){
 const m=metrics(record.rows), n=m.completed_rounds;
 if(!n)return {text:'No rounds completed. No result can be determined.',questions:['Which validation message needs to be addressed before testing?']};
 const result=record.status==='complete'?(m.difference_a_minus_b===0?`The match ended in a ${m.total_a}–${m.total_b} draw.`:`Strategy ${m.difference_a_minus_b>0?'A':'B'} won ${Math.max(m.total_a,m.total_b)}–${Math.min(m.total_a,m.total_b)}, a margin of ${m.absolute_gap} points.`):`This run is incomplete (${n}/${record.rounds} rounds). No winner is declared.`;
 const common=['SS','SK','KS','KK'].sort((a,b)=>m[`outcome_${b}_count`]-m[`outcome_${a}_count`])[0];
 const recovery=m.recovery_status==='not_applicable'?'There was no one-sided Keep.':`The first one-sided Keep was by ${m.first_one_sided_keep_side} in round ${m.first_one_sided_keep_round}; ${m.recovery_status==='observed'?`mutual sharing returned ${m.recovery_rounds} round(s) later`:'recovery to mutual sharing was not observed before the run ended'}.`;
 return {text:`${result} Across ${n} completed rounds, A shared ${m.share_a_count} times and B shared ${m.share_b_count} times. ${common} was a most common outcome (${m[`outcome_${common}_count`]}/${n}). A kept while B shared ${m.benefit_a_count} times; B kept while A shared ${m.benefit_b_count} times. ${recovery} The final ${m.ending_rounds} rounds contained ${['SS','SK','KS','KK'].map(x=>`${m[`ending_${x}_count`]} ${x}`).join(', ')}. Combined payoff efficiency was ${m.combined_efficiency_pct.toFixed(1)}%, while mutual sharing was ${m.mutual_sharing_pct.toFixed(1)}%. These measure different things; this match does not establish universal superiority or intent.`,questions:[
 `How do the ${m.benefit_a_count} KS and ${m.benefit_b_count} SK outcomes explain the A−B difference of ${m.difference_a_minus_b}?`,
 m.recovery_status==='observed'?`What happened between round ${m.first_one_sided_keep_round} and the return to SS ${m.recovery_rounds} round(s) later?`:`What change might increase mutual sharing beyond ${m.outcome_SS_count}/${n} rounds?`,
 `Would the ending pattern (${m.ending_SS_count} SS in the last ${m.ending_rounds} rounds) persist with a different seed or opponent?`]};
}
