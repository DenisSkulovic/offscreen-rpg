export class NestProtocolError extends Error {
  readonly kind = 'protocol' as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NestProtocolError';
  }
}

export class NestTransientError extends Error {
  readonly kind = 'transient' as const;
  readonly status: number;

  constructor(status: number, message = 'Upstream Nest request failed') {
    super(message);
    this.name = 'NestTransientError';
    this.status = status;
  }
}
