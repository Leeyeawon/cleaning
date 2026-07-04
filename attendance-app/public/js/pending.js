import supabase from "./supabase.js";

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();

  localStorage.removeItem("employeeUserId");
  localStorage.removeItem("employeeName");
  localStorage.removeItem("employeeLoginType");

  location.href = "../employee/login.html";
});