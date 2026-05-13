export async function emitCrossApp(url, payload) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // fire-and-forget: VP must never fail due to cross-app outage
  }
}
