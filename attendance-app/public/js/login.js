import supabase from "./supabase.js";

const phoneLoginForm =
  document.getElementById(
    "phoneLoginForm"
  );

const userNameInput =
  document.getElementById(
    "userNameInput"
  );

const phoneInput =
  document.getElementById(
    "phoneInput"
  );

const loginSubmitBtn =
  document.getElementById(
    "loginSubmitBtn"
  );

function normalizePhone(phone) {
  return String(phone || "")
    .replace(/[^0-9]/g, "")
    .trim();
}

function saveEmployeeSession(session) {
  localStorage.setItem(
    "employeeSessionToken",
    session.session_token
  );

  localStorage.setItem(
    "employeeName",
    session.user_name || "직원"
  );

  localStorage.setItem(
    "employeeRole",
    session.user_role || "employee"
  );

  localStorage.setItem(
    "employeeLoginType",
    "phone"
  );

  localStorage.removeItem(
    "employeeUserId"
  );
}

function goByStatus(status) {
  if (status === "active") {
    location.replace(
      "../employee/index.html"
    );

    return;
  }

  if (status === "pending") {
    location.replace(
      "../employee/pending.html"
    );

    return;
  }

  if (status === "inactive") {
    alert(
      "비활성화된 계정입니다.\n관리자에게 문의해주세요."
    );

    return;
  }

  alert(
    "앱 사용이 승인되지 않았습니다."
  );

  location.replace(
    "../employee/pending.html"
  );
}

function getLoginErrorMessage(error) {
  const message =
    error?.message || "";

  if (
    message.includes(
      "EMPLOYEE_NOT_FOUND"
    )
  ) {
    return (
      "등록된 직원 정보를 찾지 못했습니다.\n" +
      "이름과 전화번호를 확인해주세요."
    );
  }

  if (
    message.includes(
      "DUPLICATE_EMPLOYEE"
    )
  ) {
    return (
      "같은 이름과 전화번호가 중복 등록되어 있습니다.\n" +
      "관리자에게 문의해주세요."
    );
  }

  return (
    "로그인에 실패했습니다.\n" +
    "잠시 후 다시 시도해주세요."
  );
}

phoneLoginForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const name =
      userNameInput.value.trim();

    const phone =
      normalizePhone(
        phoneInput.value
      );

    if (!name || !phone) {
      alert(
        "이름과 전화번호를 모두 입력해주세요."
      );

      return;
    }

    if (
      phone.length < 10 ||
      phone.length > 11
    ) {
      alert(
        "전화번호를 정확하게 입력해주세요."
      );

      return;
    }

    loginSubmitBtn.disabled =
      true;

    loginSubmitBtn.textContent =
      "로그인 확인 중...";

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "create_employee_session",
        {
          p_name: name,
          p_phone: phone,
        }
      );

      if (error) {
        throw error;
      }

      const session =
        Array.isArray(data)
          ? data[0]
          : data;

      if (
        !session ||
        !session.session_token
      ) {
        throw new Error(
          "SESSION_NOT_CREATED"
        );
      }

      saveEmployeeSession(
        session
      );

      goByStatus(
        session.user_status
      );
    } catch (error) {
      console.error(
        "직원 로그인 오류:",
        error
      );

      alert(
        getLoginErrorMessage(
          error
        )
      );
    } finally {
      loginSubmitBtn.disabled =
        false;

      loginSubmitBtn.textContent =
        "로그인";
    }
  }
);