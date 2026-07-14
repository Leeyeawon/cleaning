/* =========================================================
  관리자 직원 관리
  - Supabase 직원 목록
  - 소속 빠른 배정
  - 근무지 빠른 배정
  - 직원 등록
  - 상태 필터 및 비활성화
========================================================= */

import supabase from "./supabase.js";

/* =========================
  DOM
========================= */

const employeeTableBody =
  document.getElementById("employeeTableBody");

const employeeSearchInput =
  document.getElementById("employeeSearchInput");

const employeeStatusFilter =
  document.getElementById("employeeStatusFilter");

const employeeRegionFilter =
  document.getElementById("employeeRegionFilter");

const employeeTeamFilter =
  document.getElementById("employeeTeamFilter");

const unassignedOnlyCheck =
  document.getElementById("unassignedOnlyCheck");

const totalEmployeeCount =
  document.getElementById("totalEmployeeCount");

const activeEmployeeCount =
  document.getElementById("activeEmployeeCount");

const unassignedEmployeeCount =
  document.getElementById("unassignedEmployeeCount");

const inactiveEmployeeCount =
  document.getElementById("inactiveEmployeeCount");

const employeeListCount =
  document.getElementById("employeeListCount");

/* 직원 등록 모달 */

const employeeAddBtn =
  document.getElementById("employeeAddBtn");

const employeeModal =
  document.getElementById("employeeModal");

const employeeModalCloseBtn =
  document.getElementById("employeeModalCloseBtn");

const employeeCancelBtn =
  document.getElementById("employeeCancelBtn");

const employeeForm =
  document.getElementById("employeeForm");

const employeeNameInput =
  document.getElementById("employeeNameInput");

const employeePhoneInput =
  document.getElementById("employeePhoneInput");

const employeeRoleInput =
  document.getElementById("employeeRoleInput");

const employeeDepartmentInput =
  document.getElementById("employeeDepartmentInput");

const employeeStatusInput =
  document.getElementById("employeeStatusInput");

const employeeWorkplaceInput =
  document.getElementById("employeeWorkplaceInput");

const employeeMemoInput =
  document.getElementById("employeeMemoInput");

/* 빠른 배정 팝업 */

const quickAssignModal =
  document.getElementById("quickAssignModal");

const quickAssignTitle =
  document.getElementById("quickAssignTitle");

const quickAssignEmployeeName =
  document.getElementById("quickAssignEmployeeName");

const quickAssignOptionList =
  document.getElementById("quickAssignOptionList");

const quickAssignCloseBtn =
  document.getElementById("quickAssignCloseBtn");

const quickAssignCancelBtn =
  document.getElementById("quickAssignCancelBtn");

const quickAssignSaveBtn =
  document.getElementById("quickAssignSaveBtn");

/* =========================
  데이터
========================= */

let employees = [];
let workplaces = [];

/*
  현재 소속은 users.department 문자열 컬럼을 사용한다.

  추후 별도의 departments 테이블을 만들면
  이 배열 대신 Supabase에서 부서 목록을 가져오면 된다.
*/
const departments = [
  "현장팀",
  "운영팀",
  "디자인팀",
];

/*
  quickAssignType:
  department 또는 workplace
*/
let quickAssignType = null;
let quickAssignEmployeeId = null;

/* =========================
  상태
========================= */

const STATUS_LABEL = {
  active: "활성",
  pending: "대기",
  inactive: "비활성",
  resigned: "퇴사",
};

function normalizeStatus(status) {
  if (!status) return "active";

  if (
    status === "활성" ||
    status === "active"
  ) {
    return "active";
  }

  if (
    status === "대기" ||
    status === "pending"
  ) {
    return "pending";
  }

  if (
    status === "비활성" ||
    status === "inactive"
  ) {
    return "inactive";
  }

  if (
    status === "퇴사" ||
    status === "resigned"
  ) {
    return "resigned";
  }

  return status;
}

function getStatusLabel(status) {
  return (
    STATUS_LABEL[normalizeStatus(status)] ||
    status ||
    "활성"
  );
}

function getStatusClass(status) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "active") {
    return "normal";
  }

  if (normalized === "pending") {
    return "late";
  }

  if (normalized === "inactive") {
    return "location";
  }

  return "absent";
}

