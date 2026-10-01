const SESSION_COOKIE = "__Host-session";

function getCookie(request, name) {
  const header =
    request.headers.get("Cookie") || "";

  for (const part of header.split(";")) {
    const [key, ...value] =
      part.trim().split("=");

    if (key === name) {
      return value.join("=");
    }
  }

  return null;
}

async function sha256Base64url(value) {
  const data =
    new TextEncoder().encode(value);

  const digest =
    await crypto.subtle.digest(
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

function clearSessionCookie() {
  return (
    SESSION_COOKIE +
    "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
  );
}

export async function onRequestPost(context) {
  const request = context.request;

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

  // Logout somente pode ser iniciado
  // pelo proprio site.
  const origin =
    request.headers.get("Origin");

  if (origin !== baseUrl) {
    return new Response(
      "Origin invalida.",
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const sessionToken =
    getCookie(
      request,
      SESSION_COOKIE
    );

  if (sessionToken) {
    const idHash =
      await sha256Base64url(
        sessionToken
      );

    await context.env.DB.prepare(
      "DELETE FROM sessions WHERE id_hash = ?"
    )
      .bind(idHash)
      .run();
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie":
          clearSessionCookie(),
      },
    }
  );
}
