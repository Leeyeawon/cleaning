import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";


const requestHistoryTab =
  document.getElementById(
    "requestHistoryTab"
  );

const checklistHistoryTab =
  document.getElementById(
    "checklistHistoryTab"
  );

const requestHistoryPanel =
  document.getElementById(
    "requestHistoryPanel"
  );

const checklistHistoryPanel =
  document.getElementById(
    "checklistHistoryPanel"
  );

const requestHistoryCount =
  document.getElementById(
    "requestHistoryCount"
  );

const checklistHistoryCount =
  document.getElementById(
    "checklistHistoryCount"
  );

const myRequestList =
  document.getElementById(
    "myRequestList"
  );

const myChecklistList =
  document.getElementById(
    "myChecklistList"
  );

const historyRefreshBtn =
  document.getElementById(
    "historyRefreshBtn"
  );

const myHistoryModal =
  document.getElementById(
    "myHistoryModal"
  );

const myHistoryModalType =
  document.getElementById(
    "myHistoryModalType"
  );

const myHistoryModalTitle =
  document.getElementById(
    "myHistoryModalTitle"
  );

const myHistoryModalContent =
  document.getElementById(
    "myHistoryModalContent"
  );

const myHistoryModalCloseBtn =
  document.getElementById(
    "myHistoryModalCloseBtn"
  );

const myHistoryModalConfirmBtn =
  document.getElementById(
    "myHistoryModalConfirmBtn"
  );


let currentEmployee = null;

let myRequests = [];

let myChecklists = [];


const requestTypeLabels = {
  annual_leave: "연차 신청",
  supply_request: "비품 요청",
  general_request: "요청 사항",
  phone_change: "연락처 변경",
  profile_change: "정보 변경",
};


const statusLabels = {
  pending: "처리 대기",
  approved: "승인 완료",
  rejected: "반려",
};


const ratingLabels = {
  poor: "불량",
  fair: "보통",
  good: "양호",
  completed: "기존 완료",
  incomplete: "미완료",
};


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}


