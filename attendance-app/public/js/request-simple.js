import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const form =
  document.getElementById(
    "simpleRequestForm"
  );

const titleInput =
  document.getElementById(
    "requestTitle"
  );

const contentInput =
  document.getElementById(
    "requestContent"
  );

async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) return;

  const leadOnly =
    document.body.dataset
      .leadOnly === "true";

  if (
    leadOnly &&
    employee.app_role !==
      "team_lead"
  ) {
    alert(
      "팀장만 사용할 수 있는 기능입니다."
    );

    location.replace(
      "request.html"
    );

    return;
  }

  form?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const title =
        titleInput.value.trim();

      const content =
        contentInput.value.trim();

      if (!title || !content) {
        alert(
          "제목과 요청 내용을 입력해 주세요."
        );

        return;
      }

      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );

      submitButton.disabled =
        true;

      submitButton.textContent =
        "요청 등록 중...";

      const {
        error,
      } = await supabase.rpc(
        "create_employee_request_by_session",
        {
          p_session_token:
            getEmployeeSessionToken(),

          p_request_type:
            document.body.dataset
              .requestType,

          p_title:
            title,

          p_content:
            content,
        }
      );

      submitButton.disabled =
        false;

      submitButton.textContent =
        leadOnly
          ? "비품 요청 보내기"
          : "요청 보내기";

      if (error) {
        console.error(
          "요청 등록 오류:",
          error
        );

        if (
          error.message?.includes(
            "TEAM_LEAD_ONLY"
          )
        ) {
          alert(
            "팀장 권한이 필요합니다."
          );
        } else {
          alert(
            "요청을 등록하지 못했습니다."
          );
        }

        return;
      }

      alert(
        "요청이 등록되었습니다."
      );

      location.replace(
        "request.html"
      );
    }
  );
}

init();