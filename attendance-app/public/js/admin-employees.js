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

const employeeShiftFilter =
  document.getElementById(
    "employeeShiftFilter"
  );

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

const employeePositionInput =
  document.getElementById(
    "employeePositionInput"
  );

const employeeRoleInput =
  document.getElementById(
    "employeeRoleInput"
  );

const employeeShiftInput =
  document.getElementById(
    "employeeShiftInput"
  );

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

const employeePositionFilter =
  document.getElementById(
    "employeePositionFilter"
  );

const employeeDepartmentFilter =
  document.getElementById(
    "employeeDepartmentFilter"
  );

const employeeDepartmentInput =
  document.getElementById(
    "employeeDepartmentInput"
  );

/* =========================
  데이터
========================= */

let employees = [];
let workplaces = [];
let workShifts = [];
let workplaceAssignments = [];
let jobPositions = [];

let quickAssignType = null;
let quickAssignEmployeeId = null;
let employeeDepartments = [];
/* =========================
  상태
========================= */

const STATUS_LABEL = {
  active: "활성",
  pending: "대기",
  inactive: "비활성",
  resigned: "퇴사",
};

async function fetchEmployeeDepartments() {
  const { data, error } =
    await supabase
      .from("employee_departments")
      .select(`
        id,
        name,
        is_active,
        sort_order
      `)
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
}
function renderEmployeePositionFilter() {
  employeePositionFilter.innerHTML = `
    <option value="all">
      전체 직급
    </option>

    <option value="unassigned">
      직급 미지정
    </option>

    ${jobPositions
      .map(
        (position) => `
          <option value="${escapeHtml(
            position.name
          )}">
            ${escapeHtml(
              position.name
            )}
          </option>
        `
      )
      .join("")}
  `;
}


function renderEmployeeDepartmentOptions() {
  const options =
    employeeDepartments
      .filter(
        (department) =>
          department.is_active !== false
      )
      .map(
        (department) => `
          <option value="${escapeHtml(
            department.name
          )}">
            ${escapeHtml(
              department.name
            )}
          </option>
        `
      )
      .join("");

  employeeDepartmentFilter.innerHTML = `
    <option value="all">
      전체 소속
    </option>

    <option value="unassigned">
      소속 미지정
    </option>

    ${options}
  `;

  employeeDepartmentInput.innerHTML = `
    <option value="">
      소속 미지정
    </option>

    ${options}
  `;
}

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

function getEmployeeWorkplaceIds(
  employee
) {
  return Array.isArray(
    employee?.workplaceIds
  )
    ? employee.workplaceIds
        .map(String)
    : [];
}

function getEmployeeWorkplaceNames(
  employee
) {
  return Array.isArray(
    employee?.workplaceNames
  )
    ? employee.workplaceNames
    : [];
}

function getEmployeeWorkplaceText(
  employee
) {
  const names =
    getEmployeeWorkplaceNames(
      employee
    );

  if (!names.length) {
    return "근무지 미배정";
  }

  return names.join(", ");
}

function isWorkplaceUnassigned(
  employee
) {
  return (
    getEmployeeWorkplaceIds(
      employee
    ).length === 0
  );
}

function getEmployeeShiftIds(
  employee
) {
  return Array.isArray(
    employee?.workShiftIds
  )
    ? employee.workShiftIds.map(
        String
      )
    : [];
}


function getEmployeeShiftNames(
  employee
) {
  return Array.isArray(
    employee?.workShiftNames
  )
    ? employee.workShiftNames
    : [];
}


function getEmployeeShiftText(
  employee
) {
  const names =
    getEmployeeShiftNames(
      employee
    );

  if (!names.length) {
    return "시간대 미배정";
  }

  return names.join(", ");
}


function isWorkShiftUnassigned(
  employee
) {
  return (
    getEmployeeShiftIds(
      employee
    ).length === 0
  );
}


