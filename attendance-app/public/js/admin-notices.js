import supabase from "./supabase.js";
import { requireAdmin } from "./adminAuth.js";

let notices = [];
let selectedNoticeId = null;
let editingNoticeId = null;

const noticeTableBody =
  document.getElementById(
    "noticeTableBody"
  );

const noticeSearchInput =
  document.getElementById(
    "noticeSearchInput"
  );

const noticeCategoryFilter =
  document.getElementById(
    "noticeCategoryFilter"
  );

const noticeStatusFilter =
  document.getElementById(
    "noticeStatusFilter"
  );

const noticeTargetFilter =
  document.getElementById(
    "noticeTargetFilter"
  );

const noticePreviewEmpty =
  document.getElementById(
    "noticePreviewEmpty"
  );

const noticePreviewContent =
  document.getElementById(
    "noticePreviewContent"
  );

const previewCategory =
  document.getElementById(
    "previewCategory"
  );

const previewTitle =
  document.getElementById(
    "previewTitle"
  );

const previewMeta =
  document.getElementById(
    "previewMeta"
  );

const previewBody =
  document.getElementById(
    "previewBody"
  );

const addNoticeBtn =
  document.getElementById(
    "addNoticeBtn"
  );

const noticeModal =
  document.getElementById(
    "noticeModal"
  );

const noticeModalTitle =
  document.getElementById(
    "noticeModalTitle"
  );

const noticeModalCloseBtn =
  document.getElementById(
    "noticeModalCloseBtn"
  );

const noticeModalCancelBtn =
  document.getElementById(
    "noticeModalCancelBtn"
  );

const noticeSaveBtn =
  document.getElementById(
    "noticeSaveBtn"
  );

const noticeTitleInput =
  document.getElementById(
    "noticeTitleInput"
  );

const noticeCategoryInput =
  document.getElementById(
    "noticeCategoryInput"
  );

const noticeStatusInput =
  document.getElementById(
    "noticeStatusInput"
  );

const noticeTargetInput =
  document.getElementById(
    "noticeTargetInput"
  );

const noticeImportantInput =
  document.getElementById(
    "noticeImportantInput"
  );

const noticeContentInput =
  document.getElementById(
    "noticeContentInput"
  );

const totalNoticeCount =
  document.getElementById(
    "totalNoticeCount"
  );

const importantNoticeCount =
  document.getElementById(
    "importantNoticeCount"
  );

const publishedNoticeCount =
  document.getElementById(
    "publishedNoticeCount"
  );

const draftNoticeCount =
  document.getElementById(
    "draftNoticeCount"
  );

const scheduledNoticeCount =
  document.getElementById(
    "scheduledNoticeCount"
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(
    "ko-KR"
  );
}

function getStatusClass(status) {
  if (status === "게시중") {
    return "normal";
  }

  if (status === "예약") {
    return "late";
  }

  if (status === "임시저장") {
    return "location";
  }

  return "absent";
}

function updateSummary() {
  if (totalNoticeCount) {
    totalNoticeCount.textContent =
      notices.length;
  }

  if (importantNoticeCount) {
    importantNoticeCount.textContent =
      notices.filter(
        (notice) =>
          notice.important
      ).length;
  }

  if (publishedNoticeCount) {
    publishedNoticeCount.textContent =
      notices.filter(
        (notice) =>
          notice.status === "게시중"
      ).length;
  }

  if (draftNoticeCount) {
    draftNoticeCount.textContent =
      notices.filter(
        (notice) =>
          notice.status ===
          "임시저장"
      ).length;
  }

  if (scheduledNoticeCount) {
    scheduledNoticeCount.textContent =
      notices.filter(
        (notice) =>
          notice.status === "예약"
      ).length;
  }
}

