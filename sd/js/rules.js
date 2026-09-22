// The sole authoritative payoff configuration; bump version if changing rules.
export const RULES = Object.freeze({version:'space-dilemma-1.0', metricVersion:'observed-1.0', multiplier:1.0, maxRounds:5000,
  payoffs:Object.freeze({SS:[3,3],SK:[1,5],KS:[5,1],KK:[2,2]})});
export function scoreRound(a,b,previous={total_a:0,total_b:0},round=1){
  if(!['S','K'].includes(a)||!['S','K'].includes(b)) throw Error('Invalid move');
  const [points_a,points_b]=RULES.payoffs[a+b];
  return {round,move_a:a,move_b:b,outcome:a+b,points_a,points_b,total_a:previous.total_a+points_a,total_b:previous.total_b+points_b};
}
export async function hashSource(source){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');}
export function sideSeed(master,side){let h=2166136261;for(const c of `${master}:${side}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
