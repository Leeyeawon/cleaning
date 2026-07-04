import supabase from "./supabase.js";

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "../employee/login.html";
});