async function loadTargetOptions() {
  const [
    workplaceResult,
    employeeResult,
  ] = await Promise.all([
    supabase
      .from("workplaces")
      .select("name")
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("users")
      .select("department")
      .not(
        "department",
        "is",
        null
      ),
  ]);

  if (workplaceResult.error) {
    console.error(
      "근무지역 조회 실패:",
      workplaceResult.error
    );
  }

  if (employeeResult.error) {
    console.error(
      "소속 조회 실패:",
      employeeResult.error
    );
  }

  const targets = [
    "전체 직원",

    ...new Set(
      (employeeResult.data || [])
        .map(
          (employee) =>
            employee.department
        )
        .filter(Boolean)
    ),

    ...new Set(
      (workplaceResult.data || [])
        .map(
          (workplace) =>
            workplace.name
        )
        .filter(Boolean)
    ),
  ];

  const uniqueTargets = [
    ...new Set(targets),
  ];

  const filterValue =
    noticeTargetFilter.value;

  const inputValue =
    noticeTargetInput.value;

  noticeTargetFilter.innerHTML = `
    <option value="all">
      전체 대상
    </option>

    ${uniqueTargets
      .map(
        (target) => `
          <option value="${escapeHtml(target)}">
            ${escapeHtml(target)}
          </option>
        `
      )
      .join("")}
  `;

  noticeTargetInput.innerHTML =
    uniqueTargets
      .map(
        (target) => `
          <option value="${escapeHtml(target)}">
            ${escapeHtml(target)}
          </option>
        `
      )
      .join("");

  if (
    uniqueTargets.includes(
      filterValue
    )
  ) {
    noticeTargetFilter.value =
      filterValue;
  }

  if (
    uniqueTargets.includes(
      inputValue
    )
  ) {
    noticeTargetInput.value =
      inputValue;
  }
}

async function loadNotices() {
  noticeTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-row">
        공지사항을 불러오는 중입니다.
      </td>
    </tr>
  `;

  const { data, error } =
    await supabase
      .from("notices")
      .select(`
        id,
        title,
        content,
        category,
        target,
        status,
        important,
        views,
        published_at,
        created_at,
        updated_at
      `)
      .order("important", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "공지사항 조회 실패:",
      error
    );

    noticeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">
          공지사항을 불러오지 못했습니다.
        </td>
      </tr>
    `;

    return;
  }

  notices = data || [];

  updateSummary();
  renderNoticeTable();

  if (selectedNoticeId) {
    const selectedNotice =
      notices.find(
        (notice) =>
          String(notice.id) ===
          String(selectedNoticeId)
      );

    if (selectedNotice) {
      renderNoticePreview(
        selectedNotice
      );
    } else {
      clearNoticePreview();
    }
  }
}

function filterNotices() {
  const keyword =
    noticeSearchInput.value
      .trim()
      .toLowerCase();

  const selectedCategory =
    noticeCategoryFilter.value;

  const selectedStatus =
    noticeStatusFilter.value;

  const selectedTarget =
    noticeTargetFilter.value;

  return notices.filter(
    (notice) => {
      const titleMatched =
        !keyword ||
        notice.title
          .toLowerCase()
          .includes(keyword);

      const categoryMatched =
        selectedCategory === "all" ||
        notice.category ===
          selectedCategory;

      const statusMatched =
        selectedStatus === "all" ||
        notice.status ===
          selectedStatus;

      const targetMatched =
        selectedTarget === "all" ||
        notice.target ===
          selectedTarget;

      return (
        titleMatched &&
        categoryMatched &&
        statusMatched &&
        targetMatched
      );
    }
  );
}