function formatDateTime(value) {
  if (!value) {
    return "-";
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


function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
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


function getRequestTypeLabel(type) {
  return (
    requestTypeLabels[type] ||
    type ||
    "요청"
  );
}


function getStatusLabel(status) {
  return (
    statusLabels[status] ||
    status ||
    "처리 대기"
  );
}


function getRequestPeriod(request) {
  if (
    request.request_type !==
    "annual_leave"
  ) {
    return "";
  }

  const start =
    formatDate(
      request.start_date
    );

  const end =
    formatDate(
      request.end_date
    );

  if (
    request.start_date ===
    request.end_date
  ) {
    return start;
  }

  return `${start} ~ ${end}`;
}


function normalizeChecklistItem(
  item
) {
  /*
    새 평가 데이터
  */
  if (
    item &&
    typeof item === "object" &&
    item.rating
  ) {
    return {
      id:
        String(item.id || ""),

      label:
        item.label ||
        "점검 항목",

      rating:
        item.rating,
    };
  }

  /*
    이전 체크박스 데이터
  */
  if (
    item &&
    typeof item === "object"
  ) {
    return {
      id:
        String(item.id || ""),

      label:
        item.label ||
        "기존 점검 항목",

      rating:
        item.checked === false
          ? "incomplete"
          : "completed",
    };
  }

  return {
    id:
      String(item || ""),

    label:
      "기존 점검 항목",

    rating:
      "completed",
  };
}


function getChecklistItems(
  submission
) {
  if (
    !Array.isArray(
      submission.items
    )
  ) {
    return [];
  }

  return submission.items.map(
    normalizeChecklistItem
  );
}


function getRatingCount(
  items,
  rating
) {
  return items.filter(
    (item) =>
      item.rating === rating
  ).length;
}


function closeHistoryModal() {
  myHistoryModal.classList.remove(
    "open"
  );

  myHistoryModal.setAttribute(
    "aria-hidden",
    "true"
  );
}


function openHistoryModal({
  type,
  title,
  html,
}) {
  myHistoryModalType.textContent =
    type;

  myHistoryModalTitle.textContent =
    title;

  myHistoryModalContent.innerHTML =
    html;

  myHistoryModal.classList.add(
    "open"
  );

  myHistoryModal.setAttribute(
    "aria-hidden",
    "false"
  );
}


function openRequestDetail(
  requestId
) {
  const request =
    myRequests.find(
      (item) =>
        String(item.id) ===
        String(requestId)
    );

  if (!request) {
    return;
  }

  const status =
    request.status ||
    "pending";

  const period =
    getRequestPeriod(request);

  openHistoryModal({
    type:
      getRequestTypeLabel(
        request.request_type
      ),

    title:
      request.title ||
      getRequestTypeLabel(
        request.request_type
      ),

    html: `
      <section class="history-detail-summary">
        <span
          class="my-history-status ${escapeHtml(
            status
          )}"
        >
          ${escapeHtml(
            getStatusLabel(status)
          )}
        </span>

        <time>
          ${escapeHtml(
            formatDateTime(
              request.created_at
            )
          )}
        </time>
      </section>

      ${
        period
          ? `
            <section class="history-detail-block">
              <strong>신청 기간</strong>

              <p>
                ${escapeHtml(period)}
              </p>
            </section>
          `
          : ""
      }

      <section class="history-detail-block">
        <strong>요청 내용</strong>

        <p>
          ${escapeHtml(
            request.content ||
            "내용 없음"
          )}
        </p>
      </section>

      <section class="history-detail-block admin-answer">
        <strong>관리자 답변</strong>

        <p>
          ${escapeHtml(
            request.admin_note ||
            (
              status === "pending"
                ? "아직 처리되지 않았습니다."
                : "관리자 메모가 없습니다."
            )
          )}
        </p>
      </section>

      ${
        request.resolved_at
          ? `
            <p class="history-resolved-date">
              처리일시:
              ${escapeHtml(
                formatDateTime(
                  request.resolved_at
                )
              )}
            </p>
          `
          : ""
      }
    `,
  });
}


function openChecklistDetail(
  submissionId
) {
  const submission =
    myChecklists.find(
      (item) =>
        String(item.id) ===
        String(submissionId)
    );

  if (!submission) {
    return;
  }

  const items =
    getChecklistItems(
      submission
    );

  const poorCount =
    getRatingCount(
      items,
      "poor"
    );

  const fairCount =
    getRatingCount(
      items,
      "fair"
    );

  const goodCount =
    getRatingCount(
      items,
      "good"
    );

  const itemRows =
    items.length
      ? items
          .map(
            (
              item,
              index
            ) => `
              <div class="history-rating-row">
                <span class="history-rating-number">
                  ${index + 1}
                </span>

                <strong>
                  ${escapeHtml(
                    item.label
                  )}
                </strong>

                <span
                  class="history-rating-badge ${escapeHtml(
                    item.rating
                  )}"
                >
                  ${escapeHtml(
                    ratingLabels[
                      item.rating
                    ] ||
                    item.rating
                  )}
                </span>
              </div>
            `
          )
          .join("")
      : `
        <p class="my-history-empty">
          저장된 점검 항목이 없습니다.
        </p>
      `;

  openHistoryModal({
    type: "청소 점검표",

    title:
      submission.workplace_name ||
      "현장 점검표",

    html: `
      <section class="history-detail-summary">
        <span class="my-history-status approved">
          제출 완료
        </span>

        <time>
          ${escapeHtml(
            formatDateTime(
              submission.created_at
            )
          )}
        </time>
      </section>

      <section class="history-rating-summary">
        <div class="poor">
          <span>불량</span>
          <strong>${poorCount}</strong>
        </div>

        <div class="fair">
          <span>보통</span>
          <strong>${fairCount}</strong>
        </div>

        <div class="good">
          <span>양호</span>
          <strong>${goodCount}</strong>
        </div>
      </section>

      <section class="history-detail-block">
        <strong>점검 결과</strong>

        <div class="history-rating-list">
          ${itemRows}
        </div>
      </section>

      <section class="history-detail-block">
        <strong>점검 메모</strong>

        <p>
          ${escapeHtml(
            submission.note ||
            "작성된 메모가 없습니다."
          )}
        </p>
      </section>
    `,
  });
}


function bindHistoryDetailButtons() {
  document
    .querySelectorAll(
      "[data-my-request-id]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            openRequestDetail(
              button.dataset
                .myRequestId
            );
          }
        );
      }
    );

  document
    .querySelectorAll(
      "[data-my-checklist-id]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            openChecklistDetail(
              button.dataset
                .myChecklistId
            );
          }
        );
      }
    );
}


