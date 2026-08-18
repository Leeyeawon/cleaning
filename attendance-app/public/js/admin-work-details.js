import supabase from "./supabase.js";

import {
  requireAdmin,
} from "./adminAuth.js";


const addPositionBtn =
  document.getElementById(
    "addPositionBtn"
  );

const positionTableBody =
  document.getElementById(
    "positionTableBody"
  );

const totalPositionCount =
  document.getElementById(
    "totalPositionCount"
  );

const activePositionCount =
  document.getElementById(
    "activePositionCount"
  );

const assignedPositionCount =
  document.getElementById(
    "assignedPositionCount"
  );

const unassignedPositionCount =
  document.getElementById(
    "unassignedPositionCount"
  );

const filteredPositionCount =
  document.getElementById(
    "filteredPositionCount"
  );

const positionSearchInput =
  document.getElementById(
    "positionSearchInput"
  );

const positionStatusFilter =
  document.getElementById(
    "positionStatusFilter"
  );

const positionModal =
  document.getElementById(
    "positionModal"
  );

const positionModalTitle =
  document.getElementById(
    "positionModalTitle"
  );

const positionModalCloseBtn =
  document.getElementById(
    "positionModalCloseBtn"
  );

const positionModalCancelBtn =
  document.getElementById(
    "positionModalCancelBtn"
  );

const positionForm =
  document.getElementById(
    "positionForm"
  );

const positionNameInput =
  document.getElementById(
    "positionNameInput"
  );

const positionDescriptionInput =
  document.getElementById(
    "positionDescriptionInput"
  );

const positionSortInput =
  document.getElementById(
    "positionSortInput"
  );

const positionActiveInput =
  document.getElementById(
    "positionActiveInput"
  );

const positionSaveBtn =
  document.getElementById(
    "positionSaveBtn"
  );


let jobPositions = [];
let employees = [];
let editingPositionId = null;


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getPositionEmployeeCount(
  positionName
) {
  const normalizedName =
    String(positionName || "")
      .trim()
      .toLowerCase();

  return employees.filter(
    (employee) =>
      String(
        employee.position || ""
      )
        .trim()
        .toLowerCase() ===
      normalizedName
  ).length;
}


function updateSummary() {
  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.status === "active"
    );

  totalPositionCount.textContent =
    jobPositions.length;

  activePositionCount.textContent =
    jobPositions.filter(
      (position) =>
        position.is_active !== false
    ).length;

  assignedPositionCount.textContent =
    activeEmployees.filter(
      (employee) =>
        String(
          employee.position || ""
        ).trim()
    ).length;

  unassignedPositionCount.textContent =
    activeEmployees.filter(
      (employee) =>
        !String(
          employee.position || ""
        ).trim()
    ).length;
}


function getFilteredPositions() {
  const keyword =
    positionSearchInput.value
      .trim()
      .toLowerCase();

  const status =
    positionStatusFilter.value;

  return jobPositions.filter(
    (position) => {
      const name =
        String(
          position.name || ""
        ).toLowerCase();

      const description =
        String(
          position.description || ""
        ).toLowerCase();

      const matchesKeyword =
        !keyword ||
        name.includes(keyword) ||
        description.includes(keyword);

      const matchesStatus =
        status === "all" ||
        (
          status === "active" &&
          position.is_active !== false
        ) ||
        (
          status === "inactive" &&
          position.is_active === false
        );

      return (
        matchesKeyword &&
        matchesStatus
      );
    }
  );
}


