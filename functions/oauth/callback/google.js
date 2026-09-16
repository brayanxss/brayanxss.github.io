const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const TX_COOKIE = "__Host-oauth-tx";
const SESSION_COOKIE = "__Host-session";

function base64urlToBytes(value) {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function base64urlToString(value) {
  return new TextDecoder().decode(base64urlToBytes(value));
}

function parseJwt(token) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("ID token invalido.");
  }

  return {
    header: JSON.parse(base64urlToString(parts[0])),
    payload: JSON.parse(base64urlToString(parts[1])),
    signature: base64urlToBytes(parts[2]),
    signingInput: new TextEncoder().encode(
      parts[0] + "." + parts[1]
    ),
  };
}

async function sha256Base64url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  let binary = "";

  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomBytes(length) {
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

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";

  for (const part of header.split(";")) {
    const pieces = part.trim().split("=");
    const key = pieces.shift();

    if (key === name) {
      return pieces.join("=");
    }
  }

  return null;
}

async function verifyGoogleIdToken(idToken, clientId, expectedNonce) {
  const jwt = parseJwt(idToken);

  if (jwt.header.alg !== "RS256") {
    throw new Error("Algoritmo do ID token invalido.");
  }

  if (!jwt.header.kid) {
    throw new Error("ID token sem kid.");
  }

  const jwksResponse = await fetch(GOOGLE_JWKS_URL);

  if (!jwksResponse.ok) {
    throw new Error("Nao foi possivel obter as chaves do Google.");
  }

  const jwks = await jwksResponse.json();

  const jwk = jwks.keys.find(function (key) {
    return key.kid === jwt.header.kid && key.kty === "RSA";
  });

  if (!jwk) {
    throw new Error("Chave publica do Google nao encontrada.");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    jwt.signature,
    jwt.signingInput
  );

  if (!validSignature) {
    throw new Error("Assinatura do ID token invalida.");
  }

  const claims = jwt.payload;

  if (
    claims.iss !== "https://accounts.google.com" &&
    claims.iss !== "accounts.google.com"
  ) {
    throw new Error("Issuer invalido.");
  }

  if (claims.aud !== clientId) {
    throw new Error("Audience invalida.");
  }

  const now = Math.floor(Date.now() / 1000);

  if (!claims.exp || claims.exp <= now) {
    throw new Error("ID token expirado.");
  }

  if (!claims.sub) {
    throw new Error("ID token sem subject.");
  }

  if (claims.nonce !== expectedNonce) {
    throw new Error("Nonce invalido.");
  }

  return claims;
}

function clearTransactionCookie() {
  return (
    TX_COOKIE +
    "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
}

export async function onRequestGet(context) {
  const request = context.request;
  const url = new URL(request.url);

  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      "Login Google cancelado: " + error,
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Retorno OAuth incompleto.", {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const txIdHash = getCookie(request, TX_COOKIE);

  if (!txIdHash) {
    return new Response("Transacao OAuth ausente.", {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const transaction = await context.env.DB.prepare(
    "SELECT id_hash, provider, state_hash, nonce, code_verifier, expires_at " +
    "FROM oauth_transactions WHERE id_hash = ?"
  )
    .bind(txIdHash)
    .first();

  if (!transaction) {
    return new Response(
      "Transacao OAuth invalida ou inexistente.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    transaction.provider !== "google" ||
    transaction.expires_at <= now
  ) {
    return new Response("Transacao OAuth expirada.", {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": clearTransactionCookie(),
      },
    });
  }

  const receivedStateHash = await sha256Base64url(state);

  if (receivedStateHash !== transaction.state_hash) {
    return new Response("State invalido.", {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": clearTransactionCookie(),
      },
    });
  }

  const clientId = context.env.GOOGLE_CLIENT_ID;
  const clientSecret = context.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(
      "Credenciais Google nao configuradas.",
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const redirectUri =
    "https://brayanxss-github-io.pages.dev/oauth/callback/google";

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      code_verifier: transaction.code_verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return new Response(
      "Falha ao trocar o codigo OAuth.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const tokens = await tokenResponse.json();

  if (!tokens.id_token) {
    return new Response(
      "Google nao retornou um ID token.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  let claims;

  try {
    claims = await verifyGoogleIdToken(
      tokens.id_token,
      clientId,
      transaction.nonce
    );
  } catch (err) {
    return new Response(
      "ID token rejeitado: " + err.message,
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const sessionToken = base64url(randomBytes(32));
  const sessionIdHash = await sha256Base64url(sessionToken);
  const sessionExpiresAt = now + 8 * 60 * 60;

  await context.env.DB.prepare(
    "INSERT INTO sessions " +
    "(id_hash, issuer, subject, email, display_name, expires_at, created_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      sessionIdHash,
      claims.iss,
      claims.sub,
      claims.email || null,
      claims.name || null,
      sessionExpiresAt,
      now
    )
    .run();

  await context.env.DB.prepare(
    "DELETE FROM oauth_transactions WHERE id_hash = ?"
  )
    .bind(txIdHash)
    .run();

  const cookie =
    SESSION_COOKIE +
    "=" +
    sessionToken +
    "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800";

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "https://brayanxss-github-io.pages.dev/",
      "Cache-Control": "no-store",
      "Set-Cookie": cookie,
    },
  });
}
