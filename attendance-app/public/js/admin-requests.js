import supabase from "./supabase.js";
import { requireAdmin } from "./adminAuth.js";

const tableBody =
  document.getElementById("requestTableBody");

const typeFilter =
  document.getElementById("requestTypeFilter");

const statusFilter =
  document.getElementById("requestStatusFilter");

const requestCount =
  document.getElementById("requestCount");

const totalRequestCount =
  document.getElementById("totalRequestCount");

const pendingRequestCount =
  document.getElementById("pendingRequestCount");

const approvedRequestCount =
  document.getElementById("approvedRequestCount");

const rejectedRequestCount =
  document.getElementById("rejectedRequestCount");

let requests = [];

const typeLabels = {
  annual_leave: "연차 신청",
  supply_request: "비품 요청",
  general_request: "요청 사항",
  phone_change: "연락처 변경",
  profile_change: "정보 변경",
};

const typeClassNames = {
  annual_leave: "annual-leave",
  supply_request: "supply",
  general_request: "general",
  phone_change: "phone",
  profile_change: "profile",
};

const statusLabels = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
  revoked: "승인 철회",
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
    return "-";
  }

  return date.toLocaleDateString("ko-KR");
}

function getRequestPeriod(request) {
  if (
    request.request_type ===
    "annual_leave"
  ) {
    const startDate =
      formatDate(request.start_date);

    const endDate =
      formatDate(request.end_date);

    if (
      !request.start_date &&
      !request.end_date
    ) {
      return "연차 날짜 미입력";
    }

    if (
      request.start_date ===
      request.end_date
    ) {
      return startDate;
    }

    return `${startDate} ~ ${endDate}`;
  }

  return request.title || "-";
}

function updateSummary() {
  totalRequestCount.textContent =
    requests.length;

  pendingRequestCount.textContent =
    requests.filter(
      (request) =>
        request.status === "pending"
    ).length;

  approvedRequestCount.textContent =
    requests.filter(
      (request) =>
        request.status === "approved"
    ).length;

  rejectedRequestCount.textContent =
    requests.filter(
      (request) =>
        request.status === "rejected"
    ).length;
}

async function loadRequests() {
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="workflow-empty">
        요청 목록을 불러오는 중입니다.
      </td>
    </tr>
  `;

  const { data, error } =
    await supabase.rpc(
      "admin_get_employee_requests"
    );

  if (error) {
    console.error(
      "직원 요청 조회 실패:",
      error
    );

    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="workflow-empty error">
          요청을 불러오지 못했습니다.<br />
          Supabase SQL과 관리자 로그인을 확인해 주세요.
        </td>
      </tr>
    `;

    return;
  }

  requests = Array.isArray(data)
    ? data
    : [];

  updateSummary();
  renderRequests();
}

function renderRequests() {
  const selectedType =
    typeFilter.value;

  const selectedStatus =
    statusFilter.value;

  const filteredRequests =
    requests.filter((request) => {
      const matchesType =
        selectedType === "all" ||
        request.request_type === selectedType;

      const matchesStatus =
        selectedStatus === "all" ||
        request.status === selectedStatus;

      return matchesType && matchesStatus;
    });

  requestCount.textContent =
    `${filteredRequests.length}건`;

  if (!filteredRequests.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="workflow-empty">
          조건에 맞는 요청이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML =
    filteredRequests
      .map((request) => {
        const requestType =
          typeLabels[request.request_type] ||
          request.request_type ||
          "-";

        const requestStatus =
          statusLabels[request.status] ||
          request.status ||
          "-";

        const requestPeriod =
          getRequestPeriod(request);

        const canResolve =
          request.status === "pending";

        const canRevoke =
          request.request_type ===
            "annual_leave" &&
          request.status ===
            "approved";
        
        return `
          <tr>
            <td>
              ${formatDate(request.created_at)}
            </td>

            <td>
              <strong>
                ${escapeHtml(request.user_name || "-")}
              </strong>

              <small class="workflow-department">
                ${escapeHtml(
                  request.department ||
                  "소속 미지정"
                )}
              </small>

              ${
                request.user_id
                  ? `
                    <a
                      class="workflow-employee-detail-link"
                      href="admin-employee-detail.html?id=${encodeURIComponent(
                        String(request.user_id)
                      )}"
                    >
                      직원 상세
                    </a>
                  `
                  : ""
              }
            </td>

            <td>
            <span
                class="workflow-type ${
                typeClassNames[request.request_type] ||
                "profile"
                }"
            >
                ${escapeHtml(requestType)}
            </span>
            </td>

            <td class="workflow-period">
              ${escapeHtml(requestPeriod)}
            </td>

            <td class="workflow-content">
              ${escapeHtml(
                request.content || "-"
              )}
            </td>

            <td>
              <span
                class="workflow-status ${escapeHtml(
                  request.status
                )}"
              >
                ${escapeHtml(requestStatus)}
              </span>
            </td>

            <td class="workflow-content">
              ${escapeHtml(
                request.admin_note || "-"
              )}
            </td>

            <td>
              ${
                canResolve
                  ? `
                    <div class="workflow-actions">
                      <button
                        type="button"
                        data-request-id="${escapeHtml(
                          request.id
                        )}"
                        data-request-status="approved"
                      >
                        승인
                      </button>

                      <button
                        type="button"
                        class="reject"
                        data-request-id="${escapeHtml(
                          request.id
                        )}"
                        data-request-status="rejected"
                      >
                        반려
                      </button>
                    </div>
                  `
                  : canRevoke
                    ? `
                      <div class="workflow-actions">
                        <button
                          type="button"
                          class="revoke"
                          data-revoke-leave-id="${escapeHtml(
                            request.id
                          )}"
                        >
                          승인 철회
                        </button>
                      </div>
                    `
                    : `
                      <span class="workflow-completed">
                        처리 완료
                      </span>
                    `
              }
            </td>
          </tr>
        `;
      })
      .join("");

  tableBody
    .querySelectorAll(
      "[data-request-status]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          resolveRequest(
            button.dataset.requestId,
            button.dataset.requestStatus,
            button
          );
        }
      );
    });

    tableBody
      .querySelectorAll(
        "[data-revoke-leave-id]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            revokeAnnualLeave(
              button.dataset
                .revokeLeaveId,
              button
            );
          }
        );
      });
}

