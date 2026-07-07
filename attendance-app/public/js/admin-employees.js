/* =========================
  관리자 직원 관리 페이지
  Supabase 연동 버전
========================= */

import supabase from "./supabase.js";

const employeeTableBody = document.getElementById("employeeTableBody");
const employeeSearchInput = document.getElementById("employeeSearchInput");
const employeeStatusFilter = document.getElementById("employeeStatusFilter");
const employeeRegionFilter = document.getElementById("employeeRegionFilter");
const employeeTeamFilter = document.getElementById("employeeTeamFilter");
const unassignedOnlyCheck = document.getElementById("unassignedOnlyCheck");

const totalEmployeeCount = document.getElementById("totalEmployeeCount");
const activeEmployeeCount = document.getElementById("activeEmployeeCount");
const unassignedEmployeeCount = document.getElementById("unassignedEmployeeCount");
const inactiveEmployeeCount = document.getElementById("inactiveEmployeeCount");
const employeeListCount = document.getElementById("employeeListCount");

const employeeAddBtn = document.getElementById("employeeAddBtn");
const employeeModal = document.getElementById("employeeModal");
const employeeModalCloseBtn = document.getElementById("employeeModalCloseBtn");
const employeeCancelBtn = document.getElementById("employeeCancelBtn");
const employeeForm = document.getElementById("employeeForm");

const employeeNameInput = document.getElementById("employeeNameInput");
const employeePhoneInput = document.getElementById("employeePhoneInput");
const employeeCodeInput = document.getElementById("employeeCodeInput");
const employeeDepartmentInput = document.getElementById("employeeDepartmentInput");
const employeeStatusInput = document.getElementById("employeeStatusInput");
const employeeWorkplaceInput = document.getElementById("employeeWorkplaceInput");
const employeeMemoInput = document.getElementById("employeeMemoInput");

let employees = [];
let workplaces = [];

const STATUS_LABEL = {
  active: "활성",
  pending: "대기",
  inactive: "비활성",
  resigned: "퇴사",
};

function normalizeStatus(status) {
  if (!status) return "active";

  if (["활성", "active"].includes(status)) return "active";
  if (["대기", "pending"].includes(status)) return "pending";
  if (["비활성", "inactive"].includes(status)) return "inactive";
  if (["퇴사", "resigned"].includes(status)) return "resigned";

  return status;
}

function getStatusLabel(status) {
  return STATUS_LABEL[normalizeStatus(status)] || status || "활성";
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "active") return "normal";
  if (normalized === "pending") return "late";
  if (normalized === "inactive") return "location";
  return "absent";
}

function getWorkplaceName(workplaceId) {
  if (!workplaceId) return "미배정";

  const workplace = workplaces.find((item) => item.id === workplaceId);
  return workplace ? workplace.name : "미배정";
}

function formatPhone(phone) {
  if (!phone) return "-";

  const onlyNumber = String(phone).replace(/[^0-9]/g, "");

  if (onlyNumber.length === 11) {
    return onlyNumber.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }

  return phone;
}

async function fetchWorkplaces() {
  const { data, error } = await supabase
    .from("workplaces")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("근무지역 조회 실패:", error);
    workplaces = [];
    return;
  }

  workplaces = data || [];
}

async function fetchEmployees() {
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      name,
      phone,
      employee_code,
      department,
      status,
      workplace_id,
      memo,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("직원 목록 조회 실패:", error);

    if (employeeTableBody) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table">
            직원 정보를 불러오지 못했습니다.
          </td>
        </tr>
      `;
    }

    employees = [];
    return;
  }

  employees = data || [];
}

function renderWorkplaceOptions() {
  if (employeeRegionFilter) {
    const currentValue = employeeRegionFilter.value;

    employeeRegionFilter.innerHTML = `
      <option value="all">전체 지역</option>
      <option value="unassigned">미배정</option>
      ${workplaces
        .map((workplace) => {
          return `<option value="${workplace.id}">${workplace.name}</option>`;
        })
        .join("")}
    `;

    employeeRegionFilter.value = currentValue || "all";
  }

  if (employeeWorkplaceInput) {
    employeeWorkplaceInput.innerHTML = `
      <option value="">미배정</option>
      ${workplaces
        .map((workplace) => {
          return `<option value="${workplace.id}">${workplace.name}</option>`;
        })
        .join("")}
    `;
  }
}

function updateSummary() {
  const total = employees.length;
  const active = employees.filter(
    (employee) => normalizeStatus(employee.status) === "active"
  ).length;
  const unassigned = employees.filter((employee) => !employee.workplace_id).length;
  const inactive = employees.filter(
    (employee) => normalizeStatus(employee.status) === "inactive"
  ).length;

  if (totalEmployeeCount) totalEmployeeCount.textContent = total;
  if (activeEmployeeCount) activeEmployeeCount.textContent = active;
  if (unassignedEmployeeCount) unassignedEmployeeCount.textContent = unassigned;
  if (inactiveEmployeeCount) inactiveEmployeeCount.textContent = inactive;
}

function filterEmployees() {
  const keyword = employeeSearchInput ? employeeSearchInput.value.trim() : "";
  const selectedStatus = employeeStatusFilter ? employeeStatusFilter.value : "all";
  const selectedRegion = employeeRegionFilter ? employeeRegionFilter.value : "all";
  const selectedTeam = employeeTeamFilter ? employeeTeamFilter.value : "all";
  const unassignedOnly = unassignedOnlyCheck ? unassignedOnlyCheck.checked : false;

  return employees.filter((employee) => {
    const employeeStatus = normalizeStatus(employee.status);
    const employeeWorkplaceId = employee.workplace_id
      ? String(employee.workplace_id)
      : "";    const employeeCode = employee.employee_code || "";
    const employeePhone = employee.phone || "";
    const employeeDepartment = employee.department || "미배정";

    const keywordMatched =
      keyword === "" ||
      employee.name?.includes(keyword) ||
      employeePhone.includes(keyword) ||
      employeeCode.includes(keyword);

    const statusMatched =
      selectedStatus === "all" || employeeStatus === selectedStatus;

    const regionMatched =
      selectedRegion === "all" ||
      (selectedRegion === "unassigned" && !employeeWorkplaceId) ||
      employeeWorkplaceId === selectedRegion;

    const teamMatched =
      selectedTeam === "all" || employeeDepartment === selectedTeam;

    const unassignedMatched = !unassignedOnly || !employeeWorkplaceId;

    return (
      keywordMatched &&
      statusMatched &&
      regionMatched &&
      teamMatched &&
      unassignedMatched
    );
  });
}

function renderEmployeeTable() {
  if (!employeeTableBody) return;

  const filteredEmployees = filterEmployees();

  if (employeeListCount) {
    employeeListCount.textContent = `${filteredEmployees.length}명`;
  }

  if (filteredEmployees.length === 0) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          조회된 직원이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  employeeTableBody.innerHTML = filteredEmployees
    .map((employee) => {
      const workplaceName = getWorkplaceName(employee.workplace_id);
      const statusLabel = getStatusLabel(employee.status);
      const statusClass = getStatusClass(employee.status);

      return `
        <tr>
          <td>
            <div class="employee-name-cell">
              <strong>${employee.name || "이름 없음"}</strong>
            </div>
          </td>
          <td>${formatPhone(employee.phone)}</td>
          <td>${employee.employee_code || "-"}</td>
          <td>${employee.department || "미배정"}</td>
          <td>
            <span class="region-pill ${!employee.workplace_id ? "empty" : ""}">
              ${workplaceName}
            </span>
          </td>
          <td>
            <span class="status-badge ${statusClass}">
              ${statusLabel}
            </span>
          </td>
          <td>
            <div class="employee-action-group">
              <a href="admin-employee-detail.html?id=${employee.id}" class="table-action-btn">
                상세
              </a>
              <button
                type="button"
                class="table-action-btn danger"
                data-disable-id="${employee.id}"
              >
                비활성화
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  employeeTableBody.querySelectorAll("[data-disable-id]").forEach((button) => {
    button.addEventListener("click", () => {
      disableEmployee(button.dataset.disableId);
    });
  });
}

