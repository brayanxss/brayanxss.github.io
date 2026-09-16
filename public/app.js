document.addEventListener("DOMContentLoaded", function () {
var status = document.getElementById("status");
var userInfo = document.getElementById("user-info");
var navbarUser = document.getElementById("navbar-user");
var sessionState = document.getElementById("session-state");
var logoutForm = document.getElementById("logout-form");

fetch("/api/me", {
method: "GET",
credentials: "same-origin",
cache: "no-store"
})
.then(function (response) {
return response.json();
})
.then(function (user) {
console.log("Resposta /api/me:", user);


  if (user.authenticated !== true) {
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
  sessionState.textContent = "Ativa";

  navbarUser.textContent =
    user.email ||
    user.displayName ||
    user.subject ||
    "Usuario";

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
  console.error("Erro /api/me:", error);

  status.textContent = "Erro ao consultar a sessao.";
  sessionState.textContent = "Indisponivel";
  userInfo.textContent = "Nao foi possivel consultar a sessao.";
  navbarUser.textContent = "Visitante";

  if (logoutForm) {
    logoutForm.style.display = "none";
  }
});


if (logoutForm) {
logoutForm.addEventListener("submit", function (event) {
event.preventDefault();


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

      status.textContent = "Nao foi possivel encerrar a sessao.";

      if (button) {
        button.disabled = false;
      }
    })
    .catch(function (error) {
      console.error("Erro logout:", error);

      status.textContent = "Nao foi possivel encerrar a sessao.";

      if (button) {
        button.disabled = false;
      }
    });
});

}
});
