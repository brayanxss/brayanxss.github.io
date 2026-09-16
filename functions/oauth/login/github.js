const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";

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
  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64url(new Uint8Array(digest));
}

export async function onRequestGet(context) {
  const clientId = context.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(
      "GITHUB_CLIENT_ID nao configurado.",
      { status: 500 }
    );
  }

  const state = base64url(randomBytes(32));
  const idHash = await sha256Base64url(state);
  const stateHash = await sha256Base64url(state);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TX_MAX_AGE;

  await context.env.DB.prepare(
    `INSERT INTO oauth_transactions
      (id_hash, provider, state_hash, nonce, code_verifier, expires_at)
     VALUES (?, 'github', ?, NULL, '', ?)`
  )
    .bind(
      idHash,
      stateHash,
      expiresAt
    )
    .run();

  const redirectUri =
    "https://brayanxss-github-io.pages.dev/oauth/callback/github";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state: state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      "Location": `${GITHUB_AUTH_URL}?${params.toString()}`,
      "Set-Cookie":
        `${TX_COOKIE}=${idHash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TX_MAX_AGE}`,
      "Cache-Control": "no-store",
    },
  });
}
