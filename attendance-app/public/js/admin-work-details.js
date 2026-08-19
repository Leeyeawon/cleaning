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

const addDepartmentBtn =
  document.getElementById(
    "addDepartmentBtn"
  );

const departmentListCount =
  document.getElementById(
    "departmentListCount"
  );

const departmentTableBody =
  document.getElementById(
    "departmentTableBody"
  );

const departmentModal =
  document.getElementById(
    "departmentModal"
  );

const departmentModalTitle =
  document.getElementById(
    "departmentModalTitle"
  );

const departmentModalCloseBtn =
  document.getElementById(
    "departmentModalCloseBtn"
  );

const departmentModalCancelBtn =
  document.getElementById(
    "departmentModalCancelBtn"
  );

const departmentForm =
  document.getElementById(
    "departmentForm"
  );

const departmentNameInput =
  document.getElementById(
    "departmentNameInput"
  );

const departmentDescriptionInput =
  document.getElementById(
    "departmentDescriptionInput"
  );

const departmentSortInput =
  document.getElementById(
    "departmentSortInput"
  );

const departmentActiveInput =
  document.getElementById(
    "departmentActiveInput"
  );

const departmentSaveBtn =
  document.getElementById(
    "departmentSaveBtn"
  );

let jobPositions = [];
let employees = [];
let editingPositionId = null;
let employeeDepartments = [];
let editingDepartmentId = null;


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
    await fetchEmployeeDepartments();
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
    await fetchEmployeeDepartments();
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
    await fetchEmployeeDepartments();
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

function getDepartmentEmployeeCount(
  departmentName
) {
  return employees.filter(
    (employee) =>
      String(
        employee.department || ""
      ).trim() ===
      String(
        departmentName || ""
      ).trim()
  ).length;
}


async function fetchEmployeeDepartments() {
  const { data, error } =
    await supabase
      .from("employee_departments")
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
      );

  if (error) {
    throw error;
  }

  employeeDepartments =
    data || [];

  renderDepartmentTable();
}


