const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

const TX_COOKIE = "__Host-oauth-tx";
const SESSION_COOKIE = "__Host-session";

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

async function revokeGitHubToken(clientId, clientSecret, accessToken) {
  try {
    await fetch(
      "https://api.github.com/applications/" +
        encodeURIComponent(clientId) +
        "/token",
      {
        method: "DELETE",
        headers: {
          "Authorization":
            "Basic " +
            btoa(clientId + ":" + clientSecret),
          "Accept": "application/vnd.github+json",
          "User-Agent": "OAuth-Lab",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      }
    );
  } catch (_) {
    // Nao interrompe a criacao da sessao local
    // caso a revogacao apresente falha de rede.
  }
}

export async function onRequestGet(context) {
  const request = context.request;
  const url = new URL(request.url);

  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      "Login GitHub cancelado: " + error,
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
    "SELECT id_hash, provider, state_hash, expires_at " +
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
    transaction.provider !== "github" ||
    transaction.expires_at <= now
  ) {
    return new Response(
      "Transacao OAuth expirada.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const receivedStateHash =
    await sha256Base64url(state);

  if (receivedStateHash !== transaction.state_hash) {
    return new Response("State invalido.", {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": clearTransactionCookie(),
      },
    });
  }

  const clientId = context.env.GITHUB_CLIENT_ID;
  const clientSecret =
    context.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(
      "Credenciais GitHub nao configuradas.",
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const redirectUri =
    "https://brayanxss-github-io.pages.dev/oauth/callback/github";

  const tokenResponse = await fetch(
    GITHUB_TOKEN_URL,
    {
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
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!tokenResponse.ok) {
    return new Response(
      "Falha ao trocar o codigo OAuth do GitHub.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
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
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const githubHeaders = {
    "Authorization": "Bearer " + accessToken,
    "Accept": "application/vnd.github+json",
    "User-Agent": "OAuth-Lab",
  };

  const userResponse = await fetch(
    GITHUB_USER_URL,
    {
      headers: githubHeaders,
    }
  );

  if (!userResponse.ok) {
    await revokeGitHubToken(
      clientId,
      clientSecret,
      accessToken
    );

    return new Response(
      "Nao foi possivel obter o usuario do GitHub.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
        },
      }
    );
  }

  const githubUser =
    await userResponse.json();

  let email = githubUser.email || null;

  if (!email) {
    const emailResponse = await fetch(
      GITHUB_EMAILS_URL,
      {
        headers: githubHeaders,
      }
    );

    if (emailResponse.ok) {
      const emails =
        await emailResponse.json();

      const primaryEmail =
        emails.find(
          (item) =>
            item.primary === true &&
            item.verified === true
        );

      if (primaryEmail) {
        email = primaryEmail.email;
      }
    }
  }

  if (!githubUser.id) {
    await revokeGitHubToken(
      clientId,
      clientSecret,
      accessToken
    );

    return new Response(
      "Usuario GitHub sem identificador.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": clearTransactionCookie(),
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

  const sessionToken =
    base64url(randomBytes(32));

  const sessionIdHash =
    await sha256Base64url(sessionToken);

  const sessionExpiresAt =
    now + 8 * 60 * 60;

  await context.env.DB.prepare(
    "INSERT INTO sessions " +
    "(id_hash, issuer, subject, email, display_name, expires_at, created_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
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

  await context.env.DB.prepare(
    "DELETE FROM oauth_transactions WHERE id_hash = ?"
  )
    .bind(txIdHash)
    .run();

  await revokeGitHubToken(
    clientId,
    clientSecret,
    accessToken
  );

  const cookie =
    SESSION_COOKIE +
    "=" +
    sessionToken +
    "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800";

  return new Response(null, {
    status: 302,
    headers: {
      "Location":
        "https://brayanxss-github-io.pages.dev/",
      "Cache-Control": "no-store",
      "Set-Cookie": cookie,
    },
  });
}