/* =========================
  공통
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPhone(phone) {
  if (!phone) {
    return "-";
  }

  const onlyNumber = String(phone).replace(
    /[^0-9]/g,
    ""
  );

  if (onlyNumber.length === 11) {
    return onlyNumber.replace(
      /(\d{3})(\d{4})(\d{4})/,
      "$1-$2-$3"
    );
  }

  return phone;
}

function getEmployeeWorkplaceIds(employee) {
  return Array.isArray(employee?.workplaceIds)
    ? employee.workplaceIds
    : [];
}

function getEmployeeWorkplaceNames(employee) {
  return Array.isArray(employee?.workplaceNames)
    ? employee.workplaceNames
    : [];
}

function getEmployeeWorkplaceText(employee) {
  const names =
    getEmployeeWorkplaceNames(employee);

  if (!names.length) {
    return "근무지 미배정";
  }

  return names.join(", ");
}

function isWorkplaceUnassigned(employee) {
  return (
    getEmployeeWorkplaceIds(employee).length === 0
  );
}

/* =========================
  Supabase 조회
========================= */

async function fetchWorkplaces() {
  const { data, error } = await supabase
    .from("workplaces")
    .select("id, name")
    .order("name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "근무지역 조회 실패:",
      error
    );

    workplaces = [];
    return;
  }

  workplaces = data || [];
}

