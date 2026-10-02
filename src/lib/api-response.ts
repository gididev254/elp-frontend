// Standardised API response helpers and error codes.
import { NextResponse } from "next/server";

export const API_ERRORS = {
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER: 500,
} as const;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error, ...(details ? { details } : {}) },
    { status },
  );
}

export function notFound(message = "Resource not found.") {
  return fail(message, API_ERRORS.NOT_FOUND);
}

export function forbidden(message = "You do not have permission to perform this action.") {
  return fail(message, API_ERRORS.FORBIDDEN);
}

export function unauthorized(message = "Authentication required.") {
  return fail(message, API_ERRORS.UNAUTHORIZED);
}

export function validationError(message: string, details?: unknown) {
  return fail(message, API_ERRORS.VALIDATION, details);
}

export function conflict(message: string) {
  return fail(message, API_ERRORS.CONFLICT);
}
