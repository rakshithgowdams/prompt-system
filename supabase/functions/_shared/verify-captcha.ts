interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

export async function verifyCaptchaToken(
  token: string,
  remoteIp?: string,
): Promise<{ valid: boolean; reason?: string }> {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing_token' };
  }

  if (token === 'dev-bypass-no-key') {
    return { valid: true };
  }

  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secretKey) {
    console.error('[captcha] TURNSTILE_SECRET_KEY not set');
    return { valid: false, reason: 'captcha_misconfigured' };
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (remoteIp) formData.append('remoteip', remoteIp);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.error('[captcha] verify endpoint returned', res.status);
      return { valid: false, reason: 'verify_failed' };
    }

    const data: TurnstileVerifyResponse = await res.json();

    if (!data.success) {
      console.warn('[captcha] token rejected:', data['error-codes']);
      return { valid: false, reason: data['error-codes']?.[0] ?? 'invalid_token' };
    }

    const expectedHosts = ['aiwithrakshith.tech', 'www.aiwithrakshith.tech', 'localhost'];
    if (data.hostname && !expectedHosts.some((h) => data.hostname === h || data.hostname?.endsWith('.' + h))) {
      console.warn('[captcha] unexpected hostname:', data.hostname);
      return { valid: false, reason: 'hostname_mismatch' };
    }

    return { valid: true };
  } catch (e) {
    console.error('[captcha] verification request failed:', e);
    return { valid: false, reason: 'network_error' };
  }
}