function renderPositionTable() {
  const filtered =
    getFilteredPositions();

  filteredPositionCount.textContent =
    `${filtered.length}개 직급`;

  if (!filtered.length) {
    positionTableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="
            padding:34px;
            text-align:center;
            color:#737373;
          "
        >
          조건에 맞는 직급이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  positionTableBody.innerHTML =
    filtered
      .map((position) => {
        const employeeCount =
          getPositionEmployeeCount(
            position.name
          );

        return `
          <tr>
            <td>
              ${Number(
                position.sort_order || 0
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  position.name
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                position.description ||
                "-"
              )}
            </td>

            <td>
              <span class="position-employee-count">
                ${employeeCount}명
              </span>
            </td>

            <td>
              <span
                class="position-status ${
                  position.is_active !== false
                    ? "active"
                    : "inactive"
                }"
              >
                ${
                  position.is_active !== false
                    ? "사용 중"
                    : "사용 중지"
                }
              </span>
            </td>

            <td>
              <div class="position-action-group">
                <button
                  type="button"
                  class="table-action-btn"
                  data-edit-position="${position.id}"
                >
                  수정
                </button>

                <button
                  type="button"
                  class="table-action-btn"
                  data-toggle-position="${position.id}"
                >
                  ${
                    position.is_active !== false
                      ? "중지"
                      : "사용"
                  }
                </button>

                <button
                  type="button"
                  class="table-action-btn position-delete-button"
                  data-delete-position="${position.id}"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  positionTableBody
    .querySelectorAll(
      "[data-edit-position]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openPositionModal(
            button.dataset.editPosition
          );
        }
      );
    });

  positionTableBody
    .querySelectorAll(
      "[data-toggle-position]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          togglePosition(
            button.dataset.togglePosition
          );
        }
      );
    });

  positionTableBody
    .querySelectorAll(
      "[data-delete-position]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deletePosition(
            button.dataset.deletePosition
          );
        }
      );
    });
}


async function loadPositionData() {
  const [
    positionResult,
    employeeResult,
  ] = await Promise.all([
    supabase
      .from("job_positions")
      .select("*")
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "id",
        {
          ascending: true,
        }
      ),

    supabase
      .from("users")
      .select(`
        id,
        name,
        position,
        status
      `)
      .neq(
        "status",
        "deleted"
      ),
  ]);

  if (positionResult.error) {
    throw positionResult.error;
  }

  if (employeeResult.error) {
    throw employeeResult.error;
  }

  jobPositions =
    positionResult.data || [];

  employees =
    employeeResult.data || [];

  updateSummary();
  renderPositionTable();
}


function resetPositionForm() {
  positionForm.reset();

  positionSortInput.value = "0";
  positionActiveInput.checked = true;

  editingPositionId = null;
}


function openPositionModal(
  positionId = null
) {
  resetPositionForm();

  if (positionId) {
    const position =
      jobPositions.find(
        (item) =>
          String(item.id) ===
          String(positionId)
      );

    if (!position) {
      alert(
        "직급 정보를 찾지 못했습니다."
      );

      return;
    }

    editingPositionId =
      String(position.id);

    positionModalTitle.textContent =
      "직급 수정";

    positionNameInput.value =
      position.name || "";

    positionDescriptionInput.value =
      position.description || "";

    positionSortInput.value =
      Number(
        position.sort_order || 0
      );

    positionActiveInput.checked =
      position.is_active !== false;
  } else {
    positionModalTitle.textContent =
      "직급 추가";
  }

  positionModal.classList.add(
    "open"
  );

  setTimeout(() => {
    positionNameInput.focus();
  }, 0);
}


function closePositionModal() {
  positionModal.classList.remove(
    "open"
  );

  resetPositionForm();
}


async function savePosition(event) {
  event.preventDefault();

  const name =
    positionNameInput.value.trim();

  const description =
    positionDescriptionInput.value
      .trim() || null;

  const sortOrder =
    Number(
      positionSortInput.value || 0
    );

  if (!name) {
    alert(
      "직급명을 입력해 주세요."
    );

    positionNameInput.focus();
    return;
  }

  const duplicate =
    jobPositions.some(
      (position) =>
        String(
          position.name || ""
        )
          .trim()
          .toLowerCase() ===
        name.toLowerCase() &&

        String(position.id) !==
        String(editingPositionId)
    );

  if (duplicate) {
    alert(
      "동일한 직급명이 이미 있습니다."
    );

    return;
  }

  positionSaveBtn.disabled = true;
  positionSaveBtn.textContent =
    "저장 중...";

  try {
    if (editingPositionId) {
      const oldPosition =
        jobPositions.find(
          (position) =>
            String(position.id) ===
            String(editingPositionId)
        );

      const oldName =
        oldPosition?.name || "";

      const { error } =
        await supabase
          .from("job_positions")
          .update({
            name,
            description,

            sort_order:
              Number.isFinite(sortOrder)
                ? sortOrder
                : 0,

            is_active:
              positionActiveInput.checked,
          })
          .eq(
            "id",
            editingPositionId
          );

      if (error) {
        throw error;
      }

      /*
        직급 이름을 변경하면 기존 직원에게
        저장된 직급명도 같이 변경합니다.
      */
      if (oldName && oldName !== name) {
        const {
          error: employeeUpdateError,
        } = await supabase
          .from("users")
          .update({
            position:
              name,
          })
          .eq(
            "position",
            oldName
          );

        if (employeeUpdateError) {
          throw employeeUpdateError;
        }
      }
    } else {
      const { error } =
        await supabase
          .from("job_positions")
          .insert({
            name,
            description,

            sort_order:
              Number.isFinite(sortOrder)
                ? sortOrder
                : 0,

            is_active:
              positionActiveInput.checked,
          });

      if (error) {
        throw error;
      }
    }

    alert(
      editingPositionId
        ? "직급이 수정되었습니다."
        : "직급이 추가되었습니다."
    );

    closePositionModal();
    await loadPositionData();
  } catch (error) {
    console.error(
      "직급 저장 실패:",
      error
    );

    alert(
      `직급을 저장하지 못했습니다.\n${
        error.message ||
        "Supabase 권한을 확인해 주세요."
      }`
    );
  } finally {
    positionSaveBtn.disabled =
      false;

    positionSaveBtn.textContent =
      "저장";
  }
}


async function togglePosition(
  positionId
) {
  const position =
    jobPositions.find(
      (item) =>
        String(item.id) ===
        String(positionId)
    );

  if (!position) {
    return;
  }

  const nextActive =
    position.is_active === false;

  const confirmed =
    confirm(
      nextActive
        ? `"${position.name}" 직급을 다시 사용하시겠습니까?`
        : `"${position.name}" 직급 사용을 중지하시겠습니까?\n\n기존 직원에게 지정된 직급은 유지됩니다.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const { error } =
      await supabase
        .from("job_positions")
        .update({
          is_active:
            nextActive,
        })
        .eq(
          "id",
          positionId
        );

    if (error) {
      throw error;
    }

    await loadPositionData();
  } catch (error) {
    alert(
      `직급 상태를 변경하지 못했습니다.\n${error.message}`
    );
  }
}


async function deletePosition(
  positionId
) {
  const position =
    jobPositions.find(
      (item) =>
        String(item.id) ===
        String(positionId)
    );

  if (!position) {
    return;
  }

  const employeeCount =
    getPositionEmployeeCount(
      position.name
    );

  if (employeeCount > 0) {
    alert(
      `현재 ${employeeCount}명의 직원이 이 직급을 사용하고 있습니다.\n직원 직급을 변경한 후 삭제하거나 사용 중지해 주세요.`
    );

    return;
  }

  const confirmed =
    confirm(
      `"${position.name}" 직급을 삭제하시겠습니까?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const { error } =
      await supabase
        .from("job_positions")
        .delete()
        .eq(
          "id",
          positionId
        );

    if (error) {
      throw error;
    }

    alert(
      "직급이 삭제되었습니다."
    );

    await loadPositionData();
  } catch (error) {
    alert(
      `직급을 삭제하지 못했습니다.\n${error.message}`
    );
  }
}


addPositionBtn.addEventListener(
  "click",
  () => {
    openPositionModal();
  }
);

positionModalCloseBtn.addEventListener(
  "click",
  closePositionModal
);

positionModalCancelBtn.addEventListener(
  "click",
  closePositionModal
);

positionForm.addEventListener(
  "submit",
  savePosition
);

positionModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      positionModal
    ) {
      closePositionModal();
    }
  }
);

positionSearchInput.addEventListener(
  "input",
  renderPositionTable
);

positionStatusFilter.addEventListener(
  "change",
  renderPositionTable
);


async function initPage() {
  const admin =
    await requireAdmin();

  if (!admin) {
    return;
  }

  try {
    await loadPositionData();
  } catch (error) {
    console.error(
      "직급 조회 실패:",
      error
    );

    positionTableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="
            padding:34px;
            text-align:center;
            color:#dc2626;
          "
        >
          직급 정보를 불러오지 못했습니다.
        </td>
      </tr>
    `;

    alert(
      `직급 정보를 불러오지 못했습니다.\n${error.message}`
    );
  }
}


initPage();