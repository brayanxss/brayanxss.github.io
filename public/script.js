let idToken = null;
let objectUrl = null;

function setMessage(type, message) {
  const errorBox = document.getElementById("error-message");
  const successBox = document.getElementById("success-message");

  errorBox.classList.add("d-none");
  successBox.classList.add("d-none");

  if (type === "error") {
    errorBox.textContent = message;
    errorBox.classList.remove("d-none");
  } else if (type === "success") {
    successBox.textContent = message;
    successBox.classList.remove("d-none");
  }
}

function setLoginState(authenticated, email) {
  const loginState = document.getElementById("login-state");
  const navbarUser = document.getElementById("navbar-user");
  const loginStatus = document.getElementById("login-status");
  const googleButton = document.getElementById("google-signin-button");

  if (authenticated) {
    loginState.textContent = "Ativo";
    navbarUser.textContent = email || "Google";
    loginStatus.textContent =
      "Google autenticado. A assinatura será feita com o e-mail verificado da conta.";
  } else {
    loginState.textContent = "Inativo";
    navbarUser.textContent = "Não autenticado";
    loginStatus.textContent =
      "Faça login com sua conta Google para gerar o desenho.";
  }
}

function extractJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// Google Identity Services calls this callback with the ID token.
window.handleCredentialResponse = function handleCredentialResponse(response) {
  if (!response || typeof response.credential !== "string") {
    idToken = null;
    setLoginState(false);
    setMessage("error", "Não foi possível obter o ID token do Google.");
    return;
  }

  idToken = response.credential;
  const payload = extractJwtPayload(idToken);
  setLoginState(true, payload && payload.email ? payload.email : "Google");
  setMessage("success", "Login Google concluído.");
};

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("desenho-form");
  const numberInput = document.getElementById("numero");
  const generateButton = document.getElementById("gerar");
  const svgContainer = document.getElementById("svg-container");
  const downloadLink = document.getElementById("download-svg");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setMessage("", "");

    const numero = Number(numberInput.value);

    if (!Number.isInteger(numero) || numero < 1 || numero > 100) {
      setMessage("error", "Informe um número inteiro entre 1 e 100.");
      return;
    }

    if (!idToken) {
      setMessage("error", "Faça login com o Google antes de gerar o desenho.");
      return;
    }

    generateButton.disabled = true;
    generateButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Gerando...';

    try {
      const response = await fetch("/api/desenho", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + idToken
        },
        body: JSON.stringify({ numero })
      });

      if (response.status === 400) {
        setMessage("error", "Dados inválidos. Informe um número inteiro entre 1 e 100.");
        return;
      }

      if (response.status === 401) {
        idToken = null;
        setLoginState(false);
        setMessage("error", "A autenticação Google expirou ou é inválida. Faça login novamente.");
        return;
      }

      if (!response.ok) {
        setMessage("error", "Não foi possível gerar o desenho.");
        return;
      }

      const svgText = await response.text();

      svgContainer.innerHTML = svgText;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }

      objectUrl = URL.createObjectURL(
        new Blob([svgText], { type: "image/svg+xml;charset=utf-8" })
      );

      downloadLink.href = objectUrl;
      downloadLink.classList.remove("d-none");

      setMessage("success", "Desenho gerado e assinado pelo e-mail verificado do Google.");
    } catch (error) {
      console.error(error);
      setMessage("error", "Erro de comunicação com o servidor.");
    } finally {
      generateButton.disabled = false;
      generateButton.innerHTML = '<i class="fa fa-paint-brush"></i> Gerar desenho';
    }
  });
});
