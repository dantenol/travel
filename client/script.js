async function login() {
  const username = document.getElementById("email").value;
  const password = document.getElementById("pwd").value;

  const data = await create(
    "users/login",
    {},
    {
      email: username,
      password,
    }
  );

  localStorage.setItem("access_token", data.id);
  localStorage.setItem("userId", data.userId);
  window.location.href = "map";
}

document.addEventListener("DOMContentLoaded", function () {
  if (localStorage.access_token && localStorage.userId) {
    window.location.href = "map";
  } else {
    localStorage.clear();
  }
});
