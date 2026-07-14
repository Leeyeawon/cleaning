import supabase from "./supabase.js";

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
    "employeeRole"
  );

  localStorage.removeItem(
    "employeeLoginType"
  );
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
    data,
    error,
  } = await supabase.rpc(
    "get_employee_by_session",
    {
      p_session_token: token,
    }
  );

  if (error) {
    console.error(
      "직원 세션 확인 오류:",
      error
    );

    clearEmployeeSession();

    location.replace(
      "../employee/login.html"
    );

    return null;
  }

  const employee =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!employee) {
    clearEmployeeSession();

    location.replace(
      "../employee/login.html"
    );

    return null;
  }

  if (
    employee.status === "pending"
  ) {
    const currentPage =
      location.pathname
        .split("/")
        .pop();

    if (
      currentPage !==
      "pending.html"
    ) {
      location.replace(
        "../employee/pending.html"
      );
    }

    return null;
  }

  if (
    employee.status === "inactive"
  ) {
    alert(
      "비활성화된 계정입니다.\n관리자에게 문의해주세요."
    );

    clearEmployeeSession();

    location.replace(
      "../employee/login.html"
    );

    return null;
  }

  if (
    employee.status !== "active"
  ) {
    location.replace(
      "../employee/pending.html"
    );

    return null;
  }

  localStorage.setItem(
    "employeeName",
    employee.name || "직원"
  );

  localStorage.setItem(
    "employeeRole",
    employee.app_role || "employee"
  );

  return employee;
}

export async function logoutEmployee() {
  const token =
    getEmployeeSessionToken();

  if (token) {
    const {
      error,
    } = await supabase.rpc(
      "logout_employee_session",
      {
        p_session_token:
          token,
      }
    );

    if (error) {
      console.error(
        "직원 로그아웃 오류:",
        error
      );
    }
  }

  clearEmployeeSession();

  location.replace(
    "../employee/login.html"
  );
}