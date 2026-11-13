const MSG91_OTP_URL = 'https://control.msg91.com/api/v5/otp';

function getMsg91Config() {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    const error = new Error('MSG91 OTP is not configured on the server.');
    error.status = 503;
    throw error;
  }
  return { authKey, templateId };
}

async function readMsg91Response(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || String(result.type || '').toLowerCase() !== 'success') {
    const error = new Error('MSG91 could not complete the OTP request. Check the Auth Key, template, and account SMS configuration.');
    error.status = response.status === 401 ? 503 : 502;
    throw error;
  }
  return result;
}

export async function sendMsg91Otp(mobile) {
  const { authKey, templateId } = getMsg91Config();
  const url = new URL(MSG91_OTP_URL);
  url.searchParams.set('template_id', templateId);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp_length', process.env.MSG91_OTP_LENGTH || '6');
  url.searchParams.set('otp_expiry', process.env.MSG91_OTP_EXPIRY || '5');

  const response = await fetch(url, {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(15000)
  });
  return readMsg91Response(response);
}

export async function verifyMsg91Otp(mobile, otp) {
  const { authKey } = getMsg91Config();
  const url = new URL(`${MSG91_OTP_URL}/verify`);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', otp);

  const response = await fetch(url, {
    method: 'GET',
    headers: { authkey: authKey },
    signal: AbortSignal.timeout(15000)
  });
  // MSG91 can return HTTP 200 when an OTP is invalid. Its `type` field is authoritative.
  const result = await response.json().catch(() => ({}));
  return { httpOk: response.ok, ...result };
}

export async function resendMsg91Otp(mobile) {
  const { authKey } = getMsg91Config();
  const url = new URL(`${MSG91_OTP_URL}/retry`);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('retrytype', 'text');

  const response = await fetch(url, {
    method: 'GET',
    headers: { authkey: authKey },
    signal: AbortSignal.timeout(15000)
  });
  return readMsg91Response(response);
}
