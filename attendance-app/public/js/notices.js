import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const noticeList =
  document.getElementById(
    "employeeNoticeList"
  );

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

  return new Date(
    value
  ).toLocaleDateString("ko-KR");
}

async function markNotificationRead(
  notificationId,
  element
) {
  const token = getEmployeeSessionToken();

  const { error } =
    await supabase.rpc(
      "mark_my_notification_read",
      {
        p_session_token: token,
        p_notification_id:
          notificationId,
      }
    );

  if (error) {
    console.error(
      "알림 읽음 처리 실패:",
      error
    );

    return;
  }

  element.classList.remove("unread");

  const unreadBadge =
    element.querySelector(
      ".employee-notice-unread"
    );

  unreadBadge?.remove();
}

async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) {
    return;
  }

  const token =
    getEmployeeSessionToken();

  const [
    workplaceResult,
    notificationResult,
    noticeResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_my_workplaces",
      {
        p_session_token: token,
      }
    ),

    supabase.rpc(
      "get_my_notifications",
      {
        p_session_token: token,
      }
    ),

    supabase
      .from("notices")
      .select("*")
      .eq("status", "게시중")
      .order("important", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const targets = new Set([
    "전체 직원",
    employee.department,
    ...(workplaceResult.data || []).map(
      (workplace) =>
        workplace.workplace_name
    ),
  ].filter(Boolean));

  const notifications =
    (notificationResult.data || []).map(
      (notification) => ({
        id: notification.id,
        source: "notification",
        type: notification.type,
        title: notification.title,
        content: notification.content,
        createdAt: notification.created_at,
        unread: !notification.read_at,
        important: true,
      })
    );

  const notices =
    (noticeResult.data || [])
      .filter((notice) =>
        targets.has(notice.target)
      )
      .map((notice) => ({
        id: notice.id,
        source: "notice",
        type: "notice",
        title: notice.title,
        content: notice.content,
        createdAt: notice.created_at,
        unread: false,
        important: notice.important,
      }));

  const feed = [
    ...notifications,
    ...notices,
  ].sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );

  if (!feed.length) {
    noticeList.innerHTML = `
      <p class="notice-page-empty">
        등록된 공지사항이 없습니다.
      </p>
    `;

    return;
  }

  noticeList.innerHTML =
    feed.map((item) => {
      const isLeave =
        item.type === "annual_leave";

      const badgeText =
        item.source === "notification"
          ? isLeave
            ? "연차 알림"
            : "개인 알림"
          : item.important
            ? "중요"
            : "공지";

      return `
        <article
          id="${item.source}-${item.id}"
          class="employee-notice ${
            item.unread ? "unread" : ""
          }"
          data-source="${item.source}"
          data-id="${item.id}"
        >
          <div class="employee-notice-meta">
            <div>
              <span
                class="${
                  isLeave
                    ? "leave"
                    : ""
                }"
              >
                ${escapeHtml(badgeText)}
              </span>

              ${
                item.unread
                  ? `
                    <b class="employee-notice-unread">
                      새 알림
                    </b>
                  `
                  : ""
              }
            </div>

            <time>
              ${formatDate(item.createdAt)}
            </time>
          </div>

          <h2>
            ${escapeHtml(item.title)}
          </h2>

          <p>
            ${escapeHtml(item.content)}
          </p>
        </article>
      `;
    }).join("");

  noticeList
    .querySelectorAll(
      '.employee-notice[data-source="notification"]'
    )
    .forEach((element) => {
      element.addEventListener(
        "click",
        () => {
          markNotificationRead(
            element.dataset.id,
            element
          );
        }
      );
    });

  const params =
    new URLSearchParams(
      location.search
    );

  const selectedNotification =
    params.get("notification");

  const selectedNotice =
    params.get("notice");

  const selectedElement =
    selectedNotification
      ? document.getElementById(
          `notification-${selectedNotification}`
        )
      : selectedNotice
        ? document.getElementById(
            `notice-${selectedNotice}`
          )
        : null;

  if (selectedElement) {
    selectedElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    selectedElement.classList.add(
      "selected"
    );
  }

  if (
    selectedNotification &&
    selectedElement
  ) {
    await markNotificationRead(
      selectedNotification,
      selectedElement
    );
  }
}

init();