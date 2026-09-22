const fn='def space_exploration_strategy(history, round_number, resource_multiplier):\n';
export const STRATEGIES=[
 {id:'random',name:'Random',description:'Share or Keep, each with a 50% chance.',source:'import random\n\n'+fn+'    return random.choice(["S", "K"])\n'},
 {id:'tit-for-tat',name:'Tit for Tat',description:'Benchmark only — prohibited for student submissions. Shares first, then copies the opponent’s last move.',source:fn+'    return history[-1][1] if history else "S"\n'},
 {id:'always-share',name:'Always Share',description:'Shares on every round.',source:fn+'    return "S"\n'},
 {id:'always-keep',name:'Always Keep',description:'Keeps on every round.',source:fn+'    return "K"\n'},
 {id:'alternator',name:'Alternator',description:'Starts with Share, then alternates Share and Keep.',source:fn+'    return "S" if round_number % 2 else "K"\n'},
 {id:'grudger',name:'Grudger',description:'Shares until the opponent first keeps, then always keeps.',source:fn+'    return "K" if any(opponent == "K" for _, opponent in history) else "S"\n'}
];