async function fetchEmployees() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_get_employees_v2"
  );

  if (error) {
    console.error(
      "관리자 직원 목록 조회 실패:",
      error
    );

    employees = [];

    if (employeeTableBody) {
      employeeTableBody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="empty-table"
          >
            직원 정보를 불러오지 못했습니다.
            <br />
            ${escapeHtml(
              error.message ||
              "Supabase 오류"
            )}
          </td>
        </tr>
      `;
    }

    return;
  }

  const employeeData =
    Array.isArray(data)
      ? data
      : [];

  employees = employeeData.map(
    (employee) => ({
      ...employee,

      status:
        employee.status ||
        "active",

      app_role:
        employee.app_role ||
        "employee",

      app_approval_status:
        employee
          .app_approval_status ||
        "not_requested",

      workplaceIds:
        Array.isArray(
          employee.workplaceIds
        )
          ? employee.workplaceIds.map(
              String
            )
          : [],

      workplaceNames:
        Array.isArray(
          employee.workplaceNames
        )
          ? employee.workplaceNames
          : [],
    })
  );
}

/* =========================
  필터 옵션
========================= */

function renderWorkplaceOptions() {
  if (employeeRegionFilter) {
    const currentValue =
      employeeRegionFilter.value || "all";

    employeeRegionFilter.innerHTML = `
      <option value="all">전체 지역</option>
      <option value="unassigned">미배정</option>

      ${workplaces
        .map(
          (workplace) => `
            <option value="${escapeHtml(
              workplace.id
            )}">
              ${escapeHtml(workplace.name)}
            </option>
          `
        )
        .join("")}
    `;

    const exists = [
      ...employeeRegionFilter.options,
    ].some(
      (option) =>
        option.value === currentValue
    );

    employeeRegionFilter.value = exists
      ? currentValue
      : "all";
  }

  if (employeeWorkplaceInput) {
    employeeWorkplaceInput.innerHTML = `
      <option value="">미배정</option>

      ${workplaces
        .map(
          (workplace) => `
            <option value="${escapeHtml(
              workplace.id
            )}">
              ${escapeHtml(workplace.name)}
            </option>
          `
        )
        .join("")}
    `;
  }
}

function renderDepartmentOptions() {
  if (employeeTeamFilter) {
    const currentValue =
      employeeTeamFilter.value || "all";

    employeeTeamFilter.innerHTML = `
      <option value="all">전체 소속</option>
      <option value="unassigned">미배정</option>

      ${departments
        .map(
          (department) => `
            <option value="${escapeHtml(
              department
            )}">
              ${escapeHtml(department)}
            </option>
          `
        )
        .join("")}
    `;

    employeeTeamFilter.value =
      currentValue;
  }

  if (employeeDepartmentInput) {
    employeeDepartmentInput.innerHTML = `
      <option value="">미배정</option>

      ${departments
        .map(
          (department) => `
            <option value="${escapeHtml(
              department
            )}">
              ${escapeHtml(department)}
            </option>
          `
        )
        .join("")}
    `;
  }
}

/* 통계 */

function updateSummary() {
  const total = employees.length;

  const active = employees.filter(
    (employee) =>
      normalizeStatus(employee.status) ===
      "active"
  ).length;

  /*
    소속 또는 근무지 중 하나라도 없으면
    미배정 직원으로 계산
  */
  const unassigned = employees.filter(
    (employee) =>
      !employee.department ||
      isWorkplaceUnassigned(employee)
  ).length;

  const inactive = employees.filter(
    (employee) =>
      normalizeStatus(employee.status) ===
      "inactive"
  ).length;

  if (totalEmployeeCount) {
    totalEmployeeCount.textContent = total;
  }

  if (activeEmployeeCount) {
    activeEmployeeCount.textContent = active;
  }

  if (unassignedEmployeeCount) {
    unassignedEmployeeCount.textContent =
      unassigned;
  }

  if (inactiveEmployeeCount) {
    inactiveEmployeeCount.textContent =
      inactive;
  }

  const headerUnassignedCount =
  document.getElementById(
    "headerUnassignedCount"
  );

  if (headerUnassignedCount) {
    headerUnassignedCount.textContent =
      `${unassigned}명`;
  }
}

/* =========================
  필터
========================= */

function filterEmployees() {
  const keyword =
    employeeSearchInput?.value
      .trim()
      .toLowerCase() || "";

  const selectedStatus =
    employeeStatusFilter?.value ||
    "all";

  const selectedRegion =
    employeeRegionFilter?.value ||
    "all";

  const selectedTeam =
    employeeTeamFilter?.value ||
    "all";

  const unassignedOnly =
    unassignedOnlyCheck?.checked ||
    false;

  return employees.filter(
    (employee) => {
      const employeeStatus =
        normalizeStatus(
          employee.status ||
          "active"
        );

      const workplaceIds =
        getEmployeeWorkplaceIds(
          employee
        );

      const department =
        employee.department || "";

      const name =
        String(
          employee.name || ""
        ).toLowerCase();

      const phone =
        String(
          employee.phone || ""
        ).toLowerCase();

      const keywordMatched =
        !keyword ||
        name.includes(keyword) ||
        phone.includes(keyword);

      const statusMatched =
        selectedStatus === "all" ||
        employeeStatus ===
          selectedStatus;

      const regionMatched =
        selectedRegion === "all" ||
        (
          selectedRegion ===
            "unassigned" &&
          workplaceIds.length === 0
        ) ||
        workplaceIds.includes(
          String(selectedRegion)
        );

      const departmentMatched =
        selectedTeam === "all" ||
        (
          selectedTeam ===
            "unassigned" &&
          !department
        ) ||
        department ===
          selectedTeam;

      const unassignedMatched =
        !unassignedOnly ||
        !department ||
        workplaceIds.length === 0;

      return (
        keywordMatched &&
        statusMatched &&
        regionMatched &&
        departmentMatched &&
        unassignedMatched
      );
    }
  );
}

/* =========================
  직원 목록
========================= */

function renderEmployeeTable() {
  if (!employeeTableBody) {
    return;
  }

  const filteredEmployees =
    filterEmployees();

  if (employeeListCount) {
    employeeListCount.textContent =
      `${filteredEmployees.length}명`;
  }

  if (!filteredEmployees.length) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          조회된 직원이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  employeeTableBody.innerHTML =
    filteredEmployees
      .map((employee) => {
        const employeeName =
          employee.name || "이름 없음";

        const department =
          employee.department ||
          "소속 미배정";

        const workplaceText =
          getEmployeeWorkplaceText(employee);

        const statusLabel =
          getStatusLabel(employee.status);

        const statusClass =
          getStatusClass(employee.status);

        const departmentUnassigned =
          !employee.department;

        const workplaceUnassigned =
          isWorkplaceUnassigned(employee);

        return `
          <tr>
            <td>
              <div class="employee-name-cell">
                <span class="employee-avatar">
                  ${escapeHtml(
                    employeeName.slice(0, 1)
                  )}
                </span>

                <div class="employee-name-text">
                  <strong>
                    ${escapeHtml(employeeName)}
                  </strong>

                  <span>
                    ${
                      employee.created_at
                        ? "등록 직원"
                        : "직원"
                    }
                  </span>
                </div>
              </div>
            </td>

            <td>
              ${escapeHtml(
                formatPhone(employee.phone)
              )}
            </td>

            <td>
              <span class="employee-status ${
                employee.app_role === "team_lead"
                  ? "late"
                  : "normal"
              }">
                ${
                  employee.app_role === "team_lead"
                    ? "팀장"
                    : "일반 직원"
                }
              </span>
            </td>

            <td>
              <button
                type="button"
                class="employee-assignment-button ${
                  !employee.department ? "is-unassigned" : ""
                }"
                data-assignment-type="department"
                data-employee-id="${escapeHtml(employee.id)}"
              >
                <span class="assignment-indicator"></span>

                <span class="assignment-value">
                  ${escapeHtml(
                    employee.department || "소속 미배정"
                  )}
                </span>

                <span class="assignment-arrow">›</span>
              </button>
            </td>

            <td>
              <button
                type="button"
                class="employee-assignment-button ${
                  workplaceUnassigned ? "is-unassigned" : ""
                }"
                data-assignment-type="workplace"
                data-employee-id="${escapeHtml(employee.id)}"
              >
                <span class="assignment-indicator"></span>

                <span class="assignment-value">
                  ${escapeHtml(workplaceText)}
                </span>

                <span class="assignment-arrow">›</span>
              </button>
            </td>

            <td>
              <span class="employee-status ${statusClass}">
                ${escapeHtml(statusLabel)}
              </span>
            </td>

            <td>
              <div class="employee-action-group">
                <a
                  class="employee-detail-link"
                  href="admin-employee-detail.html?id=${encodeURIComponent(
                    employee.id
                  )}"
                >
                  상세
                </a>

                ${
                  normalizeStatus(
                    employee.status
                  ) !== "inactive"
                    ? `
                      <button
                        class="employee-disable-btn"
                        type="button"
                        data-disable-id="${escapeHtml(
                          employee.id
                        )}"
                      >
                        비활성화
                      </button>
                    `
                    : ""
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  bindTableEvents();
}


