import supabase from "./supabase.js";
import { getCurrentAdmin } from "./adminAuth.js";

const adminLoginForm =
  document.getElementById("adminLoginForm");

const adminEmailInput =
  document.getElementById("adminEmailInput");

const adminPasswordInput =
  document.getElementById("adminPasswordInput");

const adminLoginButton =
  document.getElementById("adminLoginButton");

const adminLoginMessage =
  document.getElementById("adminLoginMessage");

function showMessage(message, type = "error") {
  if (!adminLoginMessage) return;

  adminLoginMessage.textContent = message;
  adminLoginMessage.className = `admin-login-message ${type}`;
}

function setLoading(isLoading) {
  if (!adminLoginButton) return;

  adminLoginButton.disabled = isLoading;
  adminLoginButton.textContent = isLoading
    ? "로그인 확인 중..."
    : "관리자 로그인";
}

/**
 * 이미 로그인한 관리자는 대시보드로 이동
 */
async function checkExistingLogin() {
  const admin = await getCurrentAdmin();

  if (admin) {
    location.replace("./admin.html");
  }
}

adminLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value;

  if (!email || !password) {
    showMessage("이메일과 비밀번호를 모두 입력해 주세요.");
    return;
  }

  setLoading(true);
  showMessage("");

  try {
    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      throw loginError;
    }

    const admin = await getCurrentAdmin();

    if (!admin) {
      await supabase.auth.signOut();

      showMessage(
        "관리자 권한이 없거나 비활성화된 계정입니다."
      );

      return;
    }

    showMessage("로그인되었습니다.", "success");

    location.replace("./admin.html");
  } catch (error) {
    console.error("관리자 로그인 실패:", error);

    showMessage(
      "이메일 또는 비밀번호를 확인해 주세요."
    );
  } finally {
    setLoading(false);
  }
});

checkExistingLogin();