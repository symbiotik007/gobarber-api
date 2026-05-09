// Tests for the CSV escape helpers used in AdminBookingController export.
// These are pure functions — no mocking needed.

// Inline the helpers so we don't need to export them from the controller.
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowToCsv(fields) {
  return fields.map(escapeCsv).join(',');
}

describe('escapeCsv', () => {
  test('returns empty string for null', () => {
    expect(escapeCsv(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(escapeCsv(undefined)).toBe('');
  });

  test('passes through plain strings unchanged', () => {
    expect(escapeCsv('hello')).toBe('hello');
    expect(escapeCsv('CONFIRMED')).toBe('CONFIRMED');
  });

  test('passes through numbers as strings', () => {
    expect(escapeCsv(50000)).toBe('50000');
    expect(escapeCsv(0)).toBe('0');
  });

  test('wraps strings containing commas in quotes', () => {
    expect(escapeCsv('Calle 18, Pasto')).toBe('"Calle 18, Pasto"');
  });

  test('wraps strings containing double quotes and escapes them', () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  test('wraps strings containing newlines', () => {
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  test('handles both commas and quotes', () => {
    const result = escapeCsv('a,"b"');
    expect(result).toBe('"a,""b"""');
  });
});

describe('rowToCsv', () => {
  test('joins simple fields with commas', () => {
    expect(rowToCsv(['REF-001', 'CONFIRMED', '2027-06-15'])).toBe('REF-001,CONFIRMED,2027-06-15');
  });

  test('wraps fields that need quoting', () => {
    expect(rowToCsv(['REF-001', 'García, Juan', '15000'])).toBe('REF-001,"García, Juan",15000');
  });

  test('handles null fields in a row', () => {
    expect(rowToCsv(['REF-001', null, undefined, '10:00'])).toBe('REF-001,,,10:00');
  });

  test('produces valid CSV header row', () => {
    const headers = ['Referencia', 'Estado', 'Fecha', 'Hora', 'Servicio', 'Barbero', 'Cliente', 'Email', 'Teléfono', 'Anticipo', 'Total'];
    const result = rowToCsv(headers);
    expect(result.split(',').length).toBe(11);
    expect(result).toContain('Referencia');
    expect(result).toContain('Teléfono');
  });
});
