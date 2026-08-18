import supabase from "./supabase.js";

import {
  requireAdmin,
} from "./adminAuth.js";


const addWorkShiftBtn =
  document.getElementById(
    "addWorkShiftBtn"
  );

const workShiftTableBody =
  document.getElementById(
    "workShiftTableBody"
  );

const totalShiftCount =
  document.getElementById(
    "totalShiftCount"
  );

const activeShiftCount =
  document.getElementById(
    "activeShiftCount"
  );

const shiftWorkplaceCount =
  document.getElementById(
    "shiftWorkplaceCount"
  );

const shiftAssignmentCount =
  document.getElementById(
    "shiftAssignmentCount"
  );

const filteredShiftCount =
  document.getElementById(
    "filteredShiftCount"
  );

const shiftSearchInput =
  document.getElementById(
    "shiftSearchInput"
  );

const shiftWorkplaceFilter =
  document.getElementById(
    "shiftWorkplaceFilter"
  );

const shiftStatusFilter =
  document.getElementById(
    "shiftStatusFilter"
  );

const workShiftModal =
  document.getElementById(
    "workShiftModal"
  );

const workShiftModalTitle =
  document.getElementById(
    "workShiftModalTitle"
  );

const workShiftModalCloseBtn =
  document.getElementById(
    "workShiftModalCloseBtn"
  );

const workShiftModalCancelBtn =
  document.getElementById(
    "workShiftModalCancelBtn"
  );

const workShiftForm =
  document.getElementById(
    "workShiftForm"
  );

const workShiftSaveBtn =
  document.getElementById(
    "workShiftSaveBtn"
  );

const workShiftWorkplaceInput =
  document.getElementById(
    "workShiftWorkplaceInput"
  );

const workShiftNameInput =
  document.getElementById(
    "workShiftNameInput"
  );

const workShiftStartInput =
  document.getElementById(
    "workShiftStartInput"
  );

const workShiftEndInput =
  document.getElementById(
    "workShiftEndInput"
  );

const workShiftBreakInput =
  document.getElementById(
    "workShiftBreakInput"
  );

const workShiftSortInput =
  document.getElementById(
    "workShiftSortInput"
  );

const workShiftActiveInput =
  document.getElementById(
    "workShiftActiveInput"
  );

const workShiftMemoInput =
  document.getElementById(
    "workShiftMemoInput"
  );


let workplaces = [];
let workShifts = [];
let workplaceAssignments = [];

let editingShiftId = null;


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 5);
}


function getWorkplaceName(
  workplaceId
) {
  const workplace =
    workplaces.find(
      (item) =>
        String(item.id) ===
        String(workplaceId)
    );

  return workplace?.name ||
    "지역 정보 없음";
}


function getShiftAssignmentCount(
  shiftId
) {
  return workplaceAssignments.filter(
    (assignment) =>
      String(
        assignment.work_shift_id
      ) === String(shiftId)
  ).length;
}


function populateWorkplaceOptions() {
  const options =
    workplaces
      .map(
        (workplace) => `
          <option value="${workplace.id}">
            ${escapeHtml(workplace.name)}
          </option>
        `
      )
      .join("");

  shiftWorkplaceFilter.innerHTML = `
    <option value="all">
      전체 지역
    </option>

    ${options}
  `;

  workShiftWorkplaceInput.innerHTML = `
    <option value="">
      지역을 선택해 주세요
    </option>

    ${options}
  `;
}


function updateSummary() {
  totalShiftCount.textContent =
    workShifts.length;

  activeShiftCount.textContent =
    workShifts.filter(
      (shift) =>
        shift.is_active !== false
    ).length;

  shiftWorkplaceCount.textContent =
    new Set(
      workShifts.map(
        (shift) =>
          String(shift.workplace_id)
      )
    ).size;

  shiftAssignmentCount.textContent =
    workplaceAssignments.filter(
      (assignment) =>
        assignment.work_shift_id != null
    ).length;
}


