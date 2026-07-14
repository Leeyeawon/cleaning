import supabase from "./supabase.js";

import {
  clearEmployeeSession,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );

const refreshBtn =
  document.getElementById(
    "refreshBtn"
  );

const approvalStatusText =
  document.getElementById(
    "approvalStatusText"
  );

async function checkApprovalStatus(
  showMessage = false
) {
  const token =
    getEmployeeSessionToken();

  if (!token) {
    location.replace(
      "../employee/login.html"
    );

    return;
  }

  if (refreshBtn) {
    refreshBtn.disabled = true;

    refreshBtn.textContent =
      "승인 상태 확인 중...";
  }

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_employee_by_session",
      {
        p_session_token:
          token,
      }
    );

    if (error) {
      throw error;
    }

    const employee =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      employee.status === "active"
    ) {
      if (
        approvalStatusText
      ) {
        approvalStatusText.textContent =
          "승인 완료";
      }

      alert(
        "앱 사용이 승인되었습니다."
      );

      location.replace(
        "../employee/index.html"
      );

      return;
    }

    if (
      employee.status ===
      "inactive"
    ) {
      if (
        approvalStatusText
      ) {
        approvalStatusText.textContent =
          "비활성 계정";
      }

      if (showMessage) {
        alert(
          "비활성화된 계정입니다.\n관리자에게 문의해주세요."
        );
      }

      return;
    }

    if (
      approvalStatusText
    ) {
      approvalStatusText.textContent =
        "승인 대기";
    }

    if (showMessage) {
      alert(
        "아직 관리자의 승인을 기다리고 있습니다."
      );
    }
  } catch (error) {
    console.error(
      "승인 상태 확인 오류:",
      error
    );

    if (showMessage) {
      alert(
        "승인 상태를 확인하지 못했습니다."
      );
    }
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled =
        false;

      refreshBtn.textContent =
        "승인 상태 다시 확인";
    }
  }
}

refreshBtn?.addEventListener(
  "click",
  () => {
    checkApprovalStatus(true);
  }
);

logoutBtn?.addEventListener(
  "click",
  async () => {
    const token =
      getEmployeeSessionToken();

    if (token) {
      await supabase.rpc(
        "logout_employee_session",
        {
          p_session_token:
            token,
        }
      );
    }

    clearEmployeeSession();

    location.replace(
      "../employee/login.html"
    );
  }
);

checkApprovalStatus();