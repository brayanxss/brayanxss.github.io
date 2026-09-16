```javascript
document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const userInfo = document.getElementById("user-info");
  const navbarUser = document.getElementById("navbar-user");
  const sessionState = document.getElementById("session-state");
  const logout = document.getElementById("logout");

  async function loadSession() {
    try {
      const response = await fetch("/api/me", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        status.textContent =
          "Nenhuma sessão neste navegador.";

        userInfo.innerHTML =
          "<p class='text-muted'>Você não está autenticado.</p>";

        navbarUser.textContent =
          "Visitante";

        sessionState.textContent =
          "Inativa";

        logout.style.display =
          "none";

        return;
      }

      const user = await response.json();

      if (!user.authenticated) {
        status.textContent =
          "Nenhuma sessão neste navegador.";

        userInfo.innerHTML =
          "<p class='text-muted'>Você não está autenticado.</p>";

        navbarUser.textContent =
          "Visitante";

        sessionState.textContent =
          "Inativa";

        logout.style.display =
          "none";

        return;
      }

      status.textContent =
        "Sessão autenticada.";

      navbarUser.textContent =
        user.email ||
        user.displayName ||
        user.subject ||
        "Usuário";

      sessionState.textContent =
        "Ativa";

      userInfo.innerHTML = `
        <p>
          <strong>Nome:</strong>
          ${escapeHtml(user.displayName || "Não informado")}
        </p>

        <p>
          <strong>E-mail:</strong>
          ${escapeHtml(user.email || "Não informado")}
        </p>

        <p>
          <strong>Provedor:</strong>
          ${escapeHtml(user.issuer || "Não informado")}
        </p>

        <p>
          <strong>Identificador:</strong>
          ${escapeHtml(user.subject || "Não informado")}
        </p>
      `;

      logout.style.display =
        "inline-block";

    } catch (error) {

      status.textContent =
        "Não foi possível consultar a sessão.";

      userInfo.innerHTML =
        "<p class='text-danger'>Erro ao consultar /api/me.</p>";

      sessionState.textContent =
        "Indisponível";
    }
  }


  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  logout.addEventListener("click", async () => {

    logout.disabled = true;

    try {

      const response = await fetch("/oauth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      status.textContent =
        "Não foi possível encerrar a sessão.";

    } catch (error) {

      status.textContent =
        "Não foi possível encerrar a sessão.";

    } finally {

      logout.disabled = false;
    }
  });


  await loadSession();
});
```
