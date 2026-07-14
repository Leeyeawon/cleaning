import {
  getCurrentEmployee,
} from "./employeeAuth.js";

async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) return;

  const isTeamLead =
    employee.app_role ===
    "team_lead";

  document
    .querySelectorAll(
      ".request-menu-card"
    )
    .forEach((button) => {
      const leadOnly =
        button.classList.contains(
          "lead-only"
        );

      if (
        leadOnly &&
        !isTeamLead
      ) {
        button.classList.add(
          "locked"
        );

        button.setAttribute(
          "aria-disabled",
          "true"
        );
      }

      button.addEventListener(
        "click",
        () => {
          if (
            leadOnly &&
            !isTeamLead
          ) {
            alert(
              "청소 점검표와 비품 요청은 팀장 권한이 필요합니다."
            );

            return;
          }

          location.href =
            button.dataset.href;
        }
      );
    });
}

init();