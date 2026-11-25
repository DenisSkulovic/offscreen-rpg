export type DatabaseAdmissionErrorCategory =
  'saturated' | 'timeout' | 'cancelled' | 'closed';

const ADMISSION_MESSAGES: Record<DatabaseAdmissionErrorCategory, string> = {
  saturated: 'Database admission queue is saturated.',
  timeout: 'Database admission timeout while waiting for a connection.',
  cancelled: 'Database admission was cancelled.',
  closed: 'Database admission controller is closed.',
};

export class DatabaseAdmissionError extends Error {
  readonly category: DatabaseAdmissionErrorCategory;

  constructor(category: DatabaseAdmissionErrorCategory) {
    super(ADMISSION_MESSAGES[category]);
    this.name = 'DatabaseAdmissionError';
    this.category = category;
  }
}
