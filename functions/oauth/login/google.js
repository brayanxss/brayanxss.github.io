const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const TX_COOKIE = "__Host-oauth-tx";
const TX_MAX_AGE = 600;

function randomBytes(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256Base64url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return base64url(new Uint8Array(digest));
}

export async function onRequestGet(context) {
  const clientId = context.env.GOOGLE_CLIENT_ID;
  const baseUrl = context.env.PUBLIC_BASE_URL;

  if (!clientId || !baseUrl) {
    return new Response(
      "Configuracao OAuth incompleta.",
      { status: 500 }
    );
  }

  // Identificador aleatorio da transacao
  const txId = base64url(randomBytes(32));

  // Valores OAuth
  const state = base64url(randomBytes(32));
  const nonce = base64url(randomBytes(32));
  const codeVerifier = base64url(randomBytes(32));

  // Somente os hashes sao armazenados no D1
  const idHash = await sha256Base64url(txId);
  const stateHash = await sha256Base64url(state);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TX_MAX_AGE;

  await context.env.DB.prepare(
    `INSERT INTO oauth_transactions
      (id_hash, provider, state_hash, nonce, code_verifier, expires_at)
     VALUES (?, 'google', ?, ?, ?, ?)`
  )
    .bind(
      idHash,
      stateHash,
      nonce,
      codeVerifier,
      expiresAt
    )
    .run();

  const challenge =
    await sha256Base64url(codeVerifier);

  const redirectUri =
    `${baseUrl}/oauth/callback/google`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location:
        `${GOOGLE_AUTH_URL}?${params.toString()}`,

      "Set-Cookie":
        `${TX_COOKIE}=${txId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TX_MAX_AGE}`,

      "Cache-Control": "no-store",
    },
  });
}
