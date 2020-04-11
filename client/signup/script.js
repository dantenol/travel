async function createAccount() {
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const email = document.getElementById("email").value;
  const fullName = document.getElementById("name").value;
  const password = document.getElementById("pwd").value;
  const passwordRepeat = document.getElementById("pwdRepeat").value;

  if (password.length < 6) {
    document.getElementById("pwd").value = "";
    document.getElementById("pwdRepeat").value = "";
    return alert("Ops, a senha deve conter no mínimo 6 caracteres.");
  } else if (password !== passwordRepeat) {
    document.getElementById("pwd").value = "";
    document.getElementById("pwdRepeat").value = "";
    return alert("Ops, as senhas digitadas não são iguais.");
  } else if (!emailRegex.test(email)) {
    return alert("Ops, você digitou um email inválido.");
  } else if (fullName.length < 3) {
    return alert("Ops, você digitou um nome inválido.");
  }

  const data = await create(
    "users",
    {},
    {
      email,
      password,
      fullName,
    }
  );
  if (!data.error) {
    const login = await create(
      "users/login",
      {},
      {
        email,
        password,
      }
    );
    localStorage.setItem("access_token", login.id);
    localStorage.setItem("userId", login.userId);
    window.location.href = "/map";
  } else {
    console.log(data);
  }
}
