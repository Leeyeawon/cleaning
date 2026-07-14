import supabase from "./supabase.js";
import { requireAdmin } from "./adminAuth.js";

const itemForm =
  document.getElementById(
    "checklistItemForm"
  );

const itemInput =
  document.getElementById(
    "checklistItemInput"
  );

const catalog =
  document.getElementById(
    "checklistCatalog"
  );

const itemCount =
  document.getElementById(
    "checklistItemCount"
  );

const workplaceSelect =
  document.getElementById(
    "checklistWorkplaceSelect"
  );

const assignedList =
  document.getElementById(
    "workplaceChecklistItems"
  );

const assignedItemCount =
  document.getElementById(
    "assignedItemCount"
  );

const saveButton =
  document.getElementById(
    "saveWorkplaceChecklistBtn"
  );

const saveMessage =
  document.getElementById(
    "checklistSaveMessage"
  );

const submissionCount =
  document.getElementById(
    "submissionCount"
  );

const submissionDateFilter =
  document.getElementById(
    "submissionDateFilter"
  );

const submissionWorkplaceFilter =
  document.getElementById(
    "submissionWorkplaceFilter"
  );

const submissionSearchInput =
  document.getElementById(
    "submissionSearchInput"
  );

const submissionFilterResetBtn =
  document.getElementById(
    "submissionFilterResetBtn"
  );

const submissionTableBody =
  document.getElementById(
    "submissionTableBody"
  );

let submissions = [];
let customItemMap = new Map();
let checklistItems = [];
let workplaces = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showSaveMessage(
  message,
  type = ""
) {
  saveMessage.textContent = message;
  saveMessage.className =
    `workflow-save-message ${type}`;
}

async function loadBaseData() {
  const [
    itemResult,
    workplaceResult,
  ] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, label, active, created_at")
      .eq("active", true)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("workplaces")
      .select("id, name")
      .order("name", {
        ascending: true,
      }),
  ]);

  if (itemResult.error) {
    console.error(
      "점검 항목 조회 실패:",
      itemResult.error
    );

    catalog.innerHTML = `
      <p class="workflow-list-empty error">
        점검 항목을 불러오지 못했습니다.
      </p>
    `;
  }

  if (workplaceResult.error) {
    console.error(
      "현장 조회 실패:",
      workplaceResult.error
    );

    workplaceSelect.innerHTML = `
      <option value="">
        현장을 불러오지 못했습니다.
      </option>
    `;

    saveButton.disabled = true;
    return;
  }

  checklistItems =
    itemResult.data || [];

  workplaces =
    workplaceResult.data || [];

  renderCatalog();
  renderWorkplaceOptions();

  await loadAssignments();
}

function renderCatalog() {
  itemCount.textContent =
    `${checklistItems.length}개`;

  if (!checklistItems.length) {
    catalog.innerHTML = `
      <p class="workflow-list-empty">
        등록된 점검 항목이 없습니다.
      </p>
    `;

    return;
  }

  catalog.innerHTML =
    checklistItems
      .map((item, index) => `
        <div class="workflow-item">
          <strong class="workflow-item-number">
            ${index + 1}
          </strong>

          <span>
            ${escapeHtml(item.label)}
          </span>

          <button
            type="button"
            data-delete-item="${escapeHtml(item.id)}"
          >
            삭제
          </button>
        </div>
      `)
      .join("");

  catalog
    .querySelectorAll(
      "[data-delete-item]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteChecklistItem(
            button.dataset.deleteItem
          );
        }
      );
    });
}

