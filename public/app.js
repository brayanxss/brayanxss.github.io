document.addEventListener("DOMContentLoaded", async function () {

const status = document.getElementById("status");
const userInfo = document.getElementById("user-info");
const navbarUser = document.getElementById("navbar-user");
const sessionState = document.getElementById("session-state");
const logoutForm = document.getElementById("logout-form");

async function loadSession() {

```
try {

  const response = await fetch("/api/me", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store"
  });

  const user = await response.json();

  console.log("Resposta /api/me:", user);


  if (!response.ok || !user.authenticated) {

    status.textContent =
      "Nenhuma sessão neste navegador.";

    userInfo.textContent =
      "Você não está autenticado.";

    navbarUser.textContent =
      "Visitante";

    sessionState.textContent =
      "Inativa";

    if (logoutForm) {
      logoutForm.style.display = "none";
    }

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


  userInfo.innerHTML =
    "<p><strong>Nome:</strong> " +
    (user.displayName || "Não informado") +
    "</p>" +

    "<p><strong>E-mail:</strong> " +
    (user.email || "Não informado") +
    "</p>" +

    "<p><strong>Provedor:</strong> " +
    (user.issuer || "Não informado") +
    "</p>" +

    "<p><strong>Identificador:</strong> " +
    (user.subject || "Não informado") +
    "</p>";


  if (logoutForm) {
    logoutForm.style.display = "block";
  }

} catch (error) {

  console.error("Erro ao consultar /api/me:", error);

  status.textContent =
    "Não foi possível consultar a sessão.";

  userInfo.textContent =
    "Erro ao consultar /api/me.";

  sessionState.textContent =
    "Indisponível";

  if (logoutForm) {
    logoutForm.style.display = "none";
  }
}
```

}

if (logoutForm) {

```
logoutForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();


    const button =
      logoutForm.querySelector("button");


    if (button) {
      button.disabled = true;
    }


    try {

      const response = await fetch(
        "/oauth/logout",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store"
        }
      );


      if (response.ok) {

        window.location.href = "/";
        return;

      }


      status.textContent =
        "Não foi possível encerrar a sessão.";

    } catch (error) {

      console.error(
        "Erro no logout:",
        error
      );

      status.textContent =
        "Não foi possível encerrar a sessão.";

    } finally {

      if (button) {
        button.disabled = false;
      }

    }
  }
);
```

}

await loadSession();

});
