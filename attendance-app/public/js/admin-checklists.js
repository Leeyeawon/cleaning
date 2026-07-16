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

const previewTableBody =
  document.getElementById(
    "checklistPreviewTableBody"
  );

const appCustomChecklistCatalog =
  document.getElementById(
    "appCustomChecklistCatalog"
  );

const appCustomItemCount =
  document.getElementById(
    "appCustomItemCount"
  );

const checklistDetailModal =
  document.getElementById(
    "checklistDetailModal"
  );

const checklistDetailCloseBtn =
  document.getElementById(
    "checklistDetailCloseBtn"
  );

const checklistDetailCancelBtn =
  document.getElementById(
    "checklistDetailCancelBtn"
  );

const checklistDetailPrintBtn =
  document.getElementById(
    "checklistDetailPrintBtn"
  );

const checklistDetailSubtitle =
  document.getElementById(
    "checklistDetailSubtitle"
  );

const checklistDetailWorkplace =
  document.getElementById(
    "checklistDetailWorkplace"
  );

const checklistDetailEmployee =
  document.getElementById(
    "checklistDetailEmployee"
  );

const checklistDetailDate =
  document.getElementById(
    "checklistDetailDate"
  );

const checklistDetailProgress =
  document.getElementById(
    "checklistDetailProgress"
  );

const checklistDetailTableBody =
  document.getElementById(
    "checklistDetailTableBody"
  );

const checklistDetailNote =
  document.getElementById(
    "checklistDetailNote"
  );

let appCustomItems = [];
let assignedItemOrder = [];
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
    customItemResult,
  ] = await Promise.all([
    supabase
      .from("checklist_items")
      .select(
        "id, label, active, created_at"
      )
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

    supabase
      .from(
        "employee_custom_checklist_items"
      )
      .select(`
        id,
        user_id,
        workplace_id,
        label,
        created_at,
        users (
          id,
          name,
          department
        )
      `)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (itemResult.error) {
    console.error(
      "점검 항목 조회 실패:",
      itemResult.error
    );
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

  if (customItemResult.error) {
    console.error(
      "앱 추가 항목 조회 실패:",
      customItemResult.error
    );
  }

  checklistItems =
    itemResult.data || [];

  workplaces =
    workplaceResult.data || [];

  appCustomItems =
    customItemResult.data || [];

  customItemMap =
    new Map(
      appCustomItems.map(
        (item) => [
          String(item.id),
          item.label,
        ]
      )
    );

  renderCatalog();
  renderAppCustomItems();
  renderWorkplaceOptions();

  await loadAssignments();
}

function renderAppCustomItems() {
  if (!appCustomChecklistCatalog) {
    return;
  }

  appCustomItemCount.textContent =
    `${appCustomItems.length}개`;

  if (!appCustomItems.length) {
    appCustomChecklistCatalog.innerHTML = `
      <p class="workflow-list-empty">
        앱에서 추가된 항목이 없습니다.
      </p>
    `;

    return;
  }

  appCustomChecklistCatalog.innerHTML =
    appCustomItems
      .map((item) => {
        const employeeName =
          item.users?.name ||
          "이름 없음";

        const workplaceName =
          getWorkplaceName(
            item.workplace_id
          );

        return `
          <article class="app-custom-item">
            <div class="app-custom-item-content">
              <strong>
                ${escapeHtml(item.label)}
              </strong>

              <p>
                ${escapeHtml(workplaceName)}
                ·
                ${escapeHtml(employeeName)}
              </p>
            </div>

            <span class="app-custom-badge">
              앱 추가
            </span>

            <button
              type="button"
              data-promote-custom="${escapeHtml(item.id)}"
            >
              현장 항목으로 전환
            </button>

            <button
              class="workflow-delete-button"
              type="button"
              data-delete-custom="${item.id}"
            >
              삭제
            </button>
          </article>
        `;
      })
      .join("");

  appCustomChecklistCatalog
    .querySelectorAll(
      "[data-promote-custom]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          promoteCustomChecklistItem(
            button.dataset.promoteCustom
          );
        }
      );
    });

    appCustomChecklistCatalog
  .querySelectorAll(
    "[data-delete-custom]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        const item =
          appCustomItems.find(
            (currentItem) =>
              currentItem.id ===
              button.dataset.deleteCustom
          );

        if (!item) {
          return;
        }

        await deleteAppCustomChecklistItem(
          item.id,
          item.label
        );
      }
    );
  });
}

