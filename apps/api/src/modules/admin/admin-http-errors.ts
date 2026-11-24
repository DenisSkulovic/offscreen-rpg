import { HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AdminErrorV1 } from '@offscreen/admin-interface/admin';
import { AdminSessionError } from '@offscreen/admin';

export function adminError(code: AdminErrorV1['code']): AdminErrorV1 {
  return { version: 1, code, requestId: randomUUID() };
}

export function mapAdminError(error: unknown): HttpException {
  if (error instanceof AdminSessionError) {
    const body = adminError(error.code);
    switch (error.code) {
      case 'unauthenticated':
        return new HttpException(body, HttpStatus.UNAUTHORIZED);
      case 'step_up_required':
      case 'not_authorized':
      case 'staff_session_required':
        return new HttpException(body, HttpStatus.FORBIDDEN);
      case 'conflict':
        return new HttpException(body, HttpStatus.CONFLICT);
      case 'unavailable':
        return new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
      default:
        return new HttpException(body, HttpStatus.FORBIDDEN);
    }
  }
  return new HttpException(
    adminError('unavailable'),
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