function renderNoticeTable() {
  const filteredNotices =
    filterNotices();

  if (!filteredNotices.length) {
    noticeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">
          조회된 공지사항이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  noticeTableBody.innerHTML =
    filteredNotices
      .map((notice) => `
        <tr>
          <td>
            <div class="notice-title-cell">
              ${
                notice.important
                  ? `
                    <span class="notice-important-badge">
                      중요
                    </span>
                  `
                  : ""
              }

              <strong>
                ${escapeHtml(notice.title)}
              </strong>
            </div>
          </td>

          <td>
            <span class="notice-category-chip">
              ${escapeHtml(notice.category)}
            </span>
          </td>

          <td>
            <span class="notice-target-text">
              ${escapeHtml(notice.target)}
            </span>
          </td>

          <td>
            <span class="status ${getStatusClass(
              notice.status
            )}">
              ${escapeHtml(notice.status)}
            </span>
          </td>

          <td>
            ${formatDate(notice.created_at)}
          </td>

          <td>
            ${Number(notice.views) || 0}
          </td>

          <td>
            <div class="notice-action-group">
              <button
                class="table-action-btn"
                type="button"
                data-notice-view="${escapeHtml(notice.id)}"
              >
                보기
              </button>

              <button
                class="table-action-btn"
                type="button"
                data-notice-edit="${escapeHtml(notice.id)}"
              >
                수정
              </button>

              <button
                class="table-action-btn notice-delete-btn"
                type="button"
                data-notice-delete="${escapeHtml(notice.id)}"
              >
                삭제
              </button>
            </div>
          </td>
        </tr>
      `)
      .join("");

  noticeTableBody
    .querySelectorAll(
      "[data-notice-view]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          selectNotice(
            button.dataset.noticeView
          );
        }
      );
    });

  noticeTableBody
    .querySelectorAll(
      "[data-notice-edit]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openEditNoticeModal(
            button.dataset.noticeEdit
          );
        }
      );
    });

  noticeTableBody
    .querySelectorAll(
      "[data-notice-delete]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteNotice(
            button.dataset.noticeDelete
          );
        }
      );
    });
}

function selectNotice(noticeId) {
  const notice =
    notices.find(
      (item) =>
        String(item.id) ===
        String(noticeId)
    );

  if (!notice) {
    return;
  }

  selectedNoticeId =
    notice.id;

  renderNoticePreview(notice);
}

function renderNoticePreview(notice) {
  noticePreviewEmpty.style.display =
    "none";

  noticePreviewContent.classList.add(
    "active"
  );

  previewCategory.textContent =
    notice.category;

  previewTitle.textContent =
    notice.title;

  previewMeta.textContent =
    `${notice.target} · ` +
    `${formatDate(notice.created_at)} · ` +
    `조회 ${Number(notice.views) || 0}`;

  previewBody.textContent =
    notice.content;
}

function clearNoticePreview() {
  selectedNoticeId = null;

  noticePreviewEmpty.style.display =
    "block";

  noticePreviewContent.classList.remove(
    "active"
  );
}

function openAddNoticeModal() {
  editingNoticeId = null;

  noticeModalTitle.textContent =
    "공지 작성";

  noticeTitleInput.value = "";
  noticeCategoryInput.value =
    "전체공지";
  noticeStatusInput.value =
    "게시중";
  noticeTargetInput.value =
    "전체 직원";
  noticeImportantInput.value =
    "false";
  noticeContentInput.value = "";

  noticeModal.classList.add("open");

  noticeTitleInput.focus();
}

function openEditNoticeModal(noticeId) {
  const notice =
    notices.find(
      (item) =>
        String(item.id) ===
        String(noticeId)
    );

  if (!notice) {
    return;
  }

  editingNoticeId =
    notice.id;

  noticeModalTitle.textContent =
    "공지 수정";

  noticeTitleInput.value =
    notice.title;

  noticeCategoryInput.value =
    notice.category;

  noticeStatusInput.value =
    notice.status;

  noticeTargetInput.value =
    notice.target;

  noticeImportantInput.value =
    notice.important
      ? "true"
      : "false";

  noticeContentInput.value =
    notice.content;

  noticeModal.classList.add("open");
}

function closeNoticeModal() {
  editingNoticeId = null;

  noticeModal.classList.remove(
    "open"
  );
}

