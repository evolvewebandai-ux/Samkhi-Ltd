/**
 * Content Security Gateway & Input Sanitization Auditor
 * Specially designed for auditing and validating user-generated submissions
 * like product reviews for XSS, SQL/NoSQL Injection, Evasion techniques, and PII leaks.
 */

export interface AuditResult {
  is_safe: boolean;
  risk_score: number; // 0 to 100
  threat_type: 'None' | 'XSS' | 'SQLi' | 'PII_Leak' | 'Multiple';
  flagged_substrings: string[];
  sanitization_action: 'Accept' | 'Strip_HTML' | 'Reject_Entirely' | 'Redact_PII';
  clean_text: string;
}

/**
 * Decodes HTML entities and URL-encoded strings to detect obfuscation/evasion attempts.
 */
function decodeFully(input: string): string {
  let decoded = input;
  
  // Outer layer URL decoding
  try {
    const nextDecoded = decodeURIComponent(decoded);
    if (nextDecoded !== decoded) {
      decoded = nextDecoded;
    }
  } catch {
    // Keep original if decoding fails
  }

  // Basic HTML Entity Decoding
  const htmlEntities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&amp;': '&',
    '&#60;': '<',
    '&#62;': '>',
    '&#34;': '"',
    '&#39;': "'",
    '&#38;': '&',
    '&#x3c;': '<',
    '&#x3C;': '<',
    '&#x3e;': '>',
    '&#x3E;': '>',
    '&#x22;': '"',
    '&#x27;': "'",
    '&#x26;': '&'
  };

  Object.entries(htmlEntities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, 'gi'), char);
  });

  return decoded;
}

/**
 * Strips all HTML tags from the text for safe rendering.
 */
