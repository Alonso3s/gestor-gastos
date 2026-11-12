import type { ZodType } from 'zod';

export const BEARER_AUTH = 'bearerAuth';

/** Marca un endpoint como protegido con access token. */
export const secured = [{ [BEARER_AUTH]: [] }];

export function jsonBody(schema: ZodType, example: unknown) {
  return { required: true, content: { 'application/json': { schema, example } } };
}

export function jsonResponse(description: string, schema: ZodType, example: unknown) {
  return { description, content: { 'application/json': { schema, example } } };
}
