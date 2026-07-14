import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const form =
  document.getElementById(
    "leaveRequestForm"
  );

const startInput =
  document.getElementById(
    "leaveStartDate"
  );

const endInput =
  document.getElementById(
    "leaveEndDate"
  );

const reasonInput =
  document.getElementById(
    "leaveReason"
  );

function getTodayKey() {
  const today = new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) return;

  const todayKey =
    getTodayKey();

  startInput.min =
    todayKey;

  endInput.min =
    todayKey;

  startInput.value =
    todayKey;

  endInput.value =
    todayKey;

  startInput.addEventListener(
    "change",
    () => {
      endInput.min =
        startInput.value;

      if (
        endInput.value <
        startInput.value
      ) {
        endInput.value =
          startInput.value;
      }
    }
  );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        !startInput.value ||
        !endInput.value
      ) {
        alert(
          "연차 날짜를 선택해 주세요."
        );

        return;
      }

      if (
        startInput.value >
        endInput.value
      ) {
        alert(
          "종료일은 시작일보다 빠를 수 없습니다."
        );

        return;
      }

      const button =
        form.querySelector(
          'button[type="submit"]'
        );

      button.disabled =
        true;

      button.textContent =
        "연차 신청 중...";

      const {
        error,
      } = await supabase.rpc(
        "create_leave_request_by_session",
        {
          p_session_token:
            getEmployeeSessionToken(),

          p_start_date:
            startInput.value,

          p_end_date:
            endInput.value,

          p_content:
            reasonInput.value.trim(),
        }
      );

      button.disabled =
        false;

      button.textContent =
        "연차 신청하기";

      if (error) {
        console.error(
          "연차 신청 오류:",
          error
        );

        alert(
          "연차 신청을 등록하지 못했습니다."
        );

        return;
      }

      alert(
        "연차 신청이 등록되었습니다.\n관리자 승인 후 출근부에 표시됩니다."
      );

      location.replace(
        "request.html"
      );
    }
  );
}

init();