import supabase from "./supabase.js";

export function getEmployeeSessionToken() {
  return localStorage.getItem("employeeSessionToken");
}

export function clearEmployeeSession() {
  localStorage.removeItem("employeeSessionToken");
  localStorage.removeItem("employeeUserId");
  localStorage.removeItem("employeeName");
  localStorage.removeItem("employeeLoginType");
}

export async function getCurrentEmployee() {
  const token = getEmployeeSessionToken();

  if (!token) {
    location.href = "../employee/login.html";
    return null;
  }

  const { data, error } = await supabase.rpc("get_employee_by_session", {
    p_session_token: token,
  });

  if (error) {
    console.error("세션 확인 오류:", error);
    clearEmployeeSession();
    location.href = "../employee/login.html";
    return null;
  }

  const employee = data?.[0];

  if (!employee) {
    clearEmployeeSession();
    location.href = "../employee/login.html";
    return null;
  }

  if (employee.status === "pending") {
    location.href = "../employee/pending.html";
    return null;
  }

  if (employee.status === "inactive") {
    alert("비활성화된 계정입니다. 관리자에게 문의해주세요.");
    clearEmployeeSession();
    location.href = "../employee/login.html";
    return null;
  }

  if (employee.status !== "active") {
    location.href = "../employee/pending.html";
    return null;
  }

  localStorage.setItem("employeeName", employee.name || "직원");

  return employee;
}

export async function logoutEmployee() {
  const token = getEmployeeSessionToken();

  if (token) {
    await supabase.rpc("logout_employee_session", {
      p_session_token: token,
    });
  }

  clearEmployeeSession();
  location.href = "../employee/login.html";
}