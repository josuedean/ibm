const fn =
  'def space_exploration_strategy(history, round_number, resource_multiplier):\n';

export const STRATEGIES = [
  {
    id: 'random',
    name: 'Random',
    description: 'Share or Keep, each with a 50% chance.',
    source:
      'import random\n\n' +
      fn +
      '    return random.choice(["S", "K"])\n'
  },
  {
    id: 'tit-for-tat',
    name: 'Tit for Tat',
    description:
      'Benchmark only — prohibited for student submissions. Shares first, then copies the opponent’s previous move.',
    source:
      fn +
      '    return history[-1][1] if history else "S"\n'
  }
];
