export const matrixProse = [
  'Выпускные бумаги лежат рядом с мокрым краем стола.',
  'مرحبا بالقارئ، النص يبقى كما هو.',
];

export const matrixOptions = [
  { id: 'ask', label: 'Ask who sent the visitor', support: 'Brief conversation' },
  { id: 'withdraw', label: 'Withdraw to the shelter', support: 'Leave without losing your work' },
  { id: 'wait', label: 'Wait and observe', support: 'A bounded time commitment' },
  { id: 'repair', label: 'Continue the repair', support: 'Same saved commitment' },
  { id: 'note', label: 'Write the name down', support: 'No message is sent' },
  { id: 'leave', label: 'Leave the landing', support: 'The door stays open' },
] as const;
