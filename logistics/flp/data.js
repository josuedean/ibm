// ============================================================
// LOGISTICS NETWORK GAME — DATA MODULE
// All constants, events, tooltips, and explainer content
// ============================================================

export const GAME_CONFIG = {
  maxOpenDCs: 2,
  invCostPerDC: 4000,
  latePenalty: 3.00,
  totalQuarters: 6,
  scoreBase: 1_000_000,
};

// ── Facilities ───────────────────────────────────────────────
export const DCS = [
  {
    id: 'busan',
    name: 'Busan DC',
    region: 'Southeast Korea',
    fixed: 18000,
    cap: 2400,
    storage: 1.10,
    inbound: 0.80,
    tooltip: {
      title: 'Fixed cost',
      body: 'The cost you pay every month just to keep this facility open — regardless of how many units move through it. In Chapter 10, this is the "facility opening cost" in the classic facility location problem.',
    },
    strength: 'Strong for Southeast — lowest inbound cost from Ulsan Plant.',
    weakness: 'Expensive to open. Poor outbound reach to Seoul and Southwest.',
  },
  {
    id: 'daejeon',
    name: 'Daejeon DC',
    region: 'Central Korea',
    fixed: 16000,
    cap: 2000,
    storage: 1.00,
    inbound: 1.40,
    tooltip: {
      title: 'Central compromise',
      body: 'A "central" DC has higher inbound cost (farther from the plant) but more balanced outbound reach. This is the classic hub trade-off: pay more to get product there, save more on local delivery.',
    },
    strength: 'Best outbound to Seoul and Central. Only DC that can serve Seoul in 1 day.',
    weakness: 'Higher inbound cost from Ulsan. Can\'t match Busan for Southeast.',
  },
  {
    id: 'gwangju',
    name: 'Gwangju DC',
    region: 'Southwest Korea',
    fixed: 13000,
    cap: 1800,
    storage: 0.95,
    inbound: 1.90,
    tooltip: {
      title: 'Low fixed cost, high inbound',
      body: 'Cheapest facility to open, but the highest inbound transport cost because it is farthest from the plant. This illustrates the trade-off between facility cost and supply chain positioning.',
    },
    strength: 'Lowest fixed cost. Dominates Southwest Region outbound.',
    weakness: 'Highest inbound cost. Limited capacity. Far from Ulsan Plant.',
  },
];

// ── Demand zones ──────────────────────────────────────────────
export const ZONES = [
  { id: 'seoul',     name: 'Seoul Metro',    demand: 1300, sla: 2 },
  { id: 'central',   name: 'Central Region', demand: 900,  sla: 2 },
  { id: 'southwest', name: 'SW Region',      demand: 700,  sla: 2 },
  { id: 'southeast', name: 'SE Region',      demand: 1100, sla: 1 },
];

// ── Outbound cost per unit ────────────────────────────────────
export const OUTBOUND = {
  busan:   { seoul: 2.90, central: 2.10, southwest: 3.50, southeast: 1.20 },
  daejeon: { seoul: 2.10, central: 1.40, southwest: 2.00, southeast: 2.20 },
  gwangju: { seoul: 3.20, central: 2.40, southwest: 1.10, southeast: 3.10 },
};

// ── Transit days ──────────────────────────────────────────────
export const TRANSIT = {
  busan:   { seoul: 2, central: 1, southwest: 2, southeast: 1 },
  daejeon: { seoul: 1, central: 1, southwest: 1, southeast: 2 },
  gwangju: { seoul: 2, central: 2, southwest: 1, southeast: 2 },
};