async function promoteCustomChecklistItem(
  customItemId
) {
  const customItem =
    appCustomItems.find(
      (item) =>
        String(item.id) ===
        String(customItemId)
    );

  if (!customItem) {
    return;
  }

  const workplaceName =
    getWorkplaceName(
      customItem.workplace_id
    );

  const confirmed = confirm(
    `"${customItem.label}" 항목을 ${workplaceName} 공통 항목으로 전환하시겠습니까?\n해당 현장의 모든 팀장에게 표시됩니다.`
  );

  if (!confirmed) {
    return;
  }

  try {
    const {
      data: commonItem,
      error: commonItemError,
    } = await supabase
      .from("checklist_items")
      .upsert(
        {
          label:
            customItem.label,
          active: true,
        },
        {
          onConflict: "label",
        }
      )
      .select("id, label")
      .single();

    if (commonItemError) {
      throw commonItemError;
    }

    const {
      data: lastAssignment,
    } = await supabase
      .from(
        "workplace_checklist_items"
      )
      .select("sort_order")
      .eq(
        "workplace_id",
        String(
          customItem.workplace_id
        )
      )
      .order("sort_order", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const nextOrder =
      Number(
        lastAssignment?.sort_order
      ) + 1 || 0;

    const { error: assignmentError } =
      await supabase
        .from(
          "workplace_checklist_items"
        )
        .upsert(
          {
            workplace_id:
              String(
                customItem.workplace_id
              ),

            item_id:
              commonItem.id,

            sort_order:
              nextOrder,
          },
          {
            onConflict:
              "workplace_id,item_id",
          }
        );

    if (assignmentError) {
      throw assignmentError;
    }

    /*
      공통 항목으로 전환했으므로 개인 항목은 삭제한다.
      삭제하지 않으면 앱에 같은 항목이 두 번 표시된다.
    */
    const { error: deleteError } =
      await supabase
        .from(
          "employee_custom_checklist_items"
        )
        .delete()
        .eq(
          "id",
          customItem.id
        );

    if (deleteError) {
      throw deleteError;
    }

    alert(
      "앱 추가 항목이 현장 공통 항목으로 전환되었습니다."
    );

    await loadBaseData();
    await loadSubmissions();
  } catch (error) {
    console.error(
      "앱 항목 전환 실패:",
      error
    );

    alert(
      `현장 항목으로 전환하지 못했습니다.\n${
        error.message || ""
      }`
    );
  }
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
    assignedItemOrder = [];

    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        현장을 선택해 주세요.
      </p>
    `;

    updateAssignedCount();
    renderChecklistPreview();

    return;
  }

  assignedList.innerHTML = `
    <p class="workflow-list-empty">
      배정된 점검 항목을 불러오는 중입니다.
    </p>
  `;

  const { data, error } =
    await supabase
      .from(
        "workplace_checklist_items"
      )
      .select(
        "item_id, sort_order"
      )
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

    assignedItemOrder = [];

    assignedList.innerHTML = `
      <p class="workflow-list-empty error">
        배정 항목을 불러오지 못했습니다.
      </p>
    `;

    updateAssignedCount();
    renderChecklistPreview();

    return;
  }

  const validItemIds =
    new Set(
      checklistItems.map(
        (item) =>
          String(item.id)
      )
    );

  assignedItemOrder =
    (data || [])
      .map(
        (assignment) =>
          String(
            assignment.item_id
          )
      )
      .filter((itemId) =>
        validItemIds.has(itemId)
      );

  renderAssignmentItems();
}

function renderAssignmentItems() {
  if (!checklistItems.length) {
    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        왼쪽 보관함에서 점검 항목을 먼저 추가해 주세요.
      </p>
    `;

    assignedItemOrder = [];

    updateAssignedCount();
    renderChecklistPreview();

    return;
  }

  const selectedIds =
    new Set(assignedItemOrder);

  assignedList.innerHTML =
    checklistItems
      .map((item) => {
        const itemId =
          String(item.id);

        const checked =
          selectedIds.has(itemId);

        return `
          <label class="workflow-check checklist-select-item">
            <input
              type="checkbox"
              value="${escapeHtml(itemId)}"
              ${checked ? "checked" : ""}
            />

            <span>
              ${escapeHtml(item.label)}
            </span>

            <small>
              ${
                checked
                  ? "앱에 표시"
                  : "표시 안 함"
              }
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
        () => {
          const itemId =
            String(
              checkbox.value
            );

          if (checkbox.checked) {
            if (
              !assignedItemOrder.includes(
                itemId
              )
            ) {
              assignedItemOrder.push(
                itemId
              );
            }
          } else {
            assignedItemOrder =
              assignedItemOrder.filter(
                (selectedId) =>
                  selectedId !== itemId
              );
          }

          const statusText =
            checkbox
              .closest(
                ".checklist-select-item"
              )
              ?.querySelector("small");

          if (statusText) {
            statusText.textContent =
              checkbox.checked
                ? "앱에 표시"
                : "표시 안 함";
          }

          updateAssignedCount();
          renderChecklistPreview();
        }
      );
    });

  updateAssignedCount();
  renderChecklistPreview();
}

function updateAssignedCount() {
  assignedItemCount.textContent =
    `${assignedItemOrder.length}개 선택`;
}

function getChecklistItem(
  itemId
) {
  return checklistItems.find(
    (item) =>
      String(item.id) ===
      String(itemId)
  );
}

function renderChecklistPreview() {
  if (!previewTableBody) {
    return;
  }

  if (!assignedItemOrder.length) {
    previewTableBody.innerHTML = `
      <tr>
        <td
          colspan="3"
          class="checklist-preview-empty"
        >
          위에서 앱에 표시할 항목을 선택해 주세요.
        </td>
      </tr>
    `;

    return;
  }

  previewTableBody.innerHTML =
    assignedItemOrder
      .map((itemId, index) => {
        const item =
          getChecklistItem(itemId);

        if (!item) {
          return "";
        }

        const isFirst =
          index === 0;

        const isLast =
          index ===
          assignedItemOrder.length - 1;

        return `
          <tr>
            <td>
              <strong class="checklist-order-number">
                ${index + 1}
              </strong>
            </td>

            <td>
              <div class="checklist-preview-name">
                <span class="checklist-preview-checkbox">
                  ✓
                </span>

                <strong>
                  ${escapeHtml(item.label)}
                </strong>
              </div>
            </td>

            <td>
              <div class="checklist-order-actions">
                <button
                  type="button"
                  data-move-item="${escapeHtml(itemId)}"
                  data-direction="-1"
                  aria-label="위로 이동"
                  ${isFirst ? "disabled" : ""}
                >
                  ↑
                </button>

                <button
                  type="button"
                  data-move-item="${escapeHtml(itemId)}"
                  data-direction="1"
                  aria-label="아래로 이동"
                  ${isLast ? "disabled" : ""}
                >
                  ↓
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  previewTableBody
    .querySelectorAll(
      "[data-move-item]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          moveChecklistItem(
            button.dataset.moveItem,
            Number(
              button.dataset.direction
            )
          );
        }
      );
    });
}