function renderMyRequests() {
  requestHistoryCount.textContent =
    myRequests.length;

  if (!myRequests.length) {
    myRequestList.innerHTML = `
      <p class="my-history-empty">
        아직 제출한 요청이 없습니다.
      </p>
    `;

    return;
  }

  myRequestList.innerHTML =
    myRequests
      .map(
        (request) => {
          const status =
            request.status ||
            "pending";

          const period =
            getRequestPeriod(
              request
            );

          return `
            <button
              class="my-history-card"
              type="button"
              data-my-request-id="${escapeHtml(
                request.id
              )}"
            >
              <div class="my-history-card-top">
                <span class="my-history-type">
                  ${escapeHtml(
                    getRequestTypeLabel(
                      request.request_type
                    )
                  )}
                </span>

                <span
                  class="my-history-status ${escapeHtml(
                    status
                  )}"
                >
                  ${escapeHtml(
                    getStatusLabel(
                      status
                    )
                  )}
                </span>
              </div>

              <strong class="my-history-title">
                ${escapeHtml(
                  request.title ||
                  getRequestTypeLabel(
                    request.request_type
                  )
                )}
              </strong>

              ${
                period
                  ? `
                    <p class="my-history-period">
                      ${escapeHtml(period)}
                    </p>
                  `
                  : `
                    <p class="my-history-preview">
                      ${escapeHtml(
                        request.content ||
                        "내용 없음"
                      )}
                    </p>
                  `
              }

              <time>
                ${escapeHtml(
                  formatDateTime(
                    request.created_at
                  )
                )}
              </time>
            </button>
          `;
        }
      )
      .join("");

  bindHistoryDetailButtons();
}


function renderMyChecklists() {
  checklistHistoryCount.textContent =
    myChecklists.length;

  if (!myChecklists.length) {
    myChecklistList.innerHTML = `
      <p class="my-history-empty">
        아직 제출한 청소 점검표가 없습니다.
      </p>
    `;

    return;
  }

  myChecklistList.innerHTML =
    myChecklists
      .map(
        (submission) => {
          const items =
            getChecklistItems(
              submission
            );

          const poorCount =
            getRatingCount(
              items,
              "poor"
            );

          const fairCount =
            getRatingCount(
              items,
              "fair"
            );

          const goodCount =
            getRatingCount(
              items,
              "good"
            );

          return `
            <button
              class="my-history-card checklist"
              type="button"
              data-my-checklist-id="${escapeHtml(
                submission.id
              )}"
            >
              <div class="my-history-card-top">
                <span class="my-history-type">
                  청소 점검표
                </span>

                <span class="my-history-status approved">
                  제출 완료
                </span>
              </div>

              <strong class="my-history-title">
                ${escapeHtml(
                  submission.workplace_name ||
                  "현장"
                )}
              </strong>

              <div class="my-history-rating-chips">
                <span class="poor">
                  불량 ${poorCount}
                </span>

                <span class="fair">
                  보통 ${fairCount}
                </span>

                <span class="good">
                  양호 ${goodCount}
                </span>
              </div>

              <time>
                ${escapeHtml(
                  formatDateTime(
                    submission.created_at
                  )
                )}
              </time>
            </button>
          `;
        }
      )
      .join("");

  bindHistoryDetailButtons();
}


