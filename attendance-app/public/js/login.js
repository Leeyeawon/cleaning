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

  location.href = "../employee/pending.html";
}

// Google 로그인
googleLoginBtn?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${location.origin}/employee/login.html`
    }
  });

  if (error) {
    alert("Google 로그인 중 오류가 발생했습니다.");
    console.error(error);
  }
});

// 이름 + 전화번호 + 직원번호 로그인
phoneLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = userNameInput.value.trim();
  const phone = normalizePhone(phoneInput.value);
  const employeeCode = employeeCodeInput.value.trim();

  if (!name || !phone || !employeeCode) {
    alert("이름, 전화번호, 직원번호를 모두 입력해주세요.");
    return;
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, phone, employee_code, status")
    .eq("name", name)
    .eq("phone", phone)
    .eq("employee_code", employeeCode)
    .maybeSingle();

  function normalizePhone(phone) {
    return phone.replaceAll("-", "").replaceAll(" ", "").trim();
  }

  if (error) {
    alert("직원 정보를 확인하는 중 오류가 발생했습니다.");
    console.error(error);
    return;
  }

  if (!user) {
    alert("등록된 직원 정보가 없습니다. 이름, 전화번호, 직원번호를 확인해주세요.");
    return;
  }

  localStorage.setItem("employeeUserId", user.id);
  localStorage.setItem("employeeName", user.name);
  localStorage.setItem("employeeLoginType", "phone");

  goByStatus(user.status);
});

// Google 로그인 후 돌아왔을 때 상태 확인
async function checkGoogleLogin() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, name, email, status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!profile) {
    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || "직원",
      login_type: "google",
      status: "pending"
    });

    if (insertError) {
      console.error(insertError);
      alert("사용자 등록 중 오류가 발생했습니다.");
      return;
    }

    localStorage.setItem("employeeUserId", user.id);
    localStorage.setItem("employeeName", user.user_metadata?.full_name || "직원");
    localStorage.setItem("employeeLoginType", "google");

    location.href = "../employee/pending.html";
    return;
  }

  localStorage.setItem("employeeUserId", profile.id);
  localStorage.setItem("employeeName", profile.name || "직원");
  localStorage.setItem("employeeLoginType", "google");

  goByStatus(profile.status);
}

checkGoogleLogin();