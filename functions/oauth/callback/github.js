const GITHUB_TOKEN_URL =
  "https://github.com/login/oauth/access_token";

const GITHUB_USER_URL =
  "https://api.github.com/user";

const GITHUB_API_VERSION = "2026-03-10";

const TX_COOKIE = "__Host-oauth-tx";
const SESSION_COOKIE = "__Host-session";

function getCookie(request, name) {
  const header =
    request.headers.get("Cookie") || "";

  for (const part of header.split(";")) {
    const pieces = part.trim().split("=");
    const key = pieces.shift();

    if (key === name) {
      return pieces.join("=");
    }
  }

  return null;
}

async function sha256Base64url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  let binary = "";

  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

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

function clearTransactionCookie() {
  return (
    TX_COOKIE +
    "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
}

async function revokeGitHubToken(
  clientId,
  clientSecret,
  accessToken
) {
  const response = await fetch(
    "https://api.github.com/applications/" +
      encodeURIComponent(clientId) +
      "/grant",
    {
      method: "DELETE",

      headers: {
        "Authorization":
          "Basic " +
          btoa(
            clientId +
              ":" +
              clientSecret
          ),

        "Accept":
          "application/vnd.github+json",

        "X-GitHub-Api-Version":
          GITHUB_API_VERSION,

        "Content-Type":
          "application/json",

        "User-Agent":
          "OAuth-Lab",
      },

      body: JSON.stringify({
        access_token: accessToken,
      }),
    }
  );

  return response.status === 204;
}

export async function onRequestGet(context) {
  const request = context.request;
  const url = new URL(request.url);

  const baseUrl =
    context.env.PUBLIC_BASE_URL;

  if (!baseUrl) {
    return new Response(
      "PUBLIC_BASE_URL nao configurada.",
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const error =
    url.searchParams.get("error");

  if (error) {
    return new Response(
      "Login GitHub cancelado.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const code =
    url.searchParams.get("code");

  const state =
    url.searchParams.get("state");

  if (!code || !state) {
    return new Response(
      "Retorno OAuth incompleto.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const txId =
    getCookie(request, TX_COOKIE);

  if (!txId) {
    return new Response(
      "Transacao OAuth ausente.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // O cookie contem o valor aleatorio.
  // O D1 contem somente seu hash.
  const txIdHash =
    await sha256Base64url(txId);

  const transaction =
    await context.env.DB.prepare(
      `SELECT
        id_hash,
        provider,
        state_hash,
        code_verifier,
        expires_at
       FROM oauth_transactions
       WHERE id_hash = ?`
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
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const now =
    Math.floor(Date.now() / 1000);

  if (
    transaction.provider !== "github" ||
    transaction.expires_at <= now
  ) {
    return new Response(
      "Transacao OAuth expirada.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const receivedStateHash =
    await sha256Base64url(state);

  if (
    receivedStateHash !==
    transaction.state_hash
  ) {
    return new Response(
      "State invalido.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const clientId =
    context.env.GITHUB_CLIENT_ID;

  const clientSecret =
    context.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(
      "Credenciais GitHub nao configuradas.",
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const redirectUri =
    `${baseUrl}/oauth/callback/github`;

  // Troca do codigo pelo access token
  const tokenResponse =
    await fetch(GITHUB_TOKEN_URL, {
      method: "POST",

      headers: {
        "Accept":
          "application/json",

        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        code_verifier:
          transaction.code_verifier,
        redirect_uri:
          redirectUri,
      }),
    });

  if (!tokenResponse.ok) {
    return new Response(
      "Falha ao trocar o codigo OAuth do GitHub.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const tokenData =
    await tokenResponse.json();

  const accessToken =
    tokenData.access_token;

  if (!accessToken) {
    return new Response(
      "GitHub nao retornou um access token.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  if (
    typeof tokenData.token_type !==
      "string" ||
    tokenData.token_type.toLowerCase() !==
      "bearer"
  ) {
    return new Response(
      "Tipo de token GitHub invalido.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  // O access token fica somente nesta Function.
  const githubHeaders = {
    "Authorization":
      "Bearer " + accessToken,

    "Accept":
      "application/vnd.github+json",

    "X-GitHub-Api-Version":
      GITHUB_API_VERSION,

    "User-Agent":
      "OAuth-Lab",
  };

  // Obtem somente os dados publicos necessarios.
  const userResponse =
    await fetch(
      GITHUB_USER_URL,
      {
        headers: githubHeaders,
      }
    );

  if (!userResponse.ok) {
    return new Response(
      "Nao foi possivel obter o usuario do GitHub.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const githubUser =
    await userResponse.json();

  if (
    !Number.isInteger(githubUser.id)
  ) {
    return new Response(
      "Usuario GitHub sem identificador valido.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  const subject =
    String(githubUser.id);

  const displayName =
    githubUser.name ||
    githubUser.login ||
    null;

  const email =
    githubUser.email || null;

  /*
   * Revoga a autorizacao do GitHub.
   * A sessao local so pode ser criada
   * se a revogacao retornar HTTP 204.
   */
  const revoked =
    await revokeGitHubToken(
      clientId,
      clientSecret,
      accessToken
    );

  if (!revoked) {
    return new Response(
      "Nao foi possivel revogar a autorizacao do GitHub.",
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            clearTransactionCookie(),
        },
      }
    );
  }

  /*
   * A transacao OAuth e consumida antes
   * da criacao da sessao.
   */
  await context.env.DB.prepare(
    "DELETE FROM oauth_transactions WHERE id_hash = ?"
  )
    .bind(txIdHash)
    .run();

  // Criacao da sessao local opaca.
  const sessionToken =
    base64url(randomBytes(32));

  const sessionIdHash =
    await sha256Base64url(
      sessionToken
    );

  const sessionExpiresAt =
    now + 8 * 60 * 60;

  await context.env.DB.prepare(
    `INSERT INTO sessions
      (id_hash, issuer, subject, email,
       display_name, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      sessionIdHash,
      "https://github.com",
      subject,
      email,
      displayName,
      sessionExpiresAt,
      now
    )
    .run();

  const sessionCookie =
    SESSION_COOKIE +
    "=" +
    sessionToken +
    "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800";

  const responseHeaders =
    new Headers();

  responseHeaders.set(
    "Location",
    baseUrl + "/"
  );

  responseHeaders.set(
    "Cache-Control",
    "no-store"
  );

  responseHeaders.append(
    "Set-Cookie",
    sessionCookie
  );

  responseHeaders.append(
    "Set-Cookie",
    clearTransactionCookie()
  );

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
}
