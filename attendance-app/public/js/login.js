import supabase from "./supabase.js";

const googleLoginBtn = document.getElementById("googleLoginBtn");
const phoneLoginForm = document.getElementById("phoneLoginForm");
const userNameInput = document.getElementById("userNameInput");
const phoneInput = document.getElementById("phoneInput");
const employeeCodeInput = document.getElementById("employeeCodeInput");

function normalizePhone(phone) {
  return phone.replaceAll("-", "").replaceAll(" ", "").trim();
}

function goByStatus(status) {
  if (status === "active") {
    location.href = "../employee/index.html";
    return;
  }

  if (status === "pending") {
    location.href = "../employee/pending.html";
    return;
  }

  if (status === "inactive") {
    alert("비활성화된 계정입니다. 관리자에게 문의해주세요.");
    return;
  }

  alert("승인되지 않은 계정입니다.");
  location.href = "../employee/pending.html";
}

phoneLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = userNameInput.value.trim();
  const phone = normalizePhone(phoneInput.value);
  const employeeCode = employeeCodeInput.value.trim();

  if (!name || !phone || !employeeCode) {
    alert("이름, 전화번호, 직원번호를 모두 입력해주세요.");
    return;
  }

  const { data, error } = await supabase.rpc("create_employee_session", {
    p_name: name,
    p_phone: phone,
    p_employee_code: employeeCode,
  });

  if (error) {
    console.error("직원 로그인 오류:", error);
    alert("로그인에 실패했습니다. 이름, 전화번호, 직원번호를 확인해주세요.");
    return;
  }

  const session = data?.[0];

  if (!session?.session_token) {
    alert("로그인 정보를 확인하지 못했습니다.");
    return;
  }

  localStorage.setItem("employeeSessionToken", session.session_token);
  localStorage.setItem("employeeName", session.user_name || "직원");
  localStorage.setItem("employeeLoginType", "phone");

  localStorage.removeItem("employeeUserId");

  goByStatus(session.user_status);
});

googleLoginBtn?.addEventListener("click", () => {
  alert("현재 직원 로그인은 이름 + 전화번호 + 직원번호 방식으로 사용해주세요.");
});