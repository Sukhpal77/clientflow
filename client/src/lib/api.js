export async function api(url, method = 'GET', body) {
  const res = await fetch('/api' + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let result;
  try {
    result = await res.json();
  } catch {
    throw new Error('The API is unavailable. Start the Node server to use live mode.');
  }
  if (!res.ok) {
    const error = new Error(result.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return result;
}