// ── Quarterly events ──────────────────────────────────────────
export const EVENTS = [
  {
    id: 'baseline',
    quarter: 1,
    title: 'Baseline quarter',
    icon: '📦',
    desc: 'Normal operations. No disruptions. This is your chance to find the optimal base network before shocks hit.',
    teachingPoint: 'Use Q1 to understand the cost structure before anything changes. What is the cheapest valid network?',
    mod: {},
    hint: 'Try every combination of 2 DCs and compare total cost. The answer might surprise you.',
  },
  {
    id: 'se_surge',
    quarter: 2,
    title: 'SE demand surge +25%',
    icon: '📈',
    desc: 'A major retail chain opens 40 stores in the Southeast. SE Region demand jumps from 1,100 to 1,375 units.',
    teachingPoint: 'Demand shocks test capacity limits. Does your network absorb the surge, or does a DC tip over its capacity ceiling?',
    mod: { demand: { southeast: 1375 } },
    hint: 'Check total demand vs DC capacity. A DC serving multiple regions might now be over its limit.',
  },
  {
    id: 'fuel_rise',
    quarter: 3,
    title: 'Fuel cost +20%',
    icon: '⛽',
    desc: 'Global oil prices spike. All outbound delivery costs increase by 20% this quarter.',
    teachingPoint: 'Transport cost shocks hit long routes hardest. Central locations become relatively more attractive when fuel is expensive.',
    mod: { outbound_mult: 1.20 },
    hint: 'Calculate the extra outbound cost per DC assignment. Longer routes now cost proportionally more.',
  },
  {
    id: 'seoul_sla',
    quarter: 4,
    title: 'Seoul SLA tightens to 1 day',
    icon: '⏰',
    desc: 'A premium Seoul retailer demands next-day delivery or they cancel the contract. Seoul SLA drops from 2 days to 1 day.',
    teachingPoint: 'Service constraints can override cost optimisation. Sometimes you must open a specific facility not because it is cheapest, but because it is the only one that can meet the service promise.',
    mod: { sla: { seoul: 1 } },
    hint: 'Only one DC can serve Seoul in 1 day. Check the transit matrix. You may have no choice.',
  },
  {
    id: 'busan_cost',
    quarter: 5,
    title: 'Busan port surcharge',
    icon: '🚢',
    desc: 'New port handling fees raise Busan DC\'s monthly fixed cost from ₩18,000 to ₩21,000.',
    teachingPoint: 'Fixed cost changes shift the balance between facilities. A DC that was optimal at one price point may not be at another.',
    mod: { fixed: { busan: 21000 } },
    hint: 'Recalculate total cost with and without Busan. Has the break-even point shifted?',
  },
  {
    id: 'gwangju_cap',
    quarter: 6,
    title: 'Gwangju capacity -20%',
    icon: '🔧',
    desc: 'A maintenance shutdown reduces Gwangju DC capacity from 1,800 to 1,440 units for the quarter.',
    teachingPoint: 'Capacity constraints force reassignment. When a cheap facility can no longer serve all its zones, you must decide whether to overflow to a more expensive option or restructure the whole network.',
    mod: { cap: { gwangju: 1440 } },
    hint: 'If Gwangju is open and overloaded, you have two choices: close it and reassign everything, or keep it and move one zone elsewhere.',
  },
];

// ── Tooltip content library ───────────────────────────────────
export const TOOLTIPS = {
  fixedCost: {
    title: 'Fixed (facility opening) cost',
    body: 'Paid every month the DC is open, regardless of volume. This is the core driver in facility location models — you want to open as few facilities as possible while still meeting demand. Chapter 10 calls this the "fixed charge" in the uncapacitated facility location problem.',
  },
  invPenalty: {
    title: 'Inventory cost per open DC',
    body: 'Every open DC requires safety stock, counting staff, and storage systems. This penalty captures the overhead that grows with the number of facilities. More depots = better local delivery BUT higher inventory overhead. This is the Chapter 9 trade-off.',
  },
  inboundCost: {
    title: 'Inbound transport cost',
    body: 'The cost of moving product from the Ulsan Plant to each DC. Facilities close to the plant have low inbound cost but may have poor local coverage. The optimal DC location balances inbound cost against outbound reach.',
  },
  storageCost: {
    title: 'Storage (handling) cost',
    body: 'Cost per unit stored and handled at the facility. Varies by DC due to local labour rates, facility age, and efficiency. Multiplied by all demand routed through the DC.',
  },
  outboundCost: {
    title: 'Outbound (last-mile) delivery cost',
    body: 'Cost to deliver from the DC to the customer zone. Typically the largest single cost element in a distribution network. Local DCs reduce outbound cost but raise fixed and inbound costs — the classic logistics trade-off.',
  },
  latePenalty: {
    title: 'Late delivery penalty',
    body: 'Applied when transit time exceeds the zone\'s SLA. Real-world contracts include service level penalties, chargebacks, and lost business. Here modelled as ₩3 per unit in any zone that misses its target.',
  },
  totalCost: {
    title: 'Total logistics cost',
    body: 'The sum of all cost elements. In strategic network design, the goal is to minimise total logistics cost subject to service constraints — not to minimise any single element. A "cheap" transport route that forces you to open an extra DC may cost more overall.',
  },
  capacity: {
    title: 'Facility capacity',
    body: 'Maximum units the DC can receive and dispatch per month. If total demand assigned to a DC exceeds its capacity, you have an infeasible solution — real networks would overflow to a secondary DC or use expensive spot transport.',
  },
  sla: {
    title: 'Service level agreement (SLA)',
    body: 'Maximum number of transit days acceptable to the customer zone. Meeting SLA is a hard constraint in most real contracts. Network design must satisfy both the cost objective and all SLA constraints.',
  },
  transitDays: {
    title: 'Transit days',
    body: 'The number of days from DC dispatch to customer delivery. Determined by distance and transport mode. Closer DCs deliver faster but cost more to establish and maintain.',
  },
  score: {
    title: 'How scoring works',
    body: 'Score = 100,000,000 ÷ total logistics cost. Lower cost = higher score. You are scored each quarter, and totals accumulate. Perfect networks across all 6 quarters require adapting to each shock — there is no single "always optimal" configuration.',
  },
};