function moveChecklistItem(
  itemId,
  direction
) {
  const currentIndex =
    assignedItemOrder.indexOf(
      String(itemId)
    );

  if (currentIndex < 0) {
    return;
  }

  const nextIndex =
    currentIndex + direction;

  if (
    nextIndex < 0 ||
    nextIndex >=
      assignedItemOrder.length
  ) {
    return;
  }

  const reorderedItems = [
    ...assignedItemOrder,
  ];

  [
    reorderedItems[currentIndex],
    reorderedItems[nextIndex],
  ] = [
    reorderedItems[nextIndex],
    reorderedItems[currentIndex],
  ];

  assignedItemOrder =
    reorderedItems;

  renderChecklistPreview();

  showSaveMessage(
    "표시 순서가 변경되었습니다. 저장 버튼을 눌러 적용해 주세요."
  );
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
    alert(
      "현장을 선택해 주세요."
    );

    return;
  }

  const assignments =
    assignedItemOrder.map(
      (itemId, index) => ({
        workplace_id:
          String(workplaceId),

        item_id:
          itemId,

        sort_order:
          index,
      })
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "저장 중...";

  showSaveMessage("");

  const { error: deleteError } =
    await supabase
      .from(
        "workplace_checklist_items"
      )
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
      "기존 점검표 정보를 정리하지 못했습니다."
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
    "선택 항목과 표시 순서가 저장되었습니다.",
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

function getSubmissionItemResults(
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
        return {
          id:
            String(item.id || ""),

          label:
            item.label ||
            commonItemMap.get(
              String(item.id)
            ) ||
            customItemMap.get(
              String(item.id)
            ) ||
            "삭제된 항목",

          /*
            기존 제출 데이터에는 checked 값이 없다.
            기존 데이터는 모두 완료 항목으로 처리한다.
          */
          checked:
            item.checked !== false,
        };
      }

      return {
        id:
          String(item),

        label:
          commonItemMap.get(
            String(item)
          ) ||
          customItemMap.get(
            String(item)
          ) ||
          "삭제된 항목",

        checked: true,
      };
    }
  );
}

function getSubmittedItemLabels(
  checkedItems
) {
  return getSubmissionItemResults(
    checkedItems
  )
    .filter(
      (item) => item.checked
    )
    .map(
      (item) => item.label
    );
}