function renderDepartmentTable() {
  departmentListCount.textContent =
    `${employeeDepartments.length}개 소속`;

  if (!employeeDepartments.length) {
    departmentTableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="
            padding:34px;
            text-align:center;
            color:#737373;
          "
        >
          등록된 소속이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  departmentTableBody.innerHTML =
    employeeDepartments
      .map((department) => {
        const employeeCount =
          getDepartmentEmployeeCount(
            department.name
          );

        return `
          <tr>
            <td>
              ${Number(
                department.sort_order || 0
              )}
            </td>

            <td>
              <div class="department-name-cell">
                <strong>
                  ${escapeHtml(
                    department.name
                  )}
                </strong>
              </div>
            </td>

            <td>
              ${escapeHtml(
                department.description ||
                "-"
              )}
            </td>

            <td>
              <span class="department-employee-count">
                ${employeeCount}명
              </span>
            </td>

            <td>
              <span
                class="position-status ${
                  department.is_active !== false
                    ? "active"
                    : "inactive"
                }"
              >
                ${
                  department.is_active !== false
                    ? "사용 중"
                    : "사용 중지"
                }
              </span>
            </td>

            <td>
              <div class="department-action-group">
                <button
                  type="button"
                  class="table-action-btn"
                  data-edit-department="${department.id}"
                >
                  수정
                </button>

                <button
                  type="button"
                  class="table-action-btn"
                  data-toggle-department="${department.id}"
                >
                  ${
                    department.is_active !== false
                      ? "중지"
                      : "사용"
                  }
                </button>

                <button
                  type="button"
                  class="table-action-btn department-delete-button"
                  data-delete-department="${department.id}"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  departmentTableBody
    .querySelectorAll(
      "[data-edit-department]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openDepartmentModal(
            button.dataset
              .editDepartment
          );
        }
      );
    });

  departmentTableBody
    .querySelectorAll(
      "[data-toggle-department]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          toggleDepartment(
            button.dataset
              .toggleDepartment
          );
        }
      );
    });

  departmentTableBody
    .querySelectorAll(
      "[data-delete-department]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteDepartment(
            button.dataset
              .deleteDepartment
          );
        }
      );
    });
}


function openDepartmentModal(
  departmentId = null
) {
  departmentForm.reset();

  editingDepartmentId = null;
  departmentSortInput.value = "0";
  departmentActiveInput.checked = true;

  if (departmentId) {
    const department =
      employeeDepartments.find(
        (item) =>
          String(item.id) ===
          String(departmentId)
      );

    if (!department) {
      return;
    }

    editingDepartmentId =
      String(department.id);

    departmentModalTitle.textContent =
      "소속 수정";

    departmentNameInput.value =
      department.name || "";

    departmentDescriptionInput.value =
      department.description || "";

    departmentSortInput.value =
      Number(
        department.sort_order || 0
      );

    departmentActiveInput.checked =
      department.is_active !== false;
  } else {
    departmentModalTitle.textContent =
      "소속 추가";
  }

  departmentModal.classList.add(
    "open"
  );
}


function closeDepartmentModal() {
  departmentModal.classList.remove(
    "open"
  );

  departmentForm.reset();
  editingDepartmentId = null;
}


async function saveDepartment(
  event
) {
  event.preventDefault();

  const name =
    departmentNameInput.value
      .trim();

  if (!name) {
    alert(
      "소속명을 입력해 주세요."
    );

    return;
  }

  departmentSaveBtn.disabled = true;
  departmentSaveBtn.textContent =
    "저장 중...";

  try {
    const { error } =
      await supabase.rpc(
        "admin_save_employee_department",
        {
          p_department_id:
            editingDepartmentId
              ? Number(
                  editingDepartmentId
                )
              : null,

          p_name:
            name,

          p_description:
            departmentDescriptionInput
              .value
              .trim(),

          p_sort_order:
            Number(
              departmentSortInput
                .value || 0
            ),

          p_is_active:
            departmentActiveInput
              .checked,
        }
      );

    if (error) {
      throw error;
    }

    closeDepartmentModal();

    await Promise.all([
      loadPositionData(),
      fetchEmployeeDepartments(),
    ]);

    alert(
      editingDepartmentId
        ? "소속이 수정되었습니다."
        : "소속이 추가되었습니다."
    );
  } catch (error) {
    alert(
      `소속을 저장하지 못했습니다.\n${error.message}`
    );
  } finally {
    departmentSaveBtn.disabled =
      false;

    departmentSaveBtn.textContent =
      "저장";
  }
}


async function toggleDepartment(
  departmentId
) {
  const department =
    employeeDepartments.find(
      (item) =>
        String(item.id) ===
        String(departmentId)
    );

  if (!department) {
    return;
  }

  const { error } =
    await supabase.rpc(
      "admin_save_employee_department",
      {
        p_department_id:
          department.id,

        p_name:
          department.name,

        p_description:
          department.description || "",

        p_sort_order:
          Number(
            department.sort_order || 0
          ),

        p_is_active:
          department.is_active === false,
      }
    );

  if (error) {
    alert(
      `상태를 변경하지 못했습니다.\n${error.message}`
    );

    return;
  }

  await fetchEmployeeDepartments();
}


async function deleteDepartment(
  departmentId
) {
  const department =
    employeeDepartments.find(
      (item) =>
        String(item.id) ===
        String(departmentId)
    );

  if (!department) {
    return;
  }

  const confirmed =
    confirm(
      `"${department.name}" 소속을 삭제하시겠습니까?`
    );

  if (!confirmed) {
    return;
  }

  const { error } =
    await supabase.rpc(
      "admin_delete_employee_department",
      {
        p_department_id:
          Number(departmentId),
      }
    );

  if (error) {
    if (
      String(error.message).includes(
        "DEPARTMENT_IN_USE"
      )
    ) {
      alert(
        "사용 중인 직원이 있어 삭제할 수 없습니다. 사용 중지하거나 직원 소속을 먼저 변경해 주세요."
      );
    } else {
      alert(
        `소속을 삭제하지 못했습니다.\n${error.message}`
      );
    }

    return;
  }

  await fetchEmployeeDepartments();
}

async function initPage() {
  const admin =
    await requireAdmin();

  if (!admin) {
    return;
  }

  try {
    await loadPositionData();
    await fetchEmployeeDepartments();
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

  addDepartmentBtn?.addEventListener(
    "click",
    () => {
      openDepartmentModal();
    }
  );

  departmentModalCloseBtn
    ?.addEventListener(
      "click",
      closeDepartmentModal
    );

  departmentModalCancelBtn
    ?.addEventListener(
      "click",
      closeDepartmentModal
    );

  departmentForm?.addEventListener(
    "submit",
    saveDepartment
  );

  departmentModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        departmentModal
      ) {
        closeDepartmentModal();
      }
    }
  );
}


initPage();