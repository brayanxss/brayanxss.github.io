document.addEventListener("DOMContentLoaded", function () {
var status = document.getElementById("status");
var userInfo = document.getElementById("user-info");
var navbarUser = document.getElementById("navbar-user");
var sessionState = document.getElementById("session-state");
var logoutForm = document.getElementById("logout-form");

function loadSession() {
fetch("/api/me", {
method: "GET",
credentials: "same-origin",
cache: "no-store"
})
.then(function (response) {
return response.json().then(function (user) {
return {
ok: response.ok,
user: user
};
});
})
.then(function (result) {
var user = result.user;

```
    if (!result.ok || user.authenticated !== true) {
      status.textContent = "Nenhuma sessao neste navegador.";
      userInfo.textContent = "Voce nao esta autenticado.";
      navbarUser.textContent = "Visitante";
      sessionState.textContent = "Inativa";

      if (logoutForm) {
        logoutForm.style.display = "none";
      }

      return;
    }

    status.textContent = "Sessao autenticada.";

    navbarUser.textContent =
      user.email ||
      user.displayName ||
      user.subject ||
      "Usuario";

    sessionState.textContent = "Ativa";

    userInfo.innerHTML =
      "<p><strong>Nome:</strong> " +
      (user.displayName || "Nao informado") +
      "</p>" +
      "<p><strong>E-mail:</strong> " +
      (user.email || "Nao informado") +
      "</p>" +
      "<p><strong>Provedor:</strong> " +
      (user.issuer || "Nao informado") +
      "</p>" +
      "<p><strong>Identificador:</strong> " +
      (user.subject || "Nao informado") +
      "</p>";

    if (logoutForm) {
      logoutForm.style.display = "block";
    }
  })
  .catch(function (error) {
    console.error("Session error:", error);

    status.textContent =
      "Nao foi possivel consultar a sessao.";

    userInfo.textContent =
      "Erro ao consultar /api/me.";

    navbarUser.textContent = "Visitante";
    sessionState.textContent = "Indisponivel";

    if (logoutForm) {
      logoutForm.style.display = "none";
    }
  });
```

}

if (logoutForm) {
logoutForm.addEventListener("submit", function (event) {
event.preventDefault();

```
  var button = logoutForm.querySelector("button");

  if (button) {
    button.disabled = true;
  }

  fetch("/oauth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store"
  })
    .then(function (response) {
      if (response.ok) {
        window.location.href = "/";
        return;
      }

      status.textContent =
        "Nao foi possivel encerrar a sessao.";

      if (button) {
        button.disabled = false;
      }
    })
    .catch(function (error) {
      console.error("Logout error:", error);

      status.textContent =
        "Nao foi possivel encerrar a sessao.";

      if (button) {
        button.disabled = false;
      }
    });
});
```

}

loadSession();
});