async function revokeAnnualLeave(
  requestId,
  clickedButton
) {
  const firstConfirmed =
    confirm(
      "이미 승인된 연차를 철회하시겠습니까?\n철회하면 직원 출근부의 연차 표시도 삭제됩니다."
    );

  if (!firstConfirmed) {
    return;
  }

  const confirmation =
    prompt(
      '철회를 계속하려면 "철회"라고 입력해 주세요.',
      ""
    );

  if (confirmation === null) {
    return;
  }

  if (
    confirmation.trim() !==
    "철회"
  ) {
    alert(
      '"철회"를 정확하게 입력해야 합니다.'
    );

    return;
  }

  const adminNote =
    prompt(
      "직원에게 표시할 철회 사유를 입력해 주세요.\n사유가 없다면 비워두고 확인을 누르세요.",
      ""
    );

  if (adminNote === null) {
    return;
  }

  clickedButton.disabled = true;
  clickedButton.textContent =
    "철회 중...";

  const { data, error } =
    await supabase.rpc(
      "admin_revoke_approved_leave_request",
      {
        p_request_id:
          String(requestId),

        p_confirmation:
          confirmation.trim(),

        p_admin_note:
          adminNote.trim(),
      }
    );

  if (error) {
    console.error(
      "연차 철회 실패:",
      error
    );

    alert(
      `연차 철회에 실패했습니다.\n${
        error.message ||
        "잠시 후 다시 시도해 주세요."
      }`
    );

    clickedButton.disabled = false;
    clickedButton.textContent =
      "승인 철회";

    return;
  }

  const revokedRequest =
    requests.find(
      (request) =>
        String(request.id) ===
        String(requestId)
    );

  if (revokedRequest) {
    revokedRequest.status =
      "revoked";

    revokedRequest.admin_note =
      adminNote.trim()
        ? `철회 사유: ${adminNote.trim()}`
        : "관리자에 의해 승인 철회";
  }

  alert(
    "연차 승인이 철회되었습니다."
  );

  await loadRequests();
}

async function resolveRequest(
  requestId,
  nextStatus,
  clickedButton
) {
  const actionText =
    nextStatus === "approved"
      ? "승인"
      : "반려";

  const adminNote = prompt(
    `${actionText} 메모를 입력하세요.\n메모가 없다면 비워두고 확인을 누르세요.`,
    ""
  );

  if (adminNote === null) {
    return;
  }

  const confirmed = confirm(
    `이 요청을 ${actionText} 처리하시겠습니까?`
  );

  if (!confirmed) {
    return;
  }

  const actionButtons =
    clickedButton
      .closest(".workflow-actions")
      ?.querySelectorAll("button");

  actionButtons?.forEach((button) => {
    button.disabled = true;
  });

  const { error } =
    await supabase.rpc(
      "admin_resolve_employee_request",
      {
        p_request_id: requestId,
        p_status: nextStatus,
        p_admin_note: adminNote.trim(),
      }
    );

  if (error) {
    console.error(
      `${actionText} 처리 실패:`,
      error
    );

    alert(
      `${actionText} 처리에 실패했습니다.\n${
        error.message ||
        "잠시 후 다시 시도해 주세요."
      }`
    );

    actionButtons?.forEach((button) => {
      button.disabled = false;
    });

    return;
  }

  alert(
    `요청이 ${actionText} 처리되었습니다.`
  );

  await loadRequests();
}

typeFilter.addEventListener(
  "change",
  renderRequests
);

statusFilter.addEventListener(
  "change",
  renderRequests
);

const currentAdmin =
  await requireAdmin();

if (currentAdmin) {
  await loadRequests();
}