// ── Post-round explainer generator ───────────────────────────
// Returns structured analysis of a completed quarter
export function generateExplainer(quarterResult) {
  const { costs, openDCs, assignments, event, effectiveData } = quarterResult;
  const { dcs, zones } = effectiveData;

  const explainer = {
    headline: '',
    scoreVerdict: '',
    costBreakdown: [],
    biggestDriver: null,
    missed: [],
    suggestions: [],
    teachingMoment: '',
  };

  // Score verdict
  const total = costs.total;
  if (total < 70000) {
    explainer.scoreVerdict = 'excellent';
    explainer.headline = 'Excellent network — near-optimal cost structure.';
  } else if (total < 90000) {
    explainer.scoreVerdict = 'good';
    explainer.headline = 'Good network — a few adjustments could lower costs further.';
  } else if (total < 115000) {
    explainer.scoreVerdict = 'fair';
    explainer.headline = 'Workable network, but significant cost savings are available.';
  } else {
    explainer.scoreVerdict = 'poor';
    explainer.headline = 'High-cost network — restructure before the next quarter.';
  }

  // Cost element breakdown as % of total
  const elements = [
    { label: 'Fixed DC costs', value: costs.fixed, key: 'fixed' },
    { label: 'Inventory penalty', value: costs.inv, key: 'inv' },
    { label: 'Inbound transport', value: costs.inbound, key: 'inbound' },
    { label: 'Storage costs', value: costs.storage, key: 'storage' },
    { label: 'Outbound transport', value: costs.outbound, key: 'outbound' },
    { label: 'Late delivery penalty', value: costs.late, key: 'late' },
  ];
  elements.forEach(el => {
    el.pct = Math.round(el.value / total * 100);
  });
  explainer.costBreakdown = elements;

  // Biggest cost driver
  const biggest = [...elements].sort((a, b) => b.value - a.value)[0];
  explainer.biggestDriver = biggest;

  // SLA misses
  zones.forEach(z => {
    const dcId = assignments[z.id];
    if (!dcId) return;
    const transit = TRANSIT[dcId][z.id];
    if (transit > z.sla) {
      const dc = dcs.find(d => d.id === dcId);
      explainer.missed.push({
        zone: z.name,
        dc: dc.name,
        transit,
        sla: z.sla,
        penalty: z.demand * GAME_CONFIG.latePenalty,
      });
    }
  });

  // Capacity overloads
  const overloaded = [];
  dcs.forEach(dc => {
    if (!openDCs[dc.id]) return;
    const assigned = zones.filter(z => assignments[z.id] === dc.id);
    const total = assigned.reduce((s, z) => s + z.demand, 0);
    if (total > dc.cap) {
      overloaded.push({ dc: dc.name, used: total, cap: dc.cap });
    }
  });

  // Suggestions
  if (explainer.missed.length > 0) {
    explainer.suggestions.push({
      type: 'service',
      text: `You missed SLA in ${explainer.missed.length} zone(s), costing ₩${Math.round(explainer.missed.reduce((s,m)=>s+m.penalty,0)).toLocaleString()} in penalties. Reassigning to a faster DC would eliminate this cost entirely.`,
    });
  }
  if (overloaded.length > 0) {
    overloaded.forEach(o => {
      explainer.suggestions.push({
        type: 'capacity',
        text: `${o.dc} is over capacity (${o.used.toLocaleString()} units assigned vs ${o.cap.toLocaleString()} max). In a real network this would require emergency transport at premium rates.`,
      });
    });
  }
  if (costs.inv >= costs.fixed * 0.45) {
    explainer.suggestions.push({
      type: 'inventory',
      text: `Inventory penalty (₩${Math.round(costs.inv).toLocaleString()}) is a large share of your fixed cost. Each open DC adds ₩${GAME_CONFIG.invCostPerDC.toLocaleString()} in inventory overhead — this is why more facilities aren't always better.`,
    });
  }
  if (costs.outbound / total > 0.45) {
    explainer.suggestions.push({
      type: 'outbound',
      text: `Outbound transport is ${Math.round(costs.outbound/total*100)}% of your total cost — unusually high. Your DCs may not be well-positioned for the zones they are serving.`,
    });
  }

  // Teaching moment from the event
  explainer.teachingMoment = event.teachingPoint;

  return explainer;
}