/* 테이블 버튼 이벤트 */
function bindTableEvents() {
  employeeTableBody
    ?.querySelectorAll(
      "[data-assignment-type]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const employeeId =
            button.dataset.employeeId;

          const assignmentType =
            button.dataset.assignmentType;

          openQuickAssignModal(
            employeeId,
            assignmentType
          );
        }
      );
    });

  employeeTableBody
    ?.querySelectorAll(
      "[data-disable-id]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          disableEmployee(
            button.dataset.disableId
          );
        }
      );
    });
}

/*  빠른 배정 팝업 */

function openQuickAssignModal(
  employeeId,
  assignType
) {
  const employee = employees.find(
    (item) =>
      String(item.id) ===
      String(employeeId)
  );

  if (
    !employee ||
    !quickAssignModal
  ) {
    return;
  }

  quickAssignEmployeeId =
    employee.id;

  quickAssignType =
    assignType;

  quickAssignEmployeeName.textContent =
    `${employee.name || "직원"}님의 ${
      assignType === "department"
        ? "소속"
        : "근무지"
    }을 선택해 주세요.`;

  if (assignType === "department") {
    quickAssignTitle.textContent =
      "소속 배정";

    renderDepartmentAssignOptions(
      employee
    );
  } else {
    quickAssignTitle.textContent =
      "근무지 배정";

    renderWorkplaceAssignOptions(
      employee
    );
  }

  quickAssignModal.classList.add("open");

  quickAssignModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}

function renderDepartmentAssignOptions(
  employee
) {
  const currentDepartment =
    employee.department || "";

  quickAssignOptionList.innerHTML = `
    <div class="quick-assign-option is-unassigned">
      <input
        id="assignDepartmentUnassigned"
        type="radio"
        name="quickAssignOption"
        value=""
        ${
          !currentDepartment
            ? "checked"
            : ""
        }
      />

      <label for="assignDepartmentUnassigned">
        소속 미배정
      </label>
    </div>

    ${departments
      .map(
        (department, index) => `
          <div class="quick-assign-option">
            <input
              id="assignDepartment${index}"
              type="radio"
              name="quickAssignOption"
              value="${escapeHtml(
                department
              )}"
              ${
                currentDepartment ===
                department
                  ? "checked"
                  : ""
              }
            />

            <label for="assignDepartment${index}">
              ${escapeHtml(department)}
            </label>
          </div>
        `
      )
      .join("")}
  `;
}

