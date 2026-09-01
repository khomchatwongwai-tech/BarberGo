const PII_KEYS = new Set([
  'pin',
  'ssn',
  'tax',
  'taxid',
  'bank',
  'bankaccount',
  'routing',
  'wage',
  'wages',
  'salary',
  'payroll',
  'address',
  'homeaddress',
  'phone',
  'mobile',
  'email',
  'personalemail',
  'password',
  'secret',
  'token',
  'refresh',
  'ssnlast4',
  'dob',
  'medical',
  'notes',
  'hrnotes',
]);

const MARKET_SECRET_KEYS = new Set([
  'brokersecret',
  'brokeroauth',
  'refreshtoken',
  'providerkey',
  'apikey',
  'apisecret',
  'privatekey',
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function stripSensitiveFields(input: unknown, depth = 0): unknown {
  if (depth > 8 || input == null) return input;
  if (Array.isArray(input)) return input.map((item) => stripSensitiveFields(item, depth + 1));
  if (typeof input !== 'object') return input;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const normalized = normalizeKey(key);
    if (PII_KEYS.has(normalized) || MARKET_SECRET_KEYS.has(normalized) || normalized.includes('ssn') || normalized.includes('password')) {
      continue;
    }
    output[key] = stripSensitiveFields(value, depth + 1);
  }
  return output;
}

export function hasForbiddenPii(input: unknown, depth = 0): boolean {
  if (depth > 8 || input == null) return false;
  if (Array.isArray(input)) return input.some((item) => hasForbiddenPii(item, depth + 1));
  if (typeof input !== 'object') return false;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const normalized = normalizeKey(key);
    if (PII_KEYS.has(normalized) || MARKET_SECRET_KEYS.has(normalized)) return true;
    if (hasForbiddenPii(value, depth + 1)) return true;
  }
  return false;
}
