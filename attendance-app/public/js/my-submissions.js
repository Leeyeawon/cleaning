import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const refreshButton =
  document.getElementById(
    "historyRefreshBtn"
  );

const requestTab =
  document.getElementById(
    "requestHistoryTab"
  );

const checklistTab =
  document.getElementById(
    "checklistHistoryTab"
  );

const requestPanel =
  document.getElementById(
    "requestHistoryPanel"
  );

const checklistPanel =
  document.getElementById(
    "checklistHistoryPanel"
  );

const requestList =
  document.getElementById(
    "myRequestList"
  );

const checklistList =
  document.getElementById(
    "myChecklistList"
  );

const requestCount =
  document.getElementById(
    "requestHistoryCount"
  );

const checklistCount =
  document.getElementById(
    "checklistHistoryCount"
  );

const modal =
  document.getElementById(
    "myHistoryModal"
  );

const modalType =
  document.getElementById(
    "myHistoryModalType"
  );

const modalTitle =
  document.getElementById(
    "myHistoryModalTitle"
  );

const modalContent =
  document.getElementById(
    "myHistoryModalContent"
  );

const modalCloseButton =
  document.getElementById(
    "myHistoryModalCloseBtn"
  );

const modalConfirmButton =
  document.getElementById(
    "myHistoryModalConfirmBtn"
  );

let requests = [];
let checklists = [];

const typeLabels = {
  annual_leave: "연차 신청",
  supply_request: "비품 요청",
  general_request: "요청 사항",
  phone_change: "연락처 변경",
  profile_change: "정보 변경",
};

const statusLabels = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
};

const ratingLabels = {
  poor: "불량",
  fair: "보통",
  good: "양호",
  completed: "완료",
  incomplete: "미완료",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );
}

function getRequestTitle(request) {
  if (
    request.request_type ===
    "annual_leave"
  ) {
    return `${request.start_date || "-"} ~ ${
      request.end_date || "-"
    }`;
  }

  return request.title || "제목 없음";
}

function openModal({
  type,
  title,
  content,
}) {
  modalType.textContent = type;
  modalTitle.textContent = title;
  modalContent.innerHTML = content;

  modal.classList.add("open");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );
}

function closeModal() {
  modal.classList.remove("open");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-open"
  );
}

function openRequestDetail(requestId) {
  const request =
    requests.find(
      (item) =>
        String(item.id) ===
        String(requestId)
    );

  if (!request) {
    return;
  }

  const type =
    typeLabels[request.request_type] ||
    "요청";

  const status =
    statusLabels[request.status] ||
    request.status ||
    "-";

  openModal({
    type,
    title: getRequestTitle(request),

    content: `
      <dl class="my-history-detail-list">
        <div>
          <dt>처리 상태</dt>
          <dd>
            <span class="my-history-status ${
              escapeHtml(request.status)
            }">
              ${escapeHtml(status)}
            </span>
          </dd>
        </div>

        <div>
          <dt>신청일</dt>
          <dd>
            ${escapeHtml(
              formatDate(
                request.created_at
              )
            )}
          </dd>
        </div>

        ${
          request.request_type ===
          "annual_leave"
            ? `
              <div>
                <dt>연차 기간</dt>
                <dd>
                  ${escapeHtml(
                    request.start_date ||
                    "-"
                  )}
                  ~
                  ${escapeHtml(
                    request.end_date ||
                    "-"
                  )}
                </dd>
              </div>
            `
            : ""
        }

        <div>
          <dt>제출 내용</dt>
          <dd class="my-history-detail-content">
            ${escapeHtml(
              request.content || "-"
            )}
          </dd>
        </div>

        <div>
          <dt>관리자 답변</dt>
          <dd class="my-history-detail-content">
            ${escapeHtml(
              request.admin_note ||
              "아직 등록된 답변이 없습니다."
            )}
          </dd>
        </div>
      </dl>
    `,
  });
}

function normalizeChecklistItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(
    (item, index) => {
      if (
        item &&
        typeof item === "object"
      ) {
        return {
          id:
            item.id ??
            index,

          label:
            item.label ||
            `점검 항목 ${index + 1}`,

          rating:
            item.rating ||
            (
              item.checked === false
                ? "incomplete"
                : "completed"
            ),
        };
      }

      return {
        id: index,
        label: `점검 항목 ${index + 1}`,
        rating: "completed",
      };
    }
  );
}

function openChecklistDetail(
  submissionId
) {
  const submission =
    checklists.find(
      (item) =>
        String(item.id) ===
        String(submissionId)
    );

  if (!submission) {
    return;
  }

  const items =
    normalizeChecklistItems(
      submission.checked_items
    );

  const itemRows =
    items.length
      ? items
          .map(
            (item) => `
              <tr>
                <td>
                  ${escapeHtml(
                    item.label
                  )}
                </td>

                <td>
                  <span
                    class="
                      checklist-result
                      ${escapeHtml(
                        item.rating
                      )}
                    "
                  >
                    ${escapeHtml(
                      ratingLabels[
                        item.rating
                      ] ||
                      item.rating ||
                      "-"
                    )}
                  </span>
                </td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="2">
              저장된 점검 항목이 없습니다.
            </td>
          </tr>
        `;

  openModal({
    type: "청소점검표",

    title:
      submission.workplace_name ||
      "현장 점검표",

    content: `
      <dl class="my-history-detail-list">
        <div>
          <dt>점검일</dt>
          <dd>
            ${escapeHtml(
              submission.work_date ||
              formatDate(
                submission.created_at
              )
            )}
          </dd>
        </div>

        <div>
          <dt>현장</dt>
          <dd>
            ${escapeHtml(
              submission.workplace_name ||
              "-"
            )}
          </dd>
        </div>
      </dl>

      <div class="my-checklist-detail-table-wrap">
        <table class="my-checklist-detail-table">
          <thead>
            <tr>
              <th>점검 항목</th>
              <th>결과</th>
            </tr>
          </thead>

          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <div class="my-history-detail-note">
        <strong>메모</strong>

        <p>
          ${escapeHtml(
            submission.note ||
            "작성된 메모가 없습니다."
          )}
        </p>
      </div>
    `,
  });
}

function bindDetailButtons() {
  requestList
    .querySelectorAll(
      "[data-request-id]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openRequestDetail(
            button.dataset.requestId
          );
        }
      );
    });

  checklistList
    .querySelectorAll(
      "[data-checklist-id]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openChecklistDetail(
            button.dataset.checklistId
          );
        }
      );
    });
}