function getFilteredShifts() {
  const keyword =
    shiftSearchInput.value
      .trim()
      .toLowerCase();

  const workplaceValue =
    shiftWorkplaceFilter.value;

  const statusValue =
    shiftStatusFilter.value;

  return workShifts.filter(
    (shift) => {
      const name =
        String(
          shift.name || ""
        ).toLowerCase();

      const workplaceName =
        getWorkplaceName(
          shift.workplace_id
        ).toLowerCase();

      const matchesKeyword =
        !keyword ||
        name.includes(keyword) ||
        workplaceName.includes(
          keyword
        );

      const matchesWorkplace =
        workplaceValue === "all" ||
        String(
          shift.workplace_id
        ) === workplaceValue;

      const matchesStatus =
        statusValue === "all" ||
        (
          statusValue === "active" &&
          shift.is_active !== false
        ) ||
        (
          statusValue === "inactive" &&
          shift.is_active === false
        );

      return (
        matchesKeyword &&
        matchesWorkplace &&
        matchesStatus
      );
    }
  );
}


function renderWorkShiftTable() {
  const filtered =
    getFilteredShifts();

  filteredShiftCount.textContent =
    `${filtered.length}개 시간대`;

  if (!filtered.length) {
    workShiftTableBody.innerHTML = `
      <tr>
        <td
          colspan="8"
          style="
            padding:34px;
            text-align:center;
            color:#737373;
          "
        >
          조건에 맞는 근무 시간대가 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  workShiftTableBody.innerHTML =
    filtered
      .map((shift) => {
        const assignmentCount =
          getShiftAssignmentCount(
            shift.id
          );

        return `
          <tr>
            <td>
              ${escapeHtml(
                getWorkplaceName(
                  shift.workplace_id
                )
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  shift.name
                )}
              </strong>
            </td>

            <td>
              <span class="shift-time-text">
                ${formatTime(
                  shift.start_time
                )}
              </span>
            </td>

            <td>
              <span class="shift-time-text">
                ${formatTime(
                  shift.end_time
                )}
              </span>
            </td>

            <td>
              <span class="shift-break-chip">
                ${Number(
                  shift.break_minutes ||
                  0
                )}분
              </span>
            </td>

            <td>
              <span class="shift-assignment-chip">
                ${assignmentCount}명
              </span>
            </td>

            <td>
              <span
                class="shift-status ${
                  shift.is_active !== false
                    ? "active"
                    : "inactive"
                }"
              >
                ${
                  shift.is_active !== false
                    ? "사용 중"
                    : "사용 중지"
                }
              </span>
            </td>

            <td>
              <div class="shift-action-group">
                <button
                  type="button"
                  class="table-action-btn"
                  data-edit-shift="${shift.id}"
                >
                  수정
                </button>

                <button
                  type="button"
                  class="table-action-btn"
                  data-toggle-shift="${shift.id}"
                >
                  ${
                    shift.is_active !== false
                      ? "중지"
                      : "사용"
                  }
                </button>

                <button
                  type="button"
                  class="table-action-btn shift-action-danger"
                  data-delete-shift="${shift.id}"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  workShiftTableBody
    .querySelectorAll(
      "[data-edit-shift]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openWorkShiftModal(
            button.dataset.editShift
          );
        }
      );
    });

  workShiftTableBody
    .querySelectorAll(
      "[data-toggle-shift]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          toggleWorkShift(
            button.dataset.toggleShift
          );
        }
      );
    });

  workShiftTableBody
    .querySelectorAll(
      "[data-delete-shift]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteWorkShift(
            button.dataset.deleteShift
          );
        }
      );
    });
}


async function loadWorkShiftData() {
  workShiftTableBody.innerHTML = `
    <tr>
      <td colspan="8">
        근무 시간대를 불러오는 중입니다.
      </td>
    </tr>
  `;

  const [
    workplaceResult,
    shiftResult,
    assignmentResult,
  ] = await Promise.all([
    supabase
      .from("workplaces")
      .select(`
        id,
        name,
        is_active
      `)
      .order("name"),

    supabase
      .from("work_shifts")
      .select("*")
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "start_time",
        {
          ascending: true,
        }
      ),

    supabase
      .from("workplace_users")
      .select(`
        id,
        user_id,
        workplace_id,
        work_shift_id
      `),
  ]);

  if (workplaceResult.error) {
    throw workplaceResult.error;
  }

  if (shiftResult.error) {
    throw shiftResult.error;
  }

  if (assignmentResult.error) {
    throw assignmentResult.error;
  }

  workplaces =
    workplaceResult.data || [];

  workShifts =
    shiftResult.data || [];

  workplaceAssignments =
    assignmentResult.data || [];

  populateWorkplaceOptions();
  updateSummary();
  renderWorkShiftTable();
}


