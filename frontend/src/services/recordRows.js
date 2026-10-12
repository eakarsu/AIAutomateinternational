// List routes currently return arrays; accept their paginated envelope as well.
// Reject unexpected success payloads so a provider or route mistake is visible.
export function recordRows(payload, key) {
  if (Array.isArray(payload)) return payload;
  const rows = payload?.data ?? payload?.[key];
  if (Array.isArray(rows)) return rows;
  throw new Error(`Invalid ${key} list response: expected an array`);
}