async function loadMyRequests() {
  myRequestList.innerHTML = `
    <p class="my-history-empty">
      요청내역을 불러오는 중입니다.
    </p>
  `;

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_employee_requests",
    {
      p_session_token:
        getEmployeeSessionToken(),
    }
  );

  if (error) {
    console.error(
      "내 요청내역 조회 실패:",
      error
    );

    myRequestList.innerHTML = `
      <p class="my-history-empty error">
        요청내역을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  myRequests =
    Array.isArray(data)
      ? data
      : [];

  renderMyRequests();
}


async function loadMyChecklists() {
  if (
    currentEmployee?.app_role !==
    "team_lead"
  ) {
    return;
  }

  myChecklistList.innerHTML = `
    <p class="my-history-empty">
      점검표 내역을 불러오는 중입니다.
    </p>
  `;

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_cleaning_submissions",
    {
      p_session_token:
        getEmployeeSessionToken(),
    }
  );

  if (error) {
    console.error(
      "내 점검표 조회 실패:",
      error
    );

    myChecklistList.innerHTML = `
      <p class="my-history-empty error">
        점검표 내역을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  myChecklists =
    Array.isArray(data)
      ? data
      : [];

  renderMyChecklists();
}


async function loadAllHistory() {
  historyRefreshBtn.disabled =
    true;

  historyRefreshBtn.textContent =
    "불러오는 중...";

  try {
    const loaders = [
      loadMyRequests(),
    ];

    if (
      currentEmployee?.app_role ===
      "team_lead"
    ) {
      loaders.push(
        loadMyChecklists()
      );
    }

    await Promise.all(
      loaders
    );
  } finally {
    historyRefreshBtn.disabled =
      false;

    historyRefreshBtn.textContent =
      "새로고침";
  }
}


function showHistoryTab(tabName) {
  const showChecklist =
    tabName === "checklist";

  requestHistoryTab.classList.toggle(
    "active",
    !showChecklist
  );

  checklistHistoryTab.classList.toggle(
    "active",
    showChecklist
  );

  requestHistoryPanel.hidden =
    showChecklist;

  checklistHistoryPanel.hidden =
    !showChecklist;
}


function bindRequestMenu() {
  const isTeamLead =
    currentEmployee.app_role ===
    "team_lead";

  document
    .querySelectorAll(
      ".request-menu-card"
    )
    .forEach(
      (button) => {
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
      }
    );
}


function bindEvents() {
  requestHistoryTab
    .addEventListener(
      "click",
      () => {
        showHistoryTab(
          "request"
        );
      }
    );

  checklistHistoryTab
    .addEventListener(
      "click",
      () => {
        showHistoryTab(
          "checklist"
        );
      }
    );

  historyRefreshBtn
    .addEventListener(
      "click",
      loadAllHistory
    );

  myHistoryModalCloseBtn
    .addEventListener(
      "click",
      closeHistoryModal
    );

  myHistoryModalConfirmBtn
    .addEventListener(
      "click",
      closeHistoryModal
    );

  myHistoryModal
    .addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          myHistoryModal
        ) {
          closeHistoryModal();
        }
      }
    );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape"
      ) {
        closeHistoryModal();
      }
    }
  );
}


async function init() {
  currentEmployee =
    await getCurrentEmployee();

  if (!currentEmployee) {
    return;
  }

  const isTeamLead =
    currentEmployee.app_role ===
    "team_lead";

  checklistHistoryTab.hidden =
    !isTeamLead;

  bindRequestMenu();
  bindEvents();

  await loadAllHistory();
}


init();