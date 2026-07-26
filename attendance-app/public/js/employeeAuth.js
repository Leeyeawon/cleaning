import supabase from "./supabase.js";

const SESSION_CHECK_INTERVAL = 30000;

let sessionCheckRunning = false;
let sessionClosing = false;
let lastSessionCheckAt = 0;

export function getEmployeeSessionToken() {
  return localStorage.getItem(
    "employeeSessionToken"
  );
}

export function clearEmployeeSession() {
  localStorage.removeItem(
    "employeeSessionToken"
  );

  localStorage.removeItem(
    "employeeUserId"
  );

  localStorage.removeItem(
    "employeeName"
  );

  localStorage.removeItem(
    "employeeLoginType"
  );
}

function isPendingPage() {
  return location.pathname.endsWith(
    "/pending.html"
  );
}

function goToLogin(message = "") {
  if (sessionClosing) return;

  sessionClosing = true;

  clearEmployeeSession();

  if (message) {
    alert(message);
  }

  location.replace(
    "../employee/login.html"
  );
}

async function requestCurrentEmployee() {
  const token =
    getEmployeeSessionToken();

  if (!token) {
    return {
      employee: null,
      error: null,
    };
  }

  const { data, error } =
    await supabase.rpc(
      "get_employee_by_session",
      {
        p_session_token: token,
      }
    );

  return {
    employee: data?.[0] || null,
    error,
  };
}

function handleEmployeeStatus(employee) {
  if (!employee) {
    goToLogin(
      "로그인 정보가 만료되었거나 관리자에 의해 앱 사용이 중지되었습니다."
    );

    return false;
  }

  if (employee.status === "pending") {
    if (!isPendingPage()) {
      location.replace(
        "../employee/pending.html"
      );
    }

    return false;
  }

  if (
    employee.status === "inactive" ||
    employee.status === "resigned" ||
    employee.status === "deleted"
  ) {
    goToLogin(
      "관리자에 의해 계정 사용이 중지되었습니다."
    );

    return false;
  }

  if (employee.status !== "active") {
    goToLogin(
      "현재 사용할 수 없는 계정입니다. 관리자에게 문의해주세요."
    );

    return false;
  }

  if (isPendingPage()) {
    location.replace(
      "../employee/index.html"
    );

    return false;
  }

  return true;
}

export async function getCurrentEmployee() {
  const token =
    getEmployeeSessionToken();

  if (!token) {
    location.replace(
      "../employee/login.html"
    );

    return null;
  }

  const {
    employee,
    error,
  } = await requestCurrentEmployee();

  if (error) {
    console.error(
      "세션 확인 오류:",
      error
    );

    alert(
      "로그인 상태를 확인하지 못했습니다. 인터넷 연결을 확인해주세요."
    );

    return null;
  }

  if (!handleEmployeeStatus(employee)) {
    return null;
  }

  localStorage.setItem(
    "employeeName",
    employee.name || "직원"
  );

  return employee;
}

async function checkEmployeeSessionSilently() {
  const token =
    getEmployeeSessionToken();

  if (
    !token ||
    sessionCheckRunning ||
    sessionClosing
  ) {
    return;
  }

  const now = Date.now();

  if (
    now - lastSessionCheckAt <
    5000
  ) {
    return;
  }

  sessionCheckRunning = true;
  lastSessionCheckAt = now;

  try {
    const {
      employee,
      error,
    } = await requestCurrentEmployee();

    /*
      인터넷이 잠시 끊긴 경우에는
      잘못 로그아웃시키지 않습니다.
      다시 연결되면 즉시 재검사합니다.
    */
    if (error) {
      console.warn(
        "자동 세션 확인 실패:",
        error
      );

      return;
    }

    handleEmployeeStatus(employee);
  } finally {
    sessionCheckRunning = false;
  }
}

export async function logoutEmployee() {
  const token =
    getEmployeeSessionToken();

  sessionClosing = true;

  try {
    if (token) {
      await supabase.rpc(
        "logout_employee_session",
        {
          p_session_token: token,
        }
      );
    }
  } catch (error) {
    console.warn(
      "로그아웃 세션 삭제 실패:",
      error
    );
  } finally {
    clearEmployeeSession();

    location.replace(
      "../employee/login.html"
    );
  }
}

function startEmployeeSessionWatcher() {
  if (!getEmployeeSessionToken()) {
    return;
  }

  window.setInterval(
    checkEmployeeSessionSilently,
    SESSION_CHECK_INTERVAL
  );

  window.addEventListener(
    "focus",
    checkEmployeeSessionSilently
  );

  window.addEventListener(
    "online",
    checkEmployeeSessionSilently
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        checkEmployeeSessionSilently();
      }
    }
  );
}

startEmployeeSessionWatcher();