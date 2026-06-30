/* =========================
  직원 관리 목록 페이지
========================= */

const employeeTableBody = document.getElementById("employeeTableBody");
const employeeSearchInput = document.getElementById("employeeSearchInput");
const employeeStatusFilter = document.getElementById("employeeStatusFilter");
const employeeRegionFilter = document.getElementById("employeeRegionFilter");
const employeeTeamFilter = document.getElementById("employeeTeamFilter");
const unassignedOnlyCheck = document.getElementById("unassignedOnlyCheck");

function getStatusClass(status) {
  if (status === "활성") return "normal";
  if (status === "대기") return "late";
  if (status === "비활성") return "location";
  return "absent";
}

function filterEmployees() {
  const keyword = employeeSearchInput ? employeeSearchInput.value.trim() : "";
  const selectedStatus = employeeStatusFilter ? employeeStatusFilter.value : "all";
  const selectedRegion = employeeRegionFilter ? employeeRegionFilter.value : "all";
  const selectedTeam = employeeTeamFilter ? employeeTeamFilter.value : "all";
  const unassignedOnly = unassignedOnlyCheck ? unassignedOnlyCheck.checked : false;

  return employees.filter((employee) => {
    const nameMatched = keyword === "" || employee.name.includes(keyword);
    const statusMatched = selectedStatus === "all" || employee.status === selectedStatus;
    const teamMatched = selectedTeam === "all" || employee.team === selectedTeam;
    const regionMatched =
      selectedRegion === "all" || employee.regions.includes(selectedRegion);
    const unassignedMatched =
      !unassignedOnly || employee.regions.includes("미배정");

    return nameMatched && statusMatched && teamMatched && regionMatched && unassignedMatched;
  });
}

function renderEmployeeTable() {
  if (!employeeTableBody) return;

  const filteredEmployees = filterEmployees();

  if (filteredEmployees.length === 0) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">조회된 직원이 없습니다.</td>
      </tr>
    `;
    return;
  }

  employeeTableBody.innerHTML = filteredEmployees
    .map((employee) => {
      const regionText =
        employee.regions.length > 1
          ? `${employee.regions[0]} 외 ${employee.regions.length - 1}개`
          : employee.regions[0];

      const isUnassigned = employee.regions.includes("미배정");

      return `
        <tr>
          <td>
            <div class="employee">
              <span class="avatar">${employee.name.slice(0, 1)}</span>
              ${employee.name}
            </div>
          </td>
          <td>${employee.phone}</td>
          <td>${employee.team}</td>
          <td>
            <span class="employee-region-chip ${isUnassigned ? "empty" : ""}">
              ${regionText}
            </span>
          </td>
          <td>
            <span class="status ${getStatusClass(employee.status)}">
              ${employee.status}
            </span>
          </td>
          <td>
            <p class="employee-work-summary">
              출근 ${employee.workDays}일 · 지각 ${employee.lateCount}회
            </p>
          </td>
          <td>
            <a class="table-action-btn" href="admin-employee-detail.html?id=${employee.id}">
              상세
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function initEmployeesPage() {
  renderEmployeeTable();

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

initEmployeesPage();