function resetWorkShiftForm() {
  workShiftForm.reset();

  workShiftWorkplaceInput.value = "";
  workShiftBreakInput.value = "0";
  workShiftSortInput.value = "0";
  workShiftActiveInput.checked = true;

  editingShiftId = null;
}


function openWorkShiftModal(
  shiftId = null
) {
  resetWorkShiftForm();

  if (shiftId) {
    const shift =
      workShifts.find(
        (item) =>
          String(item.id) ===
          String(shiftId)
      );

    if (!shift) {
      alert(
        "근무 시간대 정보를 찾지 못했습니다."
      );

      return;
    }

    editingShiftId =
      String(shift.id);

    workShiftModalTitle.textContent =
      "근무 시간대 수정";

    workShiftWorkplaceInput.value =
      String(shift.workplace_id);

    workShiftNameInput.value =
      shift.name || "";

    workShiftStartInput.value =
      formatTime(
        shift.start_time
      );

    workShiftEndInput.value =
      formatTime(
        shift.end_time
      );

    workShiftBreakInput.value =
      Number(
        shift.break_minutes || 0
      );

    workShiftSortInput.value =
      Number(
        shift.sort_order || 0
      );

    workShiftActiveInput.checked =
      shift.is_active !== false;

    workShiftMemoInput.value =
      shift.memo || "";
  } else {
    workShiftModalTitle.textContent =
      "근무 시간대 등록";
  }

  workShiftModal.classList.add(
    "open"
  );

  setTimeout(() => {
    workShiftWorkplaceInput.focus();
  }, 0);
}


function closeWorkShiftModal() {
  workShiftModal.classList.remove(
    "open"
  );

  resetWorkShiftForm();
}