function openEmployeeModal() {
  if (!employeeModal) return;

  employeeForm.reset();
  employeeModal.classList.add("open");
}

function closeEmployeeModal() {
  if (!employeeModal) return;

  employeeModal.classList.remove("open");
}

async function createEmployee(event) {
  event.preventDefault();

  const newEmployee = {
    name: employeeNameInput.value.trim(),
    phone: employeePhoneInput.value.trim(),
    employee_code: employeeCodeInput.value.trim(),
    department: employeeDepartmentInput.value,
    status: employeeStatusInput.value,
    workplace_id: employeeWorkplaceInput.value || null,
    memo: employeeMemoInput.value.trim(),
  };

  if (!newEmployee.name || !newEmployee.phone || !newEmployee.employee_code) {
    alert("직원명, 연락처, 로그인 ID는 필수입니다.");
    return;
  }

  const { error } = await supabase.from("users").insert(newEmployee);

  if (error) {
    console.error("직원 등록 실패:", error);
    alert("직원 등록에 실패했습니다. Supabase users 컬럼명을 확인해 주세요.");
    return;
  }

  alert("직원이 등록되었습니다.");
  closeEmployeeModal();

  await fetchEmployees();
  updateSummary();
  renderEmployeeTable();
}

async function disableEmployee(employeeId) {
  const confirmDisable = confirm("이 직원을 비활성화하시겠습니까?");

  if (!confirmDisable) return;

  const { error } = await supabase
    .from("users")
    .update({ status: "inactive" })
    .eq("id", employeeId);

  if (error) {
    console.error("직원 비활성화 실패:", error);
    alert("직원 상태 변경에 실패했습니다.");
    return;
  }

  await fetchEmployees();
  updateSummary();
  renderEmployeeTable();
}

function bindEvents() {
  if (employeeAddBtn) {
    employeeAddBtn.addEventListener("click", openEmployeeModal);
  }

  if (employeeModalCloseBtn) {
    employeeModalCloseBtn.addEventListener("click", closeEmployeeModal);
  }

  if (employeeCancelBtn) {
    employeeCancelBtn.addEventListener("click", closeEmployeeModal);
  }

  if (employeeModal) {
    employeeModal.addEventListener("click", (event) => {
      if (event.target === employeeModal) {
        closeEmployeeModal();
      }
    });
  }

  if (employeeForm) {
    employeeForm.addEventListener("submit", createEmployee);
  }

  if (employeeSearchInput) {
    employeeSearchInput.addEventListener("input", renderEmployeeTable);
  }

  if (employeeStatusFilter) {
    employeeStatusFilter.addEventListener("change", renderEmployeeTable);
  }

  if (employeeRegionFilter) {
    employeeRegionFilter.addEventListener("change", renderEmployeeTable);
  }

  if (employeeTeamFilter) {
    employeeTeamFilter.addEventListener("change", renderEmployeeTable);
  }

  if (unassignedOnlyCheck) {
    unassignedOnlyCheck.addEventListener("change", renderEmployeeTable);
  }
}

async function initEmployeesPage() {
  bindEvents();

  await fetchWorkplaces();
  await fetchEmployees();

  renderWorkplaceOptions();
  updateSummary();
  renderEmployeeTable();
}

initEmployeesPage();