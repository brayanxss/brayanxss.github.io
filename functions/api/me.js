const SESSION_COOKIE = "__Host-session";

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";

  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");

    if (key === name) {
      return value.join("=");
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

export async function onRequestGet(context) {
  const sessionToken = getCookie(context.request, SESSION_COOKIE);

  if (!sessionToken) {
    return Response.json(
      { authenticated: false },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const idHash = await sha256Base64url(sessionToken);

  const session = await context.env.DB.prepare(
    `SELECT issuer, subject, email, display_name, expires_at
     FROM sessions
     WHERE id_hash = ?`
  )
    .bind(idHash)
    .first();

  if (!session) {
    return Response.json(
      { authenticated: false },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const now = Math.floor(Date.now() / 1000);

  if (session.expires_at <= now) {
    await context.env.DB.prepare(
      `DELETE FROM sessions WHERE id_hash = ?`
    )
      .bind(idHash)
      .run();

    return Response.json(
      { authenticated: false },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return Response.json(
    {
      authenticated: true,
      issuer: session.issuer,
      subject: session.subject,
      email: session.email,
      displayName: session.display_name,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
