export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") || "";

  // VULNERÁVEL: a entrada do usuário é inserida diretamente na consulta.
  const query = `SELECT name FROM demo_users WHERE name = '${name}'`;

  // Não executa a consulta. Apenas mostra o padrão inseguro para revisão.
  return Response.json({
    demo: true,
    vulnerablePattern: query,
    warning: "Consulta SQL vulnerável demonstrada; não foi executada."
  });
}
