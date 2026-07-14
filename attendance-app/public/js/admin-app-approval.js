import supabase from "./supabase.js";

const pendingCount = document.getElementById( "appApprovalPendingCount" );
const pendingList = document.getElementById( "appApprovalPendingList" );
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPhone(phone) {
  const number = String(
    phone || ""
  ).replace(/[^0-9]/g, "");

  if (number.length === 11) {
    return number.replace(
      /(\d{3})(\d{4})(\d{4})/,
      "$1-$2-$3"
    );
  }

  return phone || "-";
}

function formatDateTime(value) {
  if (!value) {
    return "로그인 시간 미확인";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

async function fetchPendingEmployees() {
  if (!pendingList) {
    return;
  }

  pendingList.innerHTML = `
    <p class="app-approval-empty">
      승인 대기 직원을 불러오는 중입니다.
    </p>
  `;

  const { data, error, } = await supabase.rpc( "admin_get_employees_v2" );
  if (error) {
    console.error(
      "앱 승인 대기 직원 조회 실패:",
      error
    );

    pendingList.innerHTML = `
      <p class="app-approval-empty error">
        승인 대기 직원을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  const employees = Array.isArray(data) ? data : [];
  const waitingEmployees = employees.filter( (employee) => employee .app_approval_status === "pending" );
  if (pendingCount) {
    pendingCount.textContent =
      `${waitingEmployees.length}명`;
  }

  if (
    waitingEmployees.length === 0
  ) {
    pendingList.innerHTML = `
      <p class="app-approval-empty">
        현재 앱 승인 대기 직원이 없습니다.
      </p>
    `;

    return;
  }

  pendingList.innerHTML =
    waitingEmployees
      .map(
        (employee) => `
          <article class="app-approval-item">
            <div class="app-approval-employee">
              <strong>
                ${escapeHtml(
                  employee.name ||
                  "이름 없음"
                )}
              </strong>

              <p>
                ${escapeHtml(
                  formatPhone(
                    employee.phone
                  )
                )}
                ·
                ${escapeHtml(
                  employee.department ||
                  "소속 미지정"
                )}
              </p>

              <small>
                로그인 요청:
                ${escapeHtml(
                  formatDateTime(
                    employee
                      .login_requested_at
                  )
                )}
              </small>
            </div>

            <button
              type="button"
              class="app-approval-button"
              data-approve-user-id="${escapeHtml(
                employee.id
              )}"
              data-approve-user-name="${escapeHtml(
                employee.name ||
                "직원"
              )}"
            >
              앱 사용 승인
            </button>
          </article>
        `
      )
      .join("");

  bindApprovalButtons();
}

function bindApprovalButtons() {
  pendingList
    ?.querySelectorAll(
      "[data-approve-user-id]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          async () => {
            const userId =
              button.dataset
                .approveUserId;

            const userName =
              button.dataset
                .approveUserName;

            const confirmed =
              confirm(
                `${userName} 직원의 앱 사용을 승인하시겠습니까?`
              );

            if (!confirmed) {
              return;
            }

            button.disabled =
              true;

            button.textContent =
              "승인 처리 중...";

            const {
              error,
            } = await supabase.rpc(
              "admin_set_app_approval",
              {
                p_user_id:
                  userId,

                p_approved:
                  true,
              }
            );

            if (error) {
              console.error(
                "앱 사용 승인 실패:",
                error
              );

              alert(
                "앱 사용 승인에 실패했습니다."
              );

              button.disabled =
                false;

              button.textContent =
                "앱 사용 승인";

              return;
            }

            alert( `${userName} 직원의 앱 사용이 승인되었습니다.` );
            await fetchPendingEmployees();
          }
        );
      }
    );
}

fetchPendingEmployees();