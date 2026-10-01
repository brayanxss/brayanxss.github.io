import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

function jsonError(status, message) {
  return Response.json(
    { erro: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function onRequest(context) {
  const request = context.request;

  // 1) Method check MUST happen first.
  if (request.method !== "POST") {
    return new Response("Método não permitido.", {
      status: 405,
      headers: {
        "Cache-Control": "no-store",
        Allow: "POST",
      },
    });
  }

  // 2) Body / JSON / number validation.
  let bodyText;
  try {
    bodyText = await request.text();
  } catch {
    return jsonError(400, "Corpo ausente ou inválido.");
  }

  if (!bodyText.trim()) {
    return jsonError(400, "Corpo ausente.");
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return jsonError(400, "JSON inválido.");
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Object.prototype.hasOwnProperty.call(body, "numero") ||
    !numeroValido(body.numero)
  ) {
    return jsonError(400, "Número deve ser um inteiro entre 1 e 100.");
  }

  // 3) Token validation.
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return jsonError(401, "Token ausente ou inválido.");
  }

  const token = match[1].trim();
  if (!token) {
    return jsonError(401, "Token ausente ou inválido.");
  }

  const clientId = context.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return jsonError(401, "Token inválido.");
  }

  let tokenResponse;
  let tokenInfo;

  try {
    const url = new URL(TOKENINFO_URL);
    url.searchParams.set("id_token", token);

    tokenResponse = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cf: {
        cacheTtl: 0,
      },
    });
  } catch {
    return jsonError(401, "Token inválido.");
  }

  if (!tokenResponse.ok) {
    return jsonError(401, "Token inválido, expirado ou rejeitado.");
  }

  try {
    tokenInfo = await tokenResponse.json();
  } catch {
    return jsonError(401, "Token inválido.");
  }

  const emailVerified =
    tokenInfo.email_verified === true ||
    tokenInfo.email_verified === "true";

  if (
    tokenInfo.aud !== clientId ||
    !emailVerified ||
    typeof tokenInfo.email !== "string" ||
    tokenInfo.email.length === 0
  ) {
    return jsonError(401, "Token inválido, expirado ou e-mail não verificado.");
  }

  try {
    const svg = gerarDesenho(body.numero, tokenInfo.email);

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return jsonError(400, "Não foi possível gerar o desenho.");
  }
}

export async function onRequestPost(context) {
  return onRequest(context);
}
