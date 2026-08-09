// Local PII minimization for ScamLens analysis inputs.
(function () {
  const URL_TOKEN_PREFIX = '__SCAMLENS_URL_';
  const URL_PATTERN = /\bhttps?:\/\/[^\s<>'"`]+/gi;
  const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;
  const CARD_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;
  const PHONE_PATTERN = /(?:\+?\d{1,3}[ .-]?)?(?:\(?0\d{2,3}\)?[ .-]?)\d{3,4}[ .-]?\d{3,4}\b/g;
  const PASSWORD_PATTERN = /((?:password|pass|pwd|كلمة\s*المرور)\s*[:=]\s*)([^\s,;]+)/gi;
  const OTP_PATTERN = /((?:(?:otp|one[- ]time|verification|security|auth(?:entication)?|login)\s*(?:code|password|otp)?|رمز\s*(?:التحقق|التأكيد|الأمان))\s*[:=]?\s*)(\d{4,8})\b/gi;
  const ID_PATTERN = /((?:(?:national|civil|identity)\s*(?:id|number)|رقم\s*(?:الهوية|الهوية\s*الوطنية))\s*[:=]?\s*)([A-Z0-9-]{6,20})\b/gi;
  const API_KEY_PATTERN = /\b(?:sk-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/g;
  const BEARER_PATTERN = /((?:bearer|api[- ]?key|access[- ]?token|secret|token)\s*[:=]\s*)([A-Za-z0-9._~-]{16,})/gi;

  function luhn(value) {
    let sum = 0;
    let alternate = false;
    for (let i = value.length - 1; i >= 0; i -= 1) {
      let digit = Number(value[i]);
      if (alternate) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  function redact(text) {
    const source = String(text ?? '');
    const urls = [];
    let value = source.replace(URL_PATTERN, match => {
      const token = `${URL_TOKEN_PREFIX}${urls.length}__`;
      urls.push(match);
      return token;
    });
    let changed = false;
    value = value.replace(EMAIL_PATTERN, () => { changed = true; return '[EMAIL]'; });
    value = value.replace(IBAN_PATTERN, () => { changed = true; return '[IBAN]'; });
    value = value.replace(PASSWORD_PATTERN, (_match, prefix) => { changed = true; return `${prefix}[PASSWORD]`; });
    value = value.replace(OTP_PATTERN, (_match, prefix) => { changed = true; return `${prefix}[OTP]`; });
    value = value.replace(API_KEY_PATTERN, () => { changed = true; return '[API_KEY]'; });
    value = value.replace(BEARER_PATTERN, (_match, prefix) => { changed = true; return `${prefix}[API_KEY]`; });
    value = value.replace(ID_PATTERN, (_match, prefix) => { changed = true; return `${prefix}[ID]`; });
    value = value.replace(CARD_PATTERN, match => {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) { changed = true; return '[CARD]'; }
      return match;
    });
    value = value.replace(PHONE_PATTERN, match => {
      const digits = match.replace(/\D/g, '');
      const looksLikePhone = (digits.length >= 10 && digits.length <= 15 && (/^(?:00|\+)?\d{10,15}$/.test(digits) || /^0\d{9,10}$/.test(digits)));
      if (looksLikePhone) { changed = true; return '[PHONE]'; }
      return match;
    });

    value = value.replace(new RegExp(`${URL_TOKEN_PREFIX}(\\d+)__`, 'g'), (_match, index) => urls[Number(index)]);
    return { text: value, changed };
  }

  window.ScamLens = window.ScamLens || {};
  window.ScamLens.redactPII = redact;
})();