async function saveWorkShift(event) {
  event.preventDefault();

  const workplaceId =
    workShiftWorkplaceInput.value;

  const name =
    workShiftNameInput.value.trim();

  const startTime =
    workShiftStartInput.value;

  const endTime =
    workShiftEndInput.value;

  const breakMinutes =
    Number(
      workShiftBreakInput.value || 0
    );

  const sortOrder =
    Number(
      workShiftSortInput.value || 0
    );

  if (!workplaceId) {
    alert(
      "근무 지역을 선택해 주세요."
    );

    workShiftWorkplaceInput.focus();
    return;
  }

  if (!name) {
    alert(
      "시간대명을 입력해 주세요."
    );

    workShiftNameInput.focus();
    return;
  }

  if (!startTime || !endTime) {
    alert(
      "출근 시간과 퇴근 시간을 입력해 주세요."
    );

    return;
  }

  if (
    !Number.isFinite(
      breakMinutes
    ) ||
    breakMinutes < 0 ||
    breakMinutes > 720
  ) {
    alert(
      "휴게 시간은 0분에서 720분 사이로 입력해 주세요."
    );

    return;
  }

  const duplicate =
    workShifts.some(
      (shift) =>
        String(
          shift.workplace_id
        ) === String(workplaceId) &&

        String(
          shift.name || ""
        )
          .trim()
          .toLowerCase() ===
        name.toLowerCase() &&

        String(shift.id) !==
        String(editingShiftId)
    );

  if (duplicate) {
    alert(
      "같은 지역에 동일한 시간대명이 이미 있습니다."
    );

    workShiftNameInput.focus();
    return;
  }

  const payload = {
    workplace_id:
      Number(workplaceId),

    name,

    start_time:
      startTime,

    end_time:
      endTime,

    break_minutes:
      breakMinutes,

    sort_order:
      Number.isFinite(sortOrder)
        ? sortOrder
        : 0,

    is_active:
      workShiftActiveInput.checked,

    memo:
      workShiftMemoInput.value
        .trim() || null,
  };

  workShiftSaveBtn.disabled = true;
  workShiftSaveBtn.textContent =
    "저장 중...";

  try {
    let result;

    if (editingShiftId) {
      result = await supabase
        .from("work_shifts")
        .update(payload)
        .eq(
          "id",
          editingShiftId
        );
    } else {
      result = await supabase
        .from("work_shifts")
        .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    alert(
      editingShiftId
        ? "근무 시간대가 수정되었습니다."
        : "근무 시간대가 등록되었습니다."
    );

    closeWorkShiftModal();
    await loadWorkShiftData();
  } catch (error) {
    console.error(
      "근무 시간대 저장 실패:",
      error
    );

    alert(
      `근무 시간대를 저장하지 못했습니다.\n${
        error.message ||
        "Supabase 권한을 확인해 주세요."
      }`
    );
  } finally {
    workShiftSaveBtn.disabled =
      false;

    workShiftSaveBtn.textContent =
      "저장";
  }
}


async function toggleWorkShift(
  shiftId
) {
  const shift =
    workShifts.find(
      (item) =>
        String(item.id) ===
        String(shiftId)
    );

  if (!shift) {
    return;
  }

  const nextActive =
    shift.is_active === false;

  const confirmed =
    confirm(
      nextActive
        ? `"${shift.name}" 시간대를 다시 사용하시겠습니까?`
        : `"${shift.name}" 시간대 사용을 중지하시겠습니까?\n\n기존 직원 배정은 유지됩니다.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const { error } =
      await supabase
        .from("work_shifts")
        .update({
          is_active:
            nextActive,
        })
        .eq(
          "id",
          shiftId
        );

    if (error) {
      throw error;
    }

    await loadWorkShiftData();
  } catch (error) {
    console.error(
      "근무 시간대 상태 변경 실패:",
      error
    );

    alert(
      `상태를 변경하지 못했습니다.\n${error.message}`
    );
  }
}


async function deleteWorkShift(
  shiftId
) {
  const shift =
    workShifts.find(
      (item) =>
        String(item.id) ===
        String(shiftId)
    );

  if (!shift) {
    return;
  }

  const assignmentCount =
    getShiftAssignmentCount(
      shiftId
    );

  if (assignmentCount > 0) {
    alert(
      `현재 ${assignmentCount}명의 직원이 이 시간대에 배정되어 있습니다.\n삭제 대신 사용 중지하거나 직원 배정을 변경해 주세요.`
    );

    return;
  }

  const confirmed =
    confirm(
      `"${shift.name}" 시간대를 삭제하시겠습니까?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const { error } =
      await supabase
        .from("work_shifts")
        .delete()
        .eq(
          "id",
          shiftId
        );

    if (error) {
      throw error;
    }

    alert(
      "근무 시간대가 삭제되었습니다."
    );

    await loadWorkShiftData();
  } catch (error) {
    console.error(
      "근무 시간대 삭제 실패:",
      error
    );

    alert(
      `근무 시간대를 삭제하지 못했습니다.\n${error.message}`
    );
  }
}


addWorkShiftBtn.addEventListener(
  "click",
  () => {
    openWorkShiftModal();
  }
);

workShiftModalCloseBtn.addEventListener(
  "click",
  closeWorkShiftModal
);

workShiftModalCancelBtn.addEventListener(
  "click",
  closeWorkShiftModal
);

workShiftForm.addEventListener(
  "submit",
  saveWorkShift
);

workShiftModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      workShiftModal
    ) {
      closeWorkShiftModal();
    }
  }
);

shiftSearchInput.addEventListener(
  "input",
  renderWorkShiftTable
);

shiftWorkplaceFilter.addEventListener(
  "change",
  renderWorkShiftTable
);

shiftStatusFilter.addEventListener(
  "change",
  renderWorkShiftTable
);


async function initPage() {
  const admin =
    await requireAdmin();

  if (!admin) {
    return;
  }

  try {
    await loadWorkShiftData();
  } catch (error) {
    console.error(
      "근무 시간대 조회 실패:",
      error
    );

    workShiftTableBody.innerHTML = `
      <tr>
        <td
          colspan="8"
          style="
            padding:34px;
            text-align:center;
            color:#dc2626;
          "
        >
          근무 시간대를 불러오지 못했습니다.
        </td>
      </tr>
    `;

    alert(
      `근무 시간대를 불러오지 못했습니다.\n${error.message}`
    );
  }
}


initPage();