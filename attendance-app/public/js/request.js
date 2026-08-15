import {
  getCurrentEmployee,
} from "./employeeAuth.js";


async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) {
    return;
  }

  const isTeamLead =
    employee.app_role ===
    "team_lead";

  document
    .querySelectorAll(
      ".request-menu-card.lead-only"
    )
    .forEach(
      (link) => {
        if (isTeamLead) {
          link.classList.remove(
            "locked"
          );

          link.removeAttribute(
            "aria-disabled"
          );

          return;
        }

        link.classList.add(
          "locked"
        );

        link.setAttribute(
          "aria-disabled",
          "true"
        );

        link.addEventListener(
          "click",
          (event) => {
            event.preventDefault();

            alert(
              "청소 점검표와 비품 요청은 팀장 권한이 필요합니다."
            );
          }
        );
      }
    );
}


init();