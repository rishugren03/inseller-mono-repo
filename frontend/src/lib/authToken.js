let getAuthToken = null;

export function setAuthTokenGetter(getter) {
  getAuthToken = getter;
}

export async function resolveAuthToken() {
  if (!getAuthToken) return null;
  return getAuthToken();
}