function renderWorkplaceOptions() {
  if (!workplaces.length) {
    workplaceSelect.innerHTML = `
      <option value="">
        등록된 현장이 없습니다.
      </option>
    `;

    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        먼저 근무지역 관리에서 현장을 등록해 주세요.
      </p>
    `;

    saveButton.disabled = true;
    return;
  }

  workplaceSelect.innerHTML =
    workplaces
      .map((workplace) => `
        <option value="${escapeHtml(workplace.id)}">
          ${escapeHtml(workplace.name)}
        </option>
      `)
      .join("");

  saveButton.disabled = false;
}

async function loadAssignments() {
  const workplaceId =
    workplaceSelect.value;

  showSaveMessage("");

  if (!workplaceId) {
    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        현장을 선택해 주세요.
      </p>
    `;

    assignedItemCount.textContent =
      "0개 선택";

    return;
  }

  assignedList.innerHTML = `
    <p class="workflow-list-empty">
      배정 항목을 불러오는 중입니다.
    </p>
  `;

  const { data, error } =
    await supabase
      .from("workplace_checklist_items")
      .select("item_id, sort_order")
      .eq(
        "workplace_id",
        String(workplaceId)
      )
      .order("sort_order", {
        ascending: true,
      });

  if (error) {
    console.error(
      "배정 항목 조회 실패:",
      error
    );

    assignedList.innerHTML = `
      <p class="workflow-list-empty error">
        배정 항목을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  const selectedIds =
    new Set(
      (data || []).map(
        (assignment) =>
          String(assignment.item_id)
      )
    );

  renderAssignmentItems(
    selectedIds
  );
}

function renderAssignmentItems(
  selectedIds
) {
  if (!checklistItems.length) {
    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        왼쪽에서 점검 항목을 먼저 추가해 주세요.
      </p>
    `;

    assignedItemCount.textContent =
      "0개 선택";

    return;
  }

  assignedList.innerHTML =
    checklistItems
      .map((item, index) => {
        const checked =
          selectedIds.has(
            String(item.id)
          );

        return `
          <label class="workflow-check">
            <input
              type="checkbox"
              value="${escapeHtml(item.id)}"
              ${checked ? "checked" : ""}
            />

            <span>
              ${escapeHtml(item.label)}
            </span>

            <small>
              ${index + 1}
            </small>
          </label>
        `;
      })
      .join("");

  assignedList
    .querySelectorAll(
      'input[type="checkbox"]'
    )
    .forEach((checkbox) => {
      checkbox.addEventListener(
        "change",
        updateAssignedCount
      );
    });

  updateAssignedCount();
}

function updateAssignedCount() {
  const selectedCount =
    assignedList.querySelectorAll(
      'input[type="checkbox"]:checked'
    ).length;

  assignedItemCount.textContent =
    `${selectedCount}개 선택`;
}

async function addChecklistItem(event) {
  event.preventDefault();

  const label =
    itemInput.value.trim();

  if (!label) {
    alert(
      "추가할 점검 항목을 입력해 주세요."
    );

    return;
  }

  const submitButton =
    itemForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.disabled = true;
  submitButton.textContent =
    "추가 중...";

  const { error } =
    await supabase
      .from("checklist_items")
      .insert({
        label,
        active: true,
      });

  if (error) {
    console.error(
      "점검 항목 추가 실패:",
      error
    );

    if (error.code === "23505") {
      alert(
        "이미 등록된 점검 항목입니다."
      );
    } else {
      alert(
        `점검 항목을 추가하지 못했습니다.\n${
          error.message || ""
        }`
      );
    }

    submitButton.disabled = false;
    submitButton.textContent =
      "항목 추가";

    return;
  }

  itemInput.value = "";

  submitButton.disabled = false;
  submitButton.textContent =
    "항목 추가";

  await loadBaseData();
}

async function deleteChecklistItem(
  itemId
) {
  const item =
    checklistItems.find(
      (checklistItem) =>
        String(checklistItem.id) ===
        String(itemId)
    );

  const confirmed = confirm(
    `"${item?.label || "이 항목"}"을 삭제하시겠습니까?\n모든 현장의 배정 목록에서도 제거됩니다.`
  );

  if (!confirmed) {
    return;
  }

  const { error } =
    await supabase
      .from("checklist_items")
      .delete()
      .eq("id", itemId);

  if (error) {
    console.error(
      "점검 항목 삭제 실패:",
      error
    );

    alert(
      `항목을 삭제하지 못했습니다.\n${
        error.message || ""
      }`
    );

    return;
  }

  await loadBaseData();
}