function hydrateEmployeeWorkData() {
  if (!Array.isArray(employees)) {
    employees = [];
  }

  if (
    !Array.isArray(
      workplaceAssignments
    )
  ) {
    workplaceAssignments = [];
  }

  if (!Array.isArray(workShifts)) {
    workShifts = [];
  }

  employees = employees.map(
    (employee) => {
      const assignments =
        workplaceAssignments.filter(
          (assignment) =>
            String(
              assignment.user_id
            ) ===
            String(employee.id)
        );

      const shiftIds =
        assignments
          .map(
            (assignment) =>
              assignment.work_shift_id
          )
          .filter(
            (shiftId) =>
              shiftId != null
          )
          .map(String);

      const shiftNames =
        shiftIds
          .map((shiftId) => {
            const shift =
              workShifts.find(
                (item) =>
                  String(item.id) ===
                  shiftId
              );

            if (!shift) {
              return null;
            }

            const workplace =
              workplaces.find(
                (item) =>
                  String(item.id) ===
                  String(
                    shift.workplace_id
                  )
              );

            const workplaceName =
              workplace?.name ||
              "지역";

            return `${workplaceName} · ${shift.name}`;
          })
          .filter(Boolean);

      return {
        ...employee,

        workAssignments:
          assignments,

        workShiftIds:
          shiftIds,

        workShiftNames:
          shiftNames,
      };
    }
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

async function fetchWorkShifts() {
  const { data, error } =
    await supabase
      .from("work_shifts")
      .select(`
        id,
        workplace_id,
        name,
        start_time,
        end_time,
        is_active,
        sort_order
      `)
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
      );

  if (error) {
    console.error(
      "근무 시간대 조회 실패:",
      error
    );

    workShifts = [];
    return;
  }

  workShifts = data || [];
}


async function fetchWorkplaceAssignments() {
  const { data, error } =
    await supabase
      .from("workplace_users")
      .select(`
        id,
        user_id,
        workplace_id,
        work_shift_id
      `);

  if (error) {
    console.error(
      "직원 근무 배정 조회 실패:",
      error
    );

    workplaceAssignments = [];
    return;
  }

  workplaceAssignments =
    data || [];
}


async function fetchJobPositions() {
  const { data, error } =
    await supabase
      .from("job_positions")
      .select(`
        id,
        name,
        sort_order,
        is_active
      `)
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
    console.error(
      "직급 조회 실패:",
      error
    );

    jobPositions = [];
    return;
  }

  jobPositions = data || [];
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
            colspan="8"
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
          employee.workplaceIds ||
          employee.workplace_ids
        )
          ? (
              employee.workplaceIds ||
              employee.workplace_ids
            ).map(String)
          : [],

      workplaceNames:
        Array.isArray(
          employee.workplaceNames ||
          employee.workplace_names
        )
          ? (
              employee.workplaceNames ||
              employee.workplace_names
            )
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

function renderPositionOptions() {
  if (!employeePositionInput) {
    return;
  }

  employeePositionInput.innerHTML = `
    <option value="">
      직급 미지정
    </option>

    ${jobPositions
      .filter(
        (position) =>
          position.is_active !== false
      )
      .map(
        (position) => `
          <option value="${escapeHtml(
            position.name
          )}">
            ${escapeHtml(
              position.name
            )}
          </option>
        `
      )
      .join("")}
  `;
}


function renderShiftFilterOptions() {
  if (!employeeShiftFilter) {
    return;
  }

  const currentValue =
    employeeShiftFilter.value ||
    "all";

  employeeShiftFilter.innerHTML = `
    <option value="all">
      전체 근무 시간대
    </option>

    <option value="unassigned">
      시간대 미배정
    </option>

    ${workShifts
      .map((shift) => {
        const workplace =
          workplaces.find(
            (item) =>
              String(item.id) ===
              String(
                shift.workplace_id
              )
          );

        return `
          <option value="${shift.id}">
            ${escapeHtml(
              workplace?.name ||
              "지역"
            )}
            ·
            ${escapeHtml(
              shift.name
            )}
          </option>
        `;
      })
      .join("")}
  `;

  const optionExists = [
    ...employeeShiftFilter.options,
  ].some(
    (option) =>
      option.value ===
      currentValue
  );

  employeeShiftFilter.value =
    optionExists
      ? currentValue
      : "all";
}


