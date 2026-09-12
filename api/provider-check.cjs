// Read-only preflight: never generates tokens or prints credentials/provider payloads.
async function checkProvider() {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!key || !model)
    return 'Coach: OPENROUTER_API_KEY und OPENROUTER_MODEL in .env.coach.local setzen.';
  try {
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: 'Bearer ' + key },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      return (
        'Coach: OpenRouter-Schlüssel konnte nicht bestätigt werden (HTTP ' + response.status + ').'
      );
    const keyInfo = await response.json();
    if (typeof keyInfo.data?.limit_remaining === 'number' && keyInfo.data.limit_remaining <= 0)
      return 'Coach: Das Limit des OpenRouter-Schlüssels ist ausgeschöpft. Bitte Limit/Guthaben prüfen.';
    const models = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(8000),
    });
    if (!models.ok)
      return 'Coach: Schlüssel bestätigt; Modellverfügbarkeit konnte nicht geprüft werden.';
    const catalog = await models.json();
    if (!Array.isArray(catalog.data) || !catalog.data.some((entry) => entry.id === model))
      return 'Coach: Konfigurierte Modell-ID fehlt im OpenRouter-Katalog. Bitte OPENROUTER_MODEL prüfen.';
    return 'Coach: Schlüssel und Modell bestätigt. Account-Guthaben ist damit nicht geprüft; HTTP 402 bedeutet fehlendes Guthaben/Schlüssellimit.';
  } catch {
    return 'Coach: Online-Startprüfung nicht erreichbar. Die App startet; Coach kann später erneut angefragt werden.';
  }
}
module.exports = { checkProvider };
if (require.main === module) {
  const fs = require('node:fs');
  const path = require('node:path');
  const env = path.resolve(__dirname, '../.env.coach.local');
  if (fs.existsSync(env)) process.loadEnvFile(env);
  checkProvider().then(console.log);
}