function renderWorkplaceAssignOptions(
  employee
) {
  const currentWorkplaceIds =
    getEmployeeWorkplaceIds(employee);

  if (!workplaces.length) {
    quickAssignOptionList.innerHTML = `
      <p class="quick-assign-empty">
        등록된 근무지가 없습니다.
      </p>
    `;

    return;
  }

  quickAssignOptionList.innerHTML = `
    <p class="quick-assign-guide">
      여러 근무지를 동시에 선택할 수 있습니다.
      모두 해제하면 미배정 상태가 됩니다.
    </p>

    ${workplaces
      .map(
        (workplace, index) => {
          const workplaceId =
            String(workplace.id);

          const isChecked =
            currentWorkplaceIds.includes(
              workplaceId
            );

          return `
            <div class="quick-assign-option">
              <input
                id="assignWorkplace${index}"
                type="checkbox"
                name="quickAssignWorkplace"
                value="${escapeHtml(
                  workplaceId
                )}"
                ${isChecked ? "checked" : ""}
              />

              <label for="assignWorkplace${index}">
                ${escapeHtml(workplace.name)}
              </label>
            </div>
          `;
        }
      )
      .join("")}
  `;
}

function closeQuickAssignModal() {
  if (!quickAssignModal) {
    return;
  }

  quickAssignModal.classList.remove(
    "open"
  );

  quickAssignModal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";

  quickAssignType = null;
  quickAssignEmployeeId = null;

  if (quickAssignOptionList) {
    quickAssignOptionList.innerHTML = "";
  }
}


/* 배정 저장 */

async function saveQuickAssignmentSafely() {
  if (
    !quickAssignEmployeeId ||
    !quickAssignType
  ) {
    return;
  }

  const employee = employees.find(
    (item) =>
      String(item.id) ===
      String(quickAssignEmployeeId)
  );

  if (!employee) {
    alert("직원 정보를 찾지 못했습니다.");
    return;
  }

  quickAssignSaveBtn.disabled = true;
  quickAssignSaveBtn.textContent =
    "저장 중...";

  try {
    if (quickAssignType === "department") {
      const selectedOption =
        quickAssignOptionList.querySelector(
          'input[name="quickAssignOption"]:checked'
        );

      if (!selectedOption) {
        alert("배정할 소속을 선택해 주세요.");
        return;
      }

      const department =
        selectedOption.value || null;

      const { error } = await supabase
        .from("users")
        .update({
          department,
        })
        .eq("id", employee.id);

      if (error) {
        throw error;
      }

      employee.department = department;
    } else {
      const selectedWorkplaces = [
        ...quickAssignOptionList.querySelectorAll(
          'input[name="quickAssignWorkplace"]:checked'
        ),
      ];

      const workplaceIds =
        selectedWorkplaces.map(
          (input) => input.value
        );

      const { error } = await supabase.rpc(
        "admin_set_user_workplaces",
        {
          p_user_id: employee.id,
          p_workplace_ids: workplaceIds,
        }
      );

      if (error) {
        throw error;
      }

      employee.workplaceIds =
        workplaceIds.map(String);

      employee.workplaceNames =
        workplaces
          .filter((workplace) =>
            employee.workplaceIds.includes(
              String(workplace.id)
            )
          )
          .map((workplace) =>
            workplace.name
          );
    }

    closeQuickAssignModal();

    updateSummary();
    renderEmployeeTable();

    alert(
      `${employee.name || "직원"}님의 ${
        quickAssignType === "department"
          ? "소속"
          : "근무지"
      } 배정이 완료되었습니다.`
    );
  } catch (error) {
    console.error(
      "직원 배정 저장 실패:",
      error
    );

    alert(
      `배정 저장에 실패했습니다.\n${
        error.message ||
        "Supabase 권한을 확인해 주세요."
      }`
    );
  } finally {
    quickAssignSaveBtn.disabled = false;
    quickAssignSaveBtn.textContent =
      "배정 저장";
  }
}

/* =========================
  직원 등록 모달
========================= */

function openEmployeeModal() {
  if (!employeeModal) {
    return;
  }

  employeeForm?.reset();

  if (employeeStatusInput) {
    employeeStatusInput.value =
      "active";
  }

  employeeModal.classList.add("open");

  document.body.style.overflow =
    "hidden";
}

function closeEmployeeModal() {
  if (!employeeModal) {
    return;
  }

  employeeModal.classList.remove("open");

  document.body.style.overflow = "";
}

/* =========================
  직원 등록
========================= */