async function saveNotice() {
  const title =
    noticeTitleInput.value.trim();

  const content =
    noticeContentInput.value.trim();

  if (!title || !content) {
    alert(
      "공지 제목과 내용을 입력해 주세요."
    );

    return;
  }

  noticeSaveBtn.disabled = true;
  noticeSaveBtn.textContent =
    "저장 중...";

  const existingNotice =
    notices.find(
      (notice) =>
        String(notice.id) ===
        String(editingNoticeId)
    );

  const status =
    noticeStatusInput.value;

  const noticeData = {
    title,
    content,

    category:
      noticeCategoryInput.value,

    target:
      noticeTargetInput.value,

    status,

    important:
      noticeImportantInput.value ===
      "true",

    updated_at:
      new Date().toISOString(),

    published_at:
      status === "게시중"
        ? existingNotice
            ?.published_at ||
          new Date().toISOString()
        : existingNotice
            ?.published_at ||
          null,
  };

  let result;

  if (editingNoticeId) {
    result = await supabase
      .from("notices")
      .update(noticeData)
      .eq(
        "id",
        editingNoticeId
      );
  } else {
    result = await supabase
      .from("notices")
      .insert(noticeData);
  }

  if (result.error) {
    console.error(
      "공지 저장 실패:",
      result.error
    );

    alert(
      `공지사항을 저장하지 못했습니다.\n${
        result.error.message || ""
      }`
    );

    noticeSaveBtn.disabled = false;
    noticeSaveBtn.textContent =
      "저장";

    return;
  }

  alert(
    editingNoticeId
      ? "공지사항이 수정되었습니다."
      : "공지사항이 등록되었습니다."
  );

  noticeSaveBtn.disabled = false;
  noticeSaveBtn.textContent =
    "저장";

  closeNoticeModal();
  await loadNotices();
}

async function deleteNotice(noticeId) {
  const notice =
    notices.find(
      (item) =>
        String(item.id) ===
        String(noticeId)
    );

  if (!notice) {
    return;
  }

  const confirmed = confirm(
    `"${notice.title}" 공지를 삭제하시겠습니까?\n삭제한 공지는 앱에서도 사라집니다.`
  );

  if (!confirmed) {
    return;
  }

  const { error } =
    await supabase
      .from("notices")
      .delete()
      .eq("id", noticeId);

  if (error) {
    console.error(
      "공지 삭제 실패:",
      error
    );

    alert(
      `공지사항을 삭제하지 못했습니다.\n${
        error.message || ""
      }`
    );

    return;
  }

  if (
    String(selectedNoticeId) ===
    String(noticeId)
  ) {
    clearNoticePreview();
  }

  alert(
    "공지사항이 삭제되었습니다."
  );

  await loadNotices();
}

function bindEvents() {
  noticeSearchInput.addEventListener(
    "input",
    renderNoticeTable
  );

  noticeCategoryFilter.addEventListener(
    "change",
    renderNoticeTable
  );

  noticeStatusFilter.addEventListener(
    "change",
    renderNoticeTable
  );

  noticeTargetFilter.addEventListener(
    "change",
    renderNoticeTable
  );

  addNoticeBtn.addEventListener(
    "click",
    openAddNoticeModal
  );

  noticeModalCloseBtn.addEventListener(
    "click",
    closeNoticeModal
  );

  noticeModalCancelBtn.addEventListener(
    "click",
    closeNoticeModal
  );

  noticeSaveBtn.addEventListener(
    "click",
    saveNotice
  );

  noticeModal.addEventListener(
    "click",
    (event) => {
      if (
        event.target === noticeModal
      ) {
        closeNoticeModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        noticeModal.classList.contains(
          "open"
        )
      ) {
        closeNoticeModal();
      }
    }
  );
}

async function initNoticePage() {
  const currentAdmin =
    await requireAdmin();

  if (!currentAdmin) {
    return;
  }

  bindEvents();

  await loadTargetOptions();
  await loadNotices();
}

initNoticePage();