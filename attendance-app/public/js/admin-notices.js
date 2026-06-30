/* =========================
  공지사항 페이지
========================= */

const notices = [
  {
    id: "notice001",
    title: "서면 B구역 출근 기준 위치 변경 안내",
    category: "근무안내",
    target: "서면 B구역",
    status: "게시중",
    important: true,
    createdAt: "2026.06.30",
    views: 42,
    content:
      "서면 B구역 출근 기준 위치가 건물 정문 기준으로 변경되었습니다.\n\n출근 시 지정 반경 안에서만 출근 처리가 가능하니, 반드시 정문 근처에서 출근을 진행해 주세요.",
  },
  {
    id: "notice002",
    title: "7월 근무 일정 확인 요청",
    category: "전체공지",
    target: "전체 직원",
    status: "게시중",
    important: false,
    createdAt: "2026.06.29",
    views: 87,
    content:
      "7월 근무 일정이 등록되었습니다.\n\n직원 앱에서 본인 근무 일정과 배정 지역을 확인해 주세요. 일정에 이상이 있을 경우 관리자에게 문의 바랍니다.",
  },
  {
    id: "notice003",
    title: "청소 비품 추가 지급 안내",
    category: "비품안내",
    target: "현장팀",
    status: "예약",
    important: false,
    createdAt: "2026.07.01",
    views: 0,
    content:
      "현장팀 비품 추가 지급이 예정되어 있습니다.\n\n지급 품목은 장갑, 봉투, 소독 티슈이며 상세 지급 일정은 추후 안내됩니다.",
  },
  {
    id: "notice004",
    title: "태풍 예보로 인한 긴급 근무 안내",
    category: "긴급공지",
    target: "전체 직원",
    status: "임시저장",
    important: true,
    createdAt: "2026.06.28",
    views: 0,
    content:
      "태풍 예보로 인해 일부 근무지역 운영 시간이 변경될 수 있습니다.\n\n확정 내용은 관리자 확인 후 재공지 예정입니다.",
  },
];

let selectedNoticeIndex = null;
let editingNoticeIndex = null;

const noticeTableBody = document.getElementById("noticeTableBody");
const noticeSearchInput = document.getElementById("noticeSearchInput");
const noticeCategoryFilter = document.getElementById("noticeCategoryFilter");
const noticeStatusFilter = document.getElementById("noticeStatusFilter");
const noticeTargetFilter = document.getElementById("noticeTargetFilter");

const noticePreviewEmpty = document.getElementById("noticePreviewEmpty");
const noticePreviewContent = document.getElementById("noticePreviewContent");
const previewCategory = document.getElementById("previewCategory");
const previewTitle = document.getElementById("previewTitle");
const previewMeta = document.getElementById("previewMeta");
const previewBody = document.getElementById("previewBody");

const addNoticeBtn = document.getElementById("addNoticeBtn");
const noticeModal = document.getElementById("noticeModal");
const noticeModalTitle = document.getElementById("noticeModalTitle");
const noticeModalCloseBtn = document.getElementById("noticeModalCloseBtn");
const noticeModalCancelBtn = document.getElementById("noticeModalCancelBtn");
const noticeSaveBtn = document.getElementById("noticeSaveBtn");

const noticeTitleInput = document.getElementById("noticeTitleInput");
const noticeCategoryInput = document.getElementById("noticeCategoryInput");
const noticeStatusInput = document.getElementById("noticeStatusInput");
const noticeTargetInput = document.getElementById("noticeTargetInput");
const noticeImportantInput = document.getElementById("noticeImportantInput");
const noticeContentInput = document.getElementById("noticeContentInput");

function getStatusClass(status) {
  if (status === "게시중") return "normal";
  if (status === "예약") return "late";
  if (status === "임시저장") return "location";
  return "absent";
}

function filterNotices() {
  const keyword = noticeSearchInput ? noticeSearchInput.value.trim() : "";
  const selectedCategory = noticeCategoryFilter ? noticeCategoryFilter.value : "all";
  const selectedStatus = noticeStatusFilter ? noticeStatusFilter.value : "all";
  const selectedTarget = noticeTargetFilter ? noticeTargetFilter.value : "all";

  return notices.filter((notice) => {
    const titleMatched = keyword === "" || notice.title.includes(keyword);
    const categoryMatched =
      selectedCategory === "all" || notice.category === selectedCategory;
    const statusMatched =
      selectedStatus === "all" || notice.status === selectedStatus;
    const targetMatched =
      selectedTarget === "all" || notice.target === selectedTarget;

    return titleMatched && categoryMatched && statusMatched && targetMatched;
  });
}