function renderRequests() {
  requestCount.textContent =
    String(requests.length);

  if (!requests.length) {
    requestList.innerHTML = `
      <p class="my-history-empty">
        제출한 요청이 없습니다.
      </p>
    `;

    return;
  }

  requestList.innerHTML =
    requests
      .map((request) => {
        const type =
          typeLabels[
            request.request_type
          ] || "요청";

        const status =
          statusLabels[
            request.status
          ] ||
          request.status ||
          "-";

        return `
          <button
            class="my-history-card"
            type="button"
            data-request-id="${escapeHtml(
              request.id
            )}"
          >
            <span class="my-history-card-type">
              ${escapeHtml(type)}
            </span>

            <strong>
              ${escapeHtml(
                getRequestTitle(
                  request
                )
              )}
            </strong>

            <small>
              ${escapeHtml(
                formatDate(
                  request.created_at
                )
              )}
            </small>

            <span
              class="my-history-status ${escapeHtml(
                request.status
              )}"
            >
              ${escapeHtml(status)}
            </span>
          </button>
        `;
      })
      .join("");

  bindDetailButtons();
}

function renderChecklists() {
  checklistCount.textContent =
    String(checklists.length);

  if (!checklists.length) {
    checklistList.innerHTML = `
      <p class="my-history-empty">
        제출한 청소점검표가 없습니다.
      </p>
    `;

    return;
  }

  checklistList.innerHTML =
    checklists
      .map((submission) => {
        const items =
          normalizeChecklistItems(
            submission.checked_items
          );

        const poorCount =
          items.filter(
            (item) =>
              item.rating === "poor"
          ).length;

        const fairCount =
          items.filter(
            (item) =>
              item.rating === "fair"
          ).length;

        const goodCount =
          items.filter(
            (item) =>
              item.rating === "good"
          ).length;

        return `
          <button
            class="my-history-card"
            type="button"
            data-checklist-id="${escapeHtml(
              submission.id
            )}"
          >
            <span class="my-history-card-type">
              청소점검표
            </span>

            <strong>
              ${escapeHtml(
                submission.workplace_name ||
                "삭제된 현장"
              )}
            </strong>

            <small>
              ${escapeHtml(
                submission.work_date ||
                formatDate(
                  submission.created_at
                )
              )}
            </small>

            <span class="my-history-rating-summary">
              불량 ${poorCount}
              · 보통 ${fairCount}
              · 양호 ${goodCount}
            </span>
          </button>
        `;
      })
      .join("");

  bindDetailButtons();
}

function selectTab(tabName) {
  const requestSelected =
    tabName === "request";

  requestTab.classList.toggle(
    "active",
    requestSelected
  );

  checklistTab.classList.toggle(
    "active",
    !requestSelected
  );

  requestPanel.hidden =
    !requestSelected;

  checklistPanel.hidden =
    requestSelected;
}

async function loadHistory() {
  refreshButton.disabled = true;

  requestList.innerHTML = `
    <p class="my-history-empty">
      요청내역을 불러오는 중입니다.
    </p>
  `;

  checklistList.innerHTML = `
    <p class="my-history-empty">
      점검표 내역을 불러오는 중입니다.
    </p>
  `;

  const token =
    getEmployeeSessionToken();

  const { data, error } =
    await supabase.rpc(
      "get_my_submission_history",
      {
        p_session_token: token,
      }
    );

  refreshButton.disabled = false;

  if (error) {
    console.error(
      "내 제출내역 조회 실패:",
      error
    );

    requestList.innerHTML = `
      <p class="my-history-empty error">
        제출내역을 불러오지 못했습니다.
      </p>
    `;

    checklistList.innerHTML = `
      <p class="my-history-empty error">
        제출내역을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  requests =
    Array.isArray(data?.requests)
      ? data.requests
      : [];

  checklists =
    Array.isArray(data?.checklists)
      ? data.checklists
      : [];

  renderRequests();
  renderChecklists();
}

async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) {
    return;
  }

  const canUseChecklist =
    employee.app_role ===
    "team_lead";

  checklistTab.hidden =
    !canUseChecklist;

  requestTab.addEventListener(
    "click",
    () => selectTab("request")
  );

  checklistTab.addEventListener(
    "click",
    () => selectTab("checklist")
  );

  refreshButton.addEventListener(
    "click",
    loadHistory
  );

  modalCloseButton.addEventListener(
    "click",
    closeModal
  );

  modalConfirmButton.addEventListener(
    "click",
    closeModal
  );

  modal.addEventListener(
    "click",
    (event) => {
      if (event.target === modal) {
        closeModal();
      }
    }
  );

  await loadHistory();
}

init();