export function stripHtml(input: string): string {
  // Simple yet robust regex to remove HTML tag-like patterns
  return input
    .replace(/<[^>]*>?/gm, '')
    // Replace duplicate spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Redacts Personally Identifiable Information (Emails, Phones, Credit Cards).
 */
export function redactPii(input: string, onMatchFound: (pii: string) => void): string {
  let result = input;

  // Credit Card regex (Standard major brands)
  const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g;
  
  // Email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  // North American and generic international phone numbers
  const phoneRegex = /\b(?:\+?1[-. ]?)?\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{4}\b/g;

  // Apply redactions and collect matching substrings
  result = result.replace(ccRegex, (match) => {
    onMatchFound(match);
    return '[REDACTED PAYMENT CARD]';
  });

  result = result.replace(emailRegex, (match) => {
    onMatchFound(match);
    return '[REDACTED EMAIL]';
  });

  result = result.replace(phoneRegex, (match) => {
    onMatchFound(match);
    return '[REDACTED CONTACT PHONE]';
  });

  return result;
}

/**
 * Audits a given text for potential safety exploits/leakage.
 */
export function auditAndSanitizeReview(text: string): AuditResult {
  const originalText = text;
  let cleanText = text;
  const flaggedSubstrings: string[] = [];
  const threatTypes: ('XSS' | 'SQLi' | 'PII_Leak')[] = [];

  // Low-level cleaning and decoding for evasion tracing
  const decodedText = decodeFully(originalText);

  // 1. Cross-Site Scripting (XSS) audit
  const xssTagPatterns = [
    /<script[^>]*>/gi,
    /<\/script>/gi,
    /<iframe[^>]*>/gi,
    /<\/iframe>/gi,
    /<img[^>]+onerror/gi,
    /<img[^>]+onload/gi,
    /<svg[^>]*>/gi,
    /<\/svg>/gi,
    /<body[^>]*>/gi,
    /<link[^>]*>/gi,
    /<html[^>]*>/gi,
    /on(?:load|error|click|mouseover|focus|blur)\s*=/gi,
    /javascript:/gi
  ];

  let hasXSS = false;
  xssTagPatterns.forEach(pattern => {
    const rawMatches = originalText.match(pattern);
    const decodedMatches = decodedText.match(pattern);
    
    if (rawMatches) {
      hasXSS = true;
      rawMatches.forEach(m => {
        if (!flaggedSubstrings.includes(m)) flaggedSubstrings.push(m);
      });
    }
    if (decodedMatches) {
      hasXSS = true;
      decodedMatches.forEach(m => {
        if (!flaggedSubstrings.includes(m)) flaggedSubstrings.push(m);
      });
    }
  });

  // Markdown-based exploit smuggling check
  const markdownExploit = /\[.*\]\(\s*javascript:/gi;
  if (markdownExploit.test(originalText) || markdownExploit.test(decodedText)) {
    hasXSS = true;
    const matches = originalText.match(markdownExploit) || decodedText.match(markdownExploit);
    matches?.forEach(m => {
      if (!flaggedSubstrings.includes(m)) flaggedSubstrings.push(m);
    });
  }

  if (hasXSS) {
    threatTypes.push('XSS');
  }

  // 2. SQL / NoSQL Injection audit
  const sqliPatterns = [
    /UNION\s+(?:ALL\s+)?SELECT/gi,
    /DROP\s+TABLE/gi,
    /DELETE\s+FROM/gi,
    /SELECT\s+.*\s+FROM/gi,
    /OR\s+['"]?1['"]?\s*=\s*['"]?1/gi,
    /--\s*$/g, // comment line SQL
    /\$where\s*:/gi, // NoSQL query operators
    /\{\s*"\$ne"\s*:/gi,
    /\{\s*"\$gt"\s*:/gi
  ];

  let hasSQLi = false;
  sqliPatterns.forEach(pattern => {
    const rawMatches = originalText.match(pattern);
    const decodedMatches = decodedText.match(pattern);

    if (rawMatches) {
      hasSQLi = true;
      rawMatches.forEach(m => {
        if (!flaggedSubstrings.includes(m)) flaggedSubstrings.push(m);
      });
    }
    if (decodedMatches) {
      hasSQLi = true;
      decodedMatches.forEach(m => {
        if (!flaggedSubstrings.includes(m)) flaggedSubstrings.push(m);
      });
    }
  });

  if (hasSQLi) {
    threatTypes.push('SQLi');
  }

  // 3. PII / Data Leakage Check and Redaction
  let hasPII = false;
  const piiList: string[] = [];
  const redactedText = redactPii(originalText, (pii) => {
    hasPII = true;
    if (!flaggedSubstrings.includes(pii)) {
      flaggedSubstrings.push(pii);
    }
  });

  if (hasPII) {
    threatTypes.push('PII_Leak');
    cleanText = redactedText;
  }

  // Adjust clean text if HTML formatting tags like <b>, <p>, <i> are present (Passive HTML)
  const hasPassiveHtml = /<[a-z/]+[^>]*>/i.test(cleanText);
  if (hasPassiveHtml && !hasXSS && !hasSQLi) {
    // Pure formatting HTML is stripped to match clean markdown/text guidelines
    cleanText = stripHtml(cleanText);
    threatTypes.push('XSS'); // categorized loosely under XSS tags to normalize representation
  }

  // 4. Calculate final security parameters (Risk scores, actions)
  let riskScore = 0;
  let isSafe = true;
  let threatType: 'None' | 'XSS' | 'SQLi' | 'PII_Leak' | 'Multiple' = 'None';
  let sanitizationAction: 'Accept' | 'Strip_HTML' | 'Reject_Entirely' | 'Redact_PII' = 'Accept';

  if (threatTypes.length > 1) {
    threatType = 'Multiple';
  } else if (threatTypes.length === 1) {
    threatType = threatTypes[0];
  }

  // Severe payloads (active scripting elements or injection attacks) get rejected completely
  if (hasSQLi) {
    riskScore = 95;
    isSafe = false;
    sanitizationAction = 'Reject_Entirely';
    cleanText = '';
  } else if (hasXSS && (originalText.includes('<script') || originalText.includes('<iframe') || originalText.toLowerCase().includes('javascript:') || originalText.includes('onerror='))) {
    riskScore = 90;
    isSafe = false;
    sanitizationAction = 'Reject_Entirely';
    cleanText = '';
  } else if (hasXSS) {
    // Passive HTML formatting tags
    riskScore = 50;
    isSafe = false;
    sanitizationAction = 'Strip_HTML';
    cleanText = stripHtml(cleanText);
  } else if (hasPII) {
    riskScore = 35;
    isSafe = true; // PII can be safely accepted because we redacted it successfully
    sanitizationAction = 'Redact_PII';
  }

  return {
    is_safe: isSafe,
    risk_score: riskScore,
    threat_type: threatType,
    flagged_substrings: flaggedSubstrings,
    sanitization_action: sanitizationAction,
    clean_text: cleanText
  };
}