function openChecklistSubmissionDetail(
  submissionId
) {
  const submission =
    submissions.find(
      (item) =>
        String(item.id) ===
        String(submissionId)
    );

  if (!submission) {
    return;
  }

  const results =
    getSubmissionItemResults(
      submission.checked_items
    );

  const completedResults =
    results.filter(
      (item) => item.checked
    );

  const employeeName =
    submission.users?.name ||
    "이름 없음";

  const department =
    submission.users?.department ||
    "소속 미지정";

  const workplaceName =
    getWorkplaceName(
      submission.workplace_id
    );


  checklistDetailCloseBtn
    ?.addEventListener(
      "click",
      closeChecklistSubmissionDetail
    );

  checklistDetailCancelBtn
    ?.addEventListener(
      "click",
      closeChecklistSubmissionDetail
    );

  checklistDetailPrintBtn
    ?.addEventListener(
      "click",
      printChecklistSubmissionDetail
    );

  checklistDetailModal
    ?.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          checklistDetailModal
        ) {
          closeChecklistSubmissionDetail();
        }
      }
    );

  checklistDetailSubtitle.textContent =
    `${workplaceName} · ${employeeName}`;

  checklistDetailWorkplace.textContent =
    workplaceName;

  checklistDetailEmployee.textContent =
    `${employeeName} · ${department}`;

  checklistDetailDate.textContent =
    formatSubmissionDate(
      submission.created_at
    );

  checklistDetailProgress.textContent =
    `${completedResults.length} / ${results.length}`;

  checklistDetailNote.textContent =
    submission.note || "메모 없음";

  if (!results.length) {
    checklistDetailTableBody.innerHTML = `
      <tr>
        <td
          colspan="3"
          class="checklist-detail-empty"
        >
          저장된 점검 항목이 없습니다.
        </td>
      </tr>
    `;
  } else {
    checklistDetailTableBody.innerHTML =
      results
        .map(
          (item, index) => `
            <tr>
              <td>
                ${index + 1}
              </td>

              <td>
                ${escapeHtml(item.label)}
              </td>

              <td>
                <span class="checklist-result ${
                  item.checked
                    ? "completed"
                    : "incomplete"
                }">
                  ${
                    item.checked
                      ? "완료"
                      : "미완료"
                  }
                </span>
              </td>
            </tr>
          `
        )
        .join("");
  }

  checklistDetailModal.classList.add(
    "open"
  );

  checklistDetailModal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeChecklistSubmissionDetail() {
  checklistDetailModal.classList.remove(
    "open"
  );

  checklistDetailModal.setAttribute(
    "aria-hidden",
    "true"
  );
}

function printChecklistSubmissionDetail() {
  document.body.classList.add(
    "checklist-detail-printing"
  );

  const removePrintClass = () => {
    document.body.classList.remove(
      "checklist-detail-printing"
    );
  };

  window.addEventListener(
    "afterprint",
    removePrintClass,
    {
      once: true,
    }
  );

  window.print();

  setTimeout(
    removePrintClass,
    1500
  );
}

async function loadSubmissions() {
  submissionTableBody.innerHTML = `
    <tr>
      <td
        colspan="7"
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
          colspan="7"
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
          colspan="7"
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
        const results =
          getSubmissionItemResults(
            submission.checked_items
          );

        const completedResults =
          results.filter(
            (item) => item.checked
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
                ${completedResults.length}
                /
                ${results.length}
              </strong>
            </td>

            <td>
              <div class="workflow-submitted-items">
                ${
                  completedResults.length
                    ? completedResults
                        .slice(0, 3)
                        .map(
                          (item) => `
                            <span>
                              ${escapeHtml(item.label)}
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

                ${
                  completedResults.length > 3
                    ? `
                      <em>
                        외 ${completedResults.length - 3}개
                      </em>
                    `
                    : ""
                }
              </div>
            </td>

            <td class="workflow-submission-note">
              ${escapeHtml(
                submission.note || "-"
              )}
            </td>

            <td>
              <button
                type="button"
                class="workflow-detail-button"
                data-submission-detail="${escapeHtml(submission.id)}"
              >
                상세
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

  submissionTableBody
    .querySelectorAll(
      "[data-submission-detail]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openChecklistSubmissionDetail(
            button.dataset
              .submissionDetail
          );
        }
      );
    });
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

async function deleteAppCustomChecklistItem(
  itemId,
  itemLabel
) {
  const confirmed = confirm(
    `"${itemLabel}" 항목을 삭제하시겠습니까?\n\n삭제하면 해당 직원의 앱 점검표에서도 사라집니다.`
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabase
    .from(
      "employee_custom_checklist_items"
    )
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error(
      "앱 추가 항목 삭제 실패:",
      error
    );

    alert(
      `항목을 삭제하지 못했습니다.\n${error.message}`
    );

    return;
  }

  alert("앱 추가 항목이 삭제되었습니다.");

  await loadBaseData();
}