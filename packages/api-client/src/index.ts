export * from './client.js';
export type { paths, components, operations } from './generated/openapi.js';

// Re-export the shared error envelope + Result helpers so frontends have one
// import site for everything they need to consume the API.
export {
  type ApiError,
  type ApiErrorResponse,
  type ApiErrorCode,
  type Result,
  ApiErrorSchema,
  ApiErrorResponseSchema,
  ok,
  err,
} from '@rescuebite/types';
