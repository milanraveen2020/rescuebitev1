export * from './http.js';

/**
 * Feature-specific resource modules (e.g. `surpriseBags`, `reservations`) are
 * added here as the API grows. Each resource lives in its own file under
 * `src/resources/<resource>.ts`, takes an `ApiClient`, and returns typed
 * `Result`s validated with schemas from `@rescuebite/types`.
 */