async function createEmployee(event) {
  event.preventDefault();

  const name =
    employeeNameInput.value.trim();

  const phone =
    employeePhoneInput.value.trim();

  if (!name || !phone) {
    alert(
      "직원명과 연락처는 필수입니다."
    );

    return;
  }

  const submitButton =
    employeeForm.querySelector(
      'button[type="submit"]'
    );

  const selectedInitialWorkplaceId =
    employeeWorkplaceInput.value ||
    null;

  const newEmployee = {
    name,
    phone,

    app_role:
      employeeRoleInput?.value ||
      "employee",

    app_approval_status:
      "not_requested",

    department:
      employeeDepartmentInput.value ||
      null,

    status:
      employeeStatusInput.value,

    memo:
      employeeMemoInput.value.trim() ||
      null,
  };

  submitButton.disabled = true;
  submitButton.textContent =
    "저장 중...";

  try {
    const {
      data: createdEmployee,
      error: createError,
    } = await supabase
      .from("users")
      .insert(newEmployee)
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    if (
      selectedInitialWorkplaceId
    ) {
      const {
        error: assignmentError,
      } = await supabase.rpc(
        "admin_set_user_workplaces",
        {
          p_user_id:
            createdEmployee.id,

          p_workplace_ids: [
            selectedInitialWorkplaceId,
          ],
        }
      );

      if (assignmentError) {
        throw assignmentError;
      }
    }

    alert(
      "직원이 등록되었습니다."
    );

    closeEmployeeModal();

    await fetchEmployees();

    updateSummary();
    renderEmployeeTable();
  } catch (error) {
    console.error(
      "직원 등록 실패:",
      error
    );

    alert(
      `직원 등록에 실패했습니다.\n${
        error.message ||
        "Supabase users 컬럼과 권한을 확인해 주세요."
      }`
    );
  } finally {
    submitButton.disabled =
      false;

    submitButton.textContent =
      "저장";
  }
}

/* =========================
  직원 비활성화
========================= */

async function disableEmployee(
  employeeId
) {
  const employee = employees.find(
    (item) =>
      String(item.id) ===
      String(employeeId)
  );

  const confirmed = confirm(
    `${
      employee?.name || "이 직원"
    }을 비활성화하시겠습니까?`
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({
      status: "inactive",
    })
    .eq("id", employeeId);

  if (error) {
    console.error(
      "직원 비활성화 실패:",
      error
    );

    alert(
      "직원 상태 변경에 실패했습니다."
    );

    return;
  }

  if (employee) {
    employee.status = "inactive";
  }

  updateSummary();
  renderEmployeeTable();
}

/* =========================
  필터 렌더링
========================= */

function refreshEmployeeList() {
  renderEmployeeTable();
}

/* =========================
  이벤트
========================= */

function bindEvents() {
  employeeAddBtn?.addEventListener(
    "click",
    openEmployeeModal
  );

  employeeModalCloseBtn?.addEventListener(
    "click",
    closeEmployeeModal
  );

  employeeCancelBtn?.addEventListener(
    "click",
    closeEmployeeModal
  );

  employeeForm?.addEventListener(
    "submit",
    createEmployee
  );

  employeeModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target === employeeModal
      ) {
        closeEmployeeModal();
      }
    }
  );

  quickAssignCloseBtn?.addEventListener(
    "click",
    closeQuickAssignModal
  );

  quickAssignCancelBtn?.addEventListener(
    "click",
    closeQuickAssignModal
  );

  quickAssignSaveBtn?.addEventListener(
    "click",
    saveQuickAssignmentSafely
  );

  quickAssignModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target === quickAssignModal
      ) {
        closeQuickAssignModal();
      }
    }
  );

  employeeSearchInput?.addEventListener(
    "input",
    refreshEmployeeList
  );

  employeeStatusFilter?.addEventListener(
    "change",
    refreshEmployeeList
  );

  employeeRegionFilter?.addEventListener(
    "change",
    refreshEmployeeList
  );

  employeeTeamFilter?.addEventListener(
    "change",
    refreshEmployeeList
  );

  unassignedOnlyCheck?.addEventListener(
    "change",
    refreshEmployeeList
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (
        quickAssignModal?.classList.contains(
          "open"
        )
      ) {
        closeQuickAssignModal();
        return;
      }

      if (
        employeeModal?.classList.contains(
          "open"
        )
      ) {
        closeEmployeeModal();
      }
    }
  );
}

/* =========================
  초기 실행
========================= */

async function initEmployeesPage() {
  bindEvents();

  if (employeeTableBody) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          직원 정보를 불러오는 중입니다.
        </td>
      </tr>
    `;
  }

  await Promise.all([
    fetchWorkplaces(),
    fetchEmployees(),
  ]);

  renderWorkplaceOptions();
  renderDepartmentOptions();
  updateSummary();
  renderEmployeeTable();
}

initEmployeesPage();
