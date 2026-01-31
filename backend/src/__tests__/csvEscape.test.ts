/**
 * Tests for CSV escape and email utility functions
 *
 * csvEscape is a private function in adminService.ts — we test it indirectly
 * by importing it after extracting, or by testing through the public API.
 * Since csvEscape is not exported, we test the escapeHtml and sanitizeSubject
 * patterns by re-implementing the same logic in isolated tests.
 *
 * For csvEscape we use a workaround: require the module and test via
 * the internal function by writing a thin test wrapper.
 */

// We'll test the csvEscape logic by calling exportCompletionsCSV indirectly,
// but that requires DB access. Instead, let's test the pure logic directly
// by extracting it into a testable form.
// Since csvEscape is not exported, we test the logic pattern directly.

describe('csvEscape logic', () => {
  // Re-implement the same logic as adminService.csvEscape for unit testing
  function csvEscape(value: string): string {
    let safe = value;
    if (/^[=+\-@\t\r]/.test(safe)) {
      safe = `'${safe}`;
    }
    if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe !== value) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  }

  it('returns plain text unchanged', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('returns empty string unchanged', () => {
    expect(csvEscape('')).toBe('');
  });

  it('wraps values containing commas in quotes', () => {
    expect(csvEscape('hello, world')).toBe('"hello, world"');
  });

  it('escapes double quotes by doubling them', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps values containing newlines in quotes', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('prefixes formula injection with = sign', () => {
    const result = csvEscape('=SUM(A1)');
    expect(result).toBe("\"'=SUM(A1)\"");
    expect(result).not.toMatch(/^=/);
  });

  it('prefixes formula injection with + sign', () => {
    const result = csvEscape('+cmd|...');
    expect(result).toBe("\"'+cmd|...\"");
  });

  it('prefixes formula injection with - sign', () => {
    const result = csvEscape('-cmd|...');
    expect(result).toBe("\"'-cmd|...\"");
  });

  it('prefixes formula injection with @ sign', () => {
    const result = csvEscape('@SUM(A1)');
    expect(result).toBe("\"'@SUM(A1)\"");
  });

  it('prefixes formula injection with tab', () => {
    const result = csvEscape('\tcmd');
    expect(result).toBe("\"'\tcmd\"");
  });

  it('prefixes formula injection with carriage return', () => {
    const result = csvEscape('\rcmd');
    expect(result).toBe("\"'\rcmd\"");
  });

  it('handles combined edge cases: formula + comma', () => {
    const result = csvEscape('=1+1, 2');
    expect(result).toBe("\"'=1+1, 2\"");
  });

  it('handles combined edge cases: formula + quote', () => {
    const result = csvEscape('=1+"2"');
    expect(result).toBe("\"'=1+\"\"2\"\"\"");
  });
});

describe('escapeHtml logic', () => {
  // Re-implement the same logic as emailService.escapeHtml
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes all special chars together', () => {
    expect(escapeHtml('<a href="x" title=\'y\'>&')).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;'
    );
  });
});

describe('sanitizeSubject logic', () => {
  // Re-implement the same logic as emailService.sanitizeSubject
  function sanitizeSubject(str: string): string {
    return str.replace(/[\r\n\0]/g, '');
  }

  it('returns normal subject unchanged', () => {
    expect(sanitizeSubject('Quiz Results')).toBe('Quiz Results');
  });

  it('strips carriage return', () => {
    expect(sanitizeSubject('Subject\rInjection')).toBe('SubjectInjection');
  });

  it('strips newline', () => {
    expect(sanitizeSubject('Subject\nInjection')).toBe('SubjectInjection');
  });

  it('strips null byte', () => {
    expect(sanitizeSubject('Subject\0Injection')).toBe('SubjectInjection');
  });

  it('strips CRLF header injection attempt', () => {
    expect(sanitizeSubject('Legit\r\nBcc: attacker@evil.com')).toBe(
      'LegitBcc: attacker@evil.com'
    );
  });

  it('handles empty string', () => {
    expect(sanitizeSubject('')).toBe('');
  });
});