function renderNoticeTable() {
  if (!noticeTableBody) return;

  const filteredNotices = filterNotices();

  if (filteredNotices.length === 0) {
    noticeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">조회된 공지사항이 없습니다.</td>
      </tr>
    `;
    return;
  }

  noticeTableBody.innerHTML = filteredNotices
    .map((notice) => {
      const originalIndex = notices.indexOf(notice);

      return `
        <tr>
          <td>
            <div class="notice-title-cell">
              ${
                notice.important
                  ? `<span class="notice-important-badge">중요</span>`
                  : ""
              }
              <strong>${notice.title}</strong>
            </div>
          </td>
          <td>
            <span class="notice-category-chip">${notice.category}</span>
          </td>
          <td>
            <span class="notice-target-text">${notice.target}</span>
          </td>
          <td>
            <span class="status ${getStatusClass(notice.status)}">
              ${notice.status}
            </span>
          </td>
          <td>${notice.createdAt}</td>
          <td>${notice.views}</td>
          <td>
            <div class="notice-action-group">
              <button class="table-action-btn" type="button" onclick="selectNotice(${originalIndex})">
                보기
              </button>
              <button class="table-action-btn" type="button" onclick="openEditNoticeModal(${originalIndex})">
                수정
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function selectNotice(index) {
  selectedNoticeIndex = index;
  const notice = notices[index];

  noticePreviewEmpty.style.display = "none";
  noticePreviewContent.classList.add("active");

  previewCategory.textContent = notice.category;
  previewTitle.textContent = notice.title;
  previewMeta.textContent = `${notice.target} · ${notice.createdAt} · 조회 ${notice.views}`;
  previewBody.textContent = notice.content;
}

function openAddNoticeModal() {
  editingNoticeIndex = null;
  noticeModalTitle.textContent = "공지 작성";

  noticeTitleInput.value = "";
  noticeCategoryInput.value = "전체공지";
  noticeStatusInput.value = "게시중";
  noticeTargetInput.value = "전체 직원";
  noticeImportantInput.value = "false";
  noticeContentInput.value = "";

  noticeModal.classList.add("open");
}

function openEditNoticeModal(index) {
  editingNoticeIndex = index;
  const notice = notices[index];

  noticeModalTitle.textContent = "공지 수정";

  noticeTitleInput.value = notice.title;
  noticeCategoryInput.value = notice.category;
  noticeStatusInput.value = notice.status;
  noticeTargetInput.value = notice.target;
  noticeImportantInput.value = notice.important ? "true" : "false";
  noticeContentInput.value = notice.content;

  noticeModal.classList.add("open");
}

function closeNoticeModal() {
  editingNoticeIndex = null;
  noticeModal.classList.remove("open");
}

function saveNotice() {
  const title = noticeTitleInput.value.trim();
  const content = noticeContentInput.value.trim();

  if (!title || !content) {
    alert("공지 제목과 내용을 입력해 주세요.");
    return;
  }

  const noticeData = {
    id:
      editingNoticeIndex === null
        ? `notice${Date.now()}`
        : notices[editingNoticeIndex].id,
    title,
    category: noticeCategoryInput.value,
    target: noticeTargetInput.value,
    status: noticeStatusInput.value,
    important: noticeImportantInput.value === "true",
    createdAt:
      editingNoticeIndex === null
        ? getTodayText()
        : notices[editingNoticeIndex].createdAt,
    views: editingNoticeIndex === null ? 0 : notices[editingNoticeIndex].views,
    content,
  };

  if (editingNoticeIndex === null) {
    notices.unshift(noticeData);
  } else {
    notices[editingNoticeIndex] = noticeData;
  }

  renderNoticeTable();
  closeNoticeModal();
}

function getTodayText() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function initNoticePage() {
  renderNoticeTable();

  if (noticeSearchInput) {
    noticeSearchInput.addEventListener("input", renderNoticeTable);
  }

  if (noticeCategoryFilter) {
    noticeCategoryFilter.addEventListener("change", renderNoticeTable);
  }

  if (noticeStatusFilter) {
    noticeStatusFilter.addEventListener("change", renderNoticeTable);
  }

  if (noticeTargetFilter) {
    noticeTargetFilter.addEventListener("change", renderNoticeTable);
  }

  if (addNoticeBtn) {
    addNoticeBtn.addEventListener("click", openAddNoticeModal);
  }

  if (noticeModalCloseBtn) {
    noticeModalCloseBtn.addEventListener("click", closeNoticeModal);
  }

  if (noticeModalCancelBtn) {
    noticeModalCancelBtn.addEventListener("click", closeNoticeModal);
  }

  if (noticeSaveBtn) {
    noticeSaveBtn.addEventListener("click", saveNotice);
  }

  if (noticeModal) {
    noticeModal.addEventListener("click", (event) => {
      if (event.target === noticeModal) {
        closeNoticeModal();
      }
    });
  }
}

initNoticePage();