async function saveWorkplaceAssignments() {
  const workplaceId =
    workplaceSelect.value;

  if (!workplaceId) {
    alert("현장을 선택해 주세요.");
    return;
  }

  const checkedInputs = [
    ...assignedList.querySelectorAll(
      'input[type="checkbox"]:checked'
    ),
  ];

  const assignments =
    checkedInputs.map(
      (input, index) => ({
        workplace_id:
          String(workplaceId),
        item_id: input.value,
        sort_order: index,
      })
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "저장 중...";

  showSaveMessage("");

  const { error: deleteError } =
    await supabase
      .from("workplace_checklist_items")
      .delete()
      .eq(
        "workplace_id",
        String(workplaceId)
      );

  if (deleteError) {
    console.error(
      "기존 배정 삭제 실패:",
      deleteError
    );

    alert(
      "기존 배정 항목을 정리하지 못했습니다."
    );

    saveButton.disabled = false;
    saveButton.textContent =
      "현장 점검표 저장";

    return;
  }

  if (assignments.length) {
    const { error: insertError } =
      await supabase
        .from(
          "workplace_checklist_items"
        )
        .insert(assignments);

    if (insertError) {
      console.error(
        "점검표 저장 실패:",
        insertError
      );

      alert(
        `점검표를 저장하지 못했습니다.\n${
          insertError.message || ""
        }`
      );

      saveButton.disabled = false;
      saveButton.textContent =
        "현장 점검표 저장";

      return;
    }
  }

  saveButton.disabled = false;
  saveButton.textContent =
    "현장 점검표 저장";

  showSaveMessage(
    "현장 점검표가 저장되었습니다.",
    "success"
  );

  await loadAssignments();
}

function formatSubmissionDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

function renderSubmissionWorkplaces() {
  const currentValue =
    submissionWorkplaceFilter.value;

  submissionWorkplaceFilter.innerHTML = `
    <option value="all">
      전체 현장
    </option>

    ${workplaces
      .map(
        (workplace) => `
          <option value="${escapeHtml(workplace.id)}">
            ${escapeHtml(workplace.name)}
          </option>
        `
      )
      .join("")}
  `;

  const valueExists = [
    ...submissionWorkplaceFilter.options,
  ].some(
    (option) =>
      option.value === currentValue
  );

  if (valueExists) {
    submissionWorkplaceFilter.value =
      currentValue;
  }
}

function getWorkplaceName(workplaceId) {
  const workplace =
    workplaces.find(
      (item) =>
        String(item.id) ===
        String(workplaceId)
    );

  return workplace?.name ||
    "삭제된 현장";
}

function getSubmittedItemLabels(
  checkedItems
) {
  if (!Array.isArray(checkedItems)) {
    return [];
  }

  const commonItemMap =
    new Map(
      checklistItems.map(
        (item) => [
          String(item.id),
          item.label,
        ]
      )
    );

  return checkedItems.map(
    (item) => {
      if (
        item &&
        typeof item === "object"
      ) {
        return (
          item.label ||
          commonItemMap.get(
            String(item.id)
          ) ||
          customItemMap.get(
            String(item.id)
          ) ||
          "삭제된 항목"
        );
      }

      return (
        commonItemMap.get(
          String(item)
        ) ||
        customItemMap.get(
          String(item)
        ) ||
        "삭제된 항목"
      );
    }
  );
}

async function loadSubmissions() {
  submissionTableBody.innerHTML = `
    <tr>
      <td
        colspan="6"
        class="workflow-empty"
      >
        제출 내역을 불러오는 중입니다.
      </td>
    </tr>
  `;

  const [
    submissionResult,
    customItemResult,
  ] = await Promise.all([
    supabase
      .from(
        "cleaning_checklist_submissions"
      )
      .select(`
        id,
        user_id,
        workplace_id,
        work_date,
        checked_items,
        note,
        created_at,
        users (
          id,
          name,
          department
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(200),

    supabase
      .from(
        "employee_custom_checklist_items"
      )
      .select("id, label"),
  ]);

  if (submissionResult.error) {
    console.error(
      "점검표 제출 내역 조회 실패:",
      submissionResult.error
    );

    submissionTableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="workflow-empty error"
        >
          제출 내역을 불러오지 못했습니다.
        </td>
      </tr>
    `;

    return;
  }

  if (customItemResult.error) {
    console.error(
      "개인 점검 항목 조회 실패:",
      customItemResult.error
    );
  }

  customItemMap =
    new Map(
      (
        customItemResult.data || []
      ).map((item) => [
        String(item.id),
        item.label,
      ])
    );

  submissions =
    submissionResult.data || [];

  renderSubmissions();
}

function renderSubmissions() {
  const selectedDate =
    submissionDateFilter.value;

  const selectedWorkplace =
    submissionWorkplaceFilter.value;

  const keyword =
    submissionSearchInput.value
      .trim()
      .toLowerCase();

  const filteredSubmissions =
    submissions.filter(
      (submission) => {
        const dateMatched =
          !selectedDate ||
          submission.work_date ===
            selectedDate;

        const workplaceMatched =
          selectedWorkplace === "all" ||
          String(
            submission.workplace_id
          ) ===
            String(
              selectedWorkplace
            );

        const employeeName =
          submission.users?.name ||
          "";

        const searchMatched =
          !keyword ||
          employeeName
            .toLowerCase()
            .includes(keyword);

        return (
          dateMatched &&
          workplaceMatched &&
          searchMatched
        );
      }
    );

  submissionCount.textContent =
    `${filteredSubmissions.length}건`;

  if (!filteredSubmissions.length) {
    submissionTableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="workflow-empty"
        >
          조건에 맞는 제출 내역이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  submissionTableBody.innerHTML =
    filteredSubmissions
      .map((submission) => {
        const labels =
          getSubmittedItemLabels(
            submission.checked_items
          );

        const employeeName =
          submission.users?.name ||
          "이름 없음";

        const department =
          submission.users?.department ||
          "소속 미지정";

        return `
          <tr>
            <td>
              ${escapeHtml(
                formatSubmissionDate(
                  submission.created_at
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                getWorkplaceName(
                  submission.workplace_id
                )
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(employeeName)}
              </strong>

              <small class="workflow-department">
                ${escapeHtml(department)}
              </small>
            </td>

            <td>
              <strong>
                ${labels.length}개
              </strong>
            </td>

            <td>
              <div class="workflow-submitted-items">
                ${
                  labels.length
                    ? labels
                        .map(
                          (label) => `
                            <span>
                              ${escapeHtml(label)}
                            </span>
                          `
                        )
                        .join("")
                    : `
                      <em>
                        완료한 항목 없음
                      </em>
                    `
                }
              </div>
            </td>

            <td class="workflow-submission-note">
              ${escapeHtml(
                submission.note || "-"
              )}
            </td>
          </tr>
        `;
      })
      .join("");
}

submissionDateFilter.addEventListener(
  "change",
  renderSubmissions
);

submissionWorkplaceFilter.addEventListener(
  "change",
  renderSubmissions
);

submissionSearchInput.addEventListener(
  "input",
  renderSubmissions
);

submissionFilterResetBtn.addEventListener(
  "click",
  () => {
    submissionDateFilter.value = "";
    submissionWorkplaceFilter.value =
      "all";
    submissionSearchInput.value = "";

    renderSubmissions();
  }
);

itemForm.addEventListener(
  "submit",
  addChecklistItem
);

workplaceSelect.addEventListener(
  "change",
  loadAssignments
);

saveButton.addEventListener(
  "click",
  saveWorkplaceAssignments
);

const currentAdmin =
  await requireAdmin();

if (currentAdmin) {
  await loadBaseData();

  renderSubmissionWorkplaces();

  await loadSubmissions();
}