function renderEmployeeShiftOptions() {
  if (!employeeShiftInput) {
    return;
  }

  const workplaceId =
    employeeWorkplaceInput?.value;

  if (!workplaceId) {
    employeeShiftInput.disabled =
      true;

    employeeShiftInput.innerHTML = `
      <option value="">
        지역을 먼저 선택해 주세요
      </option>
    `;

    return;
  }

  const availableShifts =
    workShifts.filter(
      (shift) =>
        String(
          shift.workplace_id
        ) ===
          String(workplaceId) &&
        shift.is_active !== false
    );

  employeeShiftInput.disabled =
    false;

  if (!availableShifts.length) {
    employeeShiftInput.innerHTML = `
      <option value="">
        등록된 시간대가 없습니다
      </option>
    `;

    return;
  }

  employeeShiftInput.innerHTML = `
    <option value="">
      시간대 미배정
    </option>

    ${availableShifts
      .map(
        (shift) => `
          <option value="${shift.id}">
            ${escapeHtml(
              shift.name
            )}
            (${String(
              shift.start_time
            ).slice(0, 5)}
            ~
            ${String(
              shift.end_time
            ).slice(0, 5)})
          </option>
        `
      )
      .join("")}
  `;
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
      isWorkplaceUnassigned(
        employee
      ) ||
      isWorkShiftUnassigned(
        employee
      )
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

  const selectedShift =
    employeeShiftFilter?.value ||
    "all";

  const selectedPosition =
    employeePositionFilter?.value ||
    "all";

  const selectedDepartment =
    employeeDepartmentFilter?.value ||
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

      const shiftIds =
        getEmployeeShiftIds(
          employee
        );

      const name =
        String(
          employee.name || ""
        ).toLowerCase();

      const phone =
        String(
          employee.phone || ""
        ).toLowerCase();

      const position =
        String(
          employee.position || ""
        ).toLowerCase();

      const keywordMatched =
        !keyword ||
        name.includes(keyword) ||
        phone.includes(keyword) ||
        position.includes(keyword);

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

      const shiftMatched =
        selectedShift === "all" ||
        (
          selectedShift ===
            "unassigned" &&
          shiftIds.length === 0
        ) ||
        shiftIds.includes(
          String(selectedShift)
        );

        const employeePosition =
          String(
            employee.position || ""
          );

        const employeeDepartment =
          String(
            employee.department || ""
          );

        const positionMatched =
          selectedPosition === "all" ||
          (
            selectedPosition ===
              "unassigned" &&
            !employeePosition
          ) ||
          employeePosition ===
            selectedPosition;

        const departmentMatched =
          selectedDepartment === "all" ||
          (
            selectedDepartment ===
              "unassigned" &&
            !employeeDepartment
          ) ||
          employeeDepartment ===
            selectedDepartment;

      const unassignedMatched =
        !unassignedOnly ||
        workplaceIds.length === 0 ||
        shiftIds.length === 0;

      return (
        keywordMatched &&
        statusMatched &&
        positionMatched &&
        departmentMatched &&
        regionMatched &&
        shiftMatched &&
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
        <td
          colspan="8"
          class="empty-table"
        >
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
          employee.name ||
          "이름 없음";

        const positionText =
          employee.position ||
          "직급 미지정";

        const departmentText =
          employee.department ||
          "소속 미지정";

        const shiftText =
          getEmployeeShiftText(
            employee
          );

        const shiftUnassigned =
          isWorkShiftUnassigned(
            employee
          );

        const workplaceText =
          getEmployeeWorkplaceText(
            employee
          );

        const workplaceUnassigned =
          isWorkplaceUnassigned(
            employee
          );

        const statusLabel =
          getStatusLabel(
            employee.status
          );

        const statusClass =
          getStatusClass(
            employee.status
          );

        return `
          <tr>
            <!-- 직원명 -->
            <td>
              <div class="employee-name-cell">
                <span class="employee-avatar">
                  ${escapeHtml(
                    employeeName.slice(
                      0,
                      1
                    )
                  )}
                </span>

                <div class="employee-name-text">
                  <strong>
                    ${escapeHtml(
                      employeeName
                    )}
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

            <!-- 연락처 -->
            <td>
              ${escapeHtml(
                formatPhone(
                  employee.phone
                )
              )}
            </td>

            <!-- 직급 -->
            <td>
              <div class="employee-position-cell">
                <strong>
                  ${escapeHtml(
                    positionText
                  )}
                </strong>

                ${
                  employee.app_role ===
                  "team_lead"
                    ? `
                      <small>
                        팀장 권한
                      </small>
                    `
                    : ""
                }
              </div>
            </td>

            <!-- 소속 -->
            <td>
              <div
                class="employee-information-chip ${
                  !employee.department
                    ? "is-unassigned"
                    : ""
                }"
              >
                ${escapeHtml(
                  departmentText
                )}
              </div>
            </td>

            <!-- 근무 시간대 -->
            <td>
              <div
                class="employee-shift-display ${
                  shiftUnassigned
                    ? "is-unassigned"
                    : ""
                }"
              >
                <span
                  class="assignment-indicator"
                ></span>

                <span class="assignment-value">
                  ${escapeHtml(
                    shiftText
                  )}
                </span>
              </div>
            </td>

            <!-- 배정 지역 -->
            <td>
              <button
                type="button"
                class="employee-assignment-button ${
                  workplaceUnassigned
                    ? "is-unassigned"
                    : ""
                }"
                data-assignment-type="workplace"
                data-employee-id="${escapeHtml(
                  employee.id
                )}"
              >
                <span
                  class="assignment-indicator"
                ></span>

                <span class="assignment-value">
                  ${escapeHtml(
                    workplaceText
                  )}
                </span>

                <span
                  class="assignment-arrow"
                >
                  ›
                </span>
              </button>
            </td>

            <!-- 상태 -->
            <td>
              <span
                class="employee-status ${statusClass}"
              >
                ${escapeHtml(
                  statusLabel
                )}
              </span>
            </td>

            <!-- 관리 -->
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
    `${employee.name || "직원"}님의 근무지를 선택해 주세요.`;

  quickAssignTitle.textContent =
    "근무지 배정";

  renderWorkplaceAssignOptions(
    employee
  );

  quickAssignModal.classList.add("open");

  quickAssignModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
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
      String(
        quickAssignEmployeeId
      )
  );

  if (!employee) {
    alert(
      "직원 정보를 찾지 못했습니다."
    );

    return;
  }

  quickAssignSaveBtn.disabled = true;
  quickAssignSaveBtn.textContent =
    "저장 중...";

  try {
    const selectedWorkplaces = [
      ...quickAssignOptionList
        .querySelectorAll(
          'input[name="quickAssignWorkplace"]:checked'
        ),
    ];

    const workplaceIds =
      selectedWorkplaces.map(
        (input) =>
          String(input.value)
      );

    /*
      기존에 설정된 시간대 정보를
      근무지 저장 전에 보관합니다.
    */
    const previousAssignments =
      workplaceAssignments.filter(
        (assignment) =>
          String(
            assignment.user_id
          ) ===
          String(employee.id)
      );

    const { error } =
      await supabase.rpc(
        "admin_set_user_workplaces",
        {
          p_user_id:
            employee.id,

          p_workplace_ids:
            workplaceIds,
        }
      );

    if (error) {
      throw error;
    }

    /*
      계속 배정되어 있는 지역은
      기존 시간대 설정을 다시 연결합니다.
    */
    for (
      const assignment
      of previousAssignments
    ) {
      const workplaceStillAssigned =
        workplaceIds.includes(
          String(
            assignment.workplace_id
          )
        );

      if (
        !workplaceStillAssigned ||
        assignment.work_shift_id ==
          null
      ) {
        continue;
      }

      const {
        error: restoreError,
      } = await supabase
        .from("workplace_users")
        .update({
          work_shift_id:
            assignment.work_shift_id,
        })
        .eq(
          "user_id",
          employee.id
        )
        .eq(
          "workplace_id",
          assignment.workplace_id
        );

      if (restoreError) {
        throw restoreError;
      }
    }

    /*
      저장된 결과를 다시 조회합니다.
    */
    await Promise.all([
      fetchEmployees(),
      fetchWorkplaceAssignments(),
    ]);

    hydrateEmployeeWorkData();

    updateSummary();
    renderEmployeeTable();

    alert(
      `${employee.name || "직원"}님의 근무지 배정이 완료되었습니다.`
    );

    closeQuickAssignModal();
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
    quickAssignSaveBtn.disabled =
      false;

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

  if (employeeRoleInput) {
  employeeRoleInput.value =
    "employee";
  }

  if (employeePositionInput) {
    employeePositionInput.value =
      "";
  }

  renderEmployeeShiftOptions();

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

async function createEmployee(
  event
) {
  event.preventDefault();

  const name =
    employeeNameInput.value
      .trim();

  const phone =
    employeePhoneInput.value
      .trim();

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
    employeeWorkplaceInput
      ?.value || null;

  const selectedInitialShiftId =
    employeeShiftInput
      ?.value || null;

  /*
    선택한 시간대가 선택한 지역에
    실제로 속하는지 다시 확인합니다.
  */
  if (selectedInitialShiftId) {
    const selectedShift =
      workShifts.find(
        (shift) =>
          String(shift.id) ===
          String(
            selectedInitialShiftId
          )
      );

    if (
      !selectedShift ||
      String(
        selectedShift.workplace_id
      ) !==
        String(
          selectedInitialWorkplaceId
        )
    ) {
      alert(
        "선택한 지역과 근무 시간대가 일치하지 않습니다."
      );

      return;
    }
  }

  const newEmployee = {
    name,
    phone,

    position:
      employeePositionInput
        ?.value || null,

    app_role:
      employeeRoleInput
        ?.value || "employee",

    app_approval_status:
      "not_requested",

    status:
      employeeStatusInput
        ?.value || "active",

    memo:
      employeeMemoInput
        ?.value
        .trim() || null,

    department:
      employeeDepartmentInput
        ?.value || null,
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

    /*
      초기 근무지역 배정
    */
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

    /*
      초기 근무 시간대 배정
    */
    if (
      selectedInitialWorkplaceId &&
      selectedInitialShiftId
    ) {
      const {
        error:
          shiftAssignmentError,
      } = await supabase
        .from("workplace_users")
        .update({
          work_shift_id:
            Number(
              selectedInitialShiftId
            ),
        })
        .eq(
          "user_id",
          createdEmployee.id
        )
        .eq(
          "workplace_id",
          selectedInitialWorkplaceId
        );

      if (shiftAssignmentError) {
        throw shiftAssignmentError;
      }
    }

    await Promise.all([
      fetchEmployees(),
      fetchWorkplaceAssignments(),
    ]);

    hydrateEmployeeWorkData();

    updateSummary();
    renderEmployeeTable();

    closeEmployeeModal();

    alert(
      "직원이 등록되었습니다."
    );
  } catch (error) {
    console.error(
      "직원 등록 실패:",
      error
    );

    alert(
      `직원 등록에 실패했습니다.\n${
        error.message ||
        "Supabase 권한을 확인해 주세요."
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
  employeePositionFilter
    ?.addEventListener(
      "change",
      refreshEmployeeList
    );

  employeeDepartmentFilter
    ?.addEventListener(
      "change",
      refreshEmployeeList
    );

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

  employeeShiftFilter?.addEventListener(
    "change",
    refreshEmployeeList
  );

  employeeWorkplaceInput?.addEventListener(
    "change",
    renderEmployeeShiftOptions
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
        <td
          colspan="8"
          class="empty-table"
        >
          직원 정보를 불러오는 중입니다.
        </td>
      </tr>
    `;
  }

  try {
    await Promise.all([
      fetchWorkplaces(),
      fetchWorkShifts(),
      fetchWorkplaceAssignments(),
      fetchJobPositions(),
      fetchEmployees(),
      fetchEmployeeDepartments(),
    ]);

    hydrateEmployeeWorkData();

    renderWorkplaceOptions();
    renderPositionOptions();
    renderShiftFilterOptions();
    renderEmployeeShiftOptions();
    renderEmployeePositionFilter();
    renderEmployeeDepartmentOptions();

    updateSummary();
    renderEmployeeTable();
  } catch (error) {
    console.error(
      "직원 관리 초기화 실패:",
      error
    );

    if (employeeTableBody) {
      employeeTableBody.innerHTML = `
        <tr>
          <td
            colspan="8"
            class="empty-table"
          >
            직원 정보를 불러오지 못했습니다.
            <br>
            ${escapeHtml(
              error.message ||
              "알 수 없는 오류"
            )}
          </td>
        </tr>
      `;
    }
  }
}

initEmployeesPage();
