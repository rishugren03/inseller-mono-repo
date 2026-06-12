let getAuthToken = null;
let onUnauthorized = null;

export function setAuthTokenGetter(getter) {
  getAuthToken = getter;
}

export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

export function handleUnauthorized() {
  if (onUnauthorized) onUnauthorized();
}

export async function resolveAuthToken() {
  if (!getAuthToken) return null;
  return getAuthToken();
}
