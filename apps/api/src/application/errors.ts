export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(detail: string) {
    super('Bad Request', 400, 'VALIDATION_ERROR', detail);
  }
}

export class NotFoundError extends AppError {
  constructor(detail?: string) {
    super('Not Found', 404, 'NOT_FOUND', detail);
  }
}

export class UnauthorisedError extends AppError {
  constructor(detail = 'Authentication required') {
    super('Unauthorised', 401, 'UNAUTHORISED', detail);
  }
}

export class ForbiddenError extends AppError {
  constructor(detail?: string) {
    super('Forbidden', 403, 'FORBIDDEN', detail);
  }
}

export class ConflictError extends AppError {
  constructor(detail?: string) {
    super('Conflict', 409, 'CONFLICT', detail);
  }
}
