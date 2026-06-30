/* =========================
  근무지역 관리 페이지
========================= */

const workZones = [
  {
    id: "zone001",
    name: "서면 B구역",
    address: "부산 부산진구 중앙대로 672",
    detail: "건물 1층 정문 기준",
    latitude: "35.1577",
    longitude: "129.0592",
    radius: 100,
    status: "활성",
    startTime: "09:00",
    endTime: "18:00",
    memo: "지하상가 근처라 GPS 오차 주의",
    assignedEmployees: ["박서연", "정하윤", "이민준"],
    todayWorking: 5,
    todayIssue: 2,
  },
  {
    id: "zone002",
    name: "해운대 A구역",
    address: "부산 해운대구 해운대로 626",
    detail: "상가 입구 기준",
    latitude: "35.1631",
    longitude: "129.1635",
    radius: 150,
    status: "활성",
    startTime: "09:00",
    endTime: "18:00",
    memo: "야외 기준점으로 GPS 안정적",
    assignedEmployees: ["김다은", "박서연"],
    todayWorking: 4,
    todayIssue: 1,
  },
  {
    id: "zone003",
    name: "남포동 C구역",
    address: "부산 중구 광복로 72",
    detail: "중앙 출입구 기준",
    latitude: "35.0983",
    longitude: "129.0343",
    radius: 80,
    status: "비활성",
    startTime: "10:00",
    endTime: "19:00",
    memo: "현재 임시 운영 중단",
    assignedEmployees: ["한지우"],
    todayWorking: 0,
    todayIssue: 0,
  },
];

let selectedZoneIndex = null;
let editingZoneIndex = null;

const zoneTableBody = document.getElementById("zoneTableBody");
const zoneSearchInput = document.getElementById("zoneSearchInput");
const zoneStatusFilter = document.getElementById("zoneStatusFilter");
const zoneRadiusFilter = document.getElementById("zoneRadiusFilter");
const zoneAddressInput = document.getElementById("zoneAddressInput");
const zoneMapInfo = document.getElementById("zoneMapInfo");

const addZoneBtn = document.getElementById("addZoneBtn");
const zoneModal = document.getElementById("zoneModal");
const zoneModalTitle = document.getElementById("zoneModalTitle");
const zoneModalCloseBtn = document.getElementById("zoneModalCloseBtn");
const zoneModalCancelBtn = document.getElementById("zoneModalCancelBtn");
const zoneSaveBtn = document.getElementById("zoneSaveBtn");

const zoneNameInput = document.getElementById("zoneNameInput");
const zoneStatusInput = document.getElementById("zoneStatusInput");
const zoneAddressFormInput = document.getElementById("zoneAddressFormInput");
const zoneDetailInput = document.getElementById("zoneDetailInput");
const zoneLatInput = document.getElementById("zoneLatInput");
const zoneLngInput = document.getElementById("zoneLngInput");
const zoneRadiusInput = document.getElementById("zoneRadiusInput");
const zoneStartTimeInput = document.getElementById("zoneStartTimeInput");
const zoneEndTimeInput = document.getElementById("zoneEndTimeInput");
const zoneMemoInput = document.getElementById("zoneMemoInput");

const assignModal = document.getElementById("assignModal");
const assignModalTitle = document.getElementById("assignModalTitle");
const assignModalCloseBtn = document.getElementById("assignModalCloseBtn");
const assignModalCancelBtn = document.getElementById("assignModalCancelBtn");
const assignSaveBtn = document.getElementById("assignSaveBtn");
const assignedEmployeeList = document.getElementById("assignedEmployeeList");
const assignEmployeeSelect = document.getElementById("assignEmployeeSelect");

function getStatusClass(status) {
  if (status === "활성") return "normal";
  if (status === "비활성") return "location";
  return "absent";
}

function filterZones() {
  const keyword = zoneSearchInput ? zoneSearchInput.value.trim() : "";
  const selectedStatus = zoneStatusFilter ? zoneStatusFilter.value : "all";
  const selectedRadius = zoneRadiusFilter ? zoneRadiusFilter.value : "all";
  const addressKeyword = zoneAddressInput ? zoneAddressInput.value.trim() : "";

  return workZones.filter((zone) => {
    const nameMatched = keyword === "" || zone.name.includes(keyword);
    const statusMatched = selectedStatus === "all" || zone.status === selectedStatus;
    const addressMatched = addressKeyword === "" || zone.address.includes(addressKeyword);
    const radiusMatched =
      selectedRadius === "all" || zone.radius <= Number(selectedRadius);

    return nameMatched && statusMatched && addressMatched && radiusMatched;
  });
}

function renderZoneTable() {
  if (!zoneTableBody) return;

  const filteredZones = filterZones();

  if (filteredZones.length === 0) {
    zoneTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">조회된 근무지역이 없습니다.</td>
      </tr>
    `;
    return;
  }

  zoneTableBody.innerHTML = filteredZones
    .map((zone) => {
      const originalIndex = workZones.indexOf(zone);

      return `
        <tr>
          <td>
            <strong>${zone.name}</strong>
          </td>
          <td>
            <p class="zone-address">${zone.address}</p>
          </td>
          <td>
            <span class="zone-radius-chip">${zone.radius}m</span>
          </td>
          <td>${zone.assignedEmployees.length}명</td>
          <td>
            <span class="status ${getStatusClass(zone.status)}">
              ${zone.status}
            </span>
          </td>
          <td>
            <p class="zone-operation-text">
              근무중 ${zone.todayWorking}명 · 문제 ${zone.todayIssue}건
            </p>
          </td>
          <td>
            <div class="zone-action-group">
              <button class="table-action-btn" type="button" onclick="selectZone(${originalIndex})">
                상세
              </button>
              <button class="table-action-btn" type="button" onclick="openAssignModal(${originalIndex})">
                배정
              </button>
              <button class="table-action-btn" type="button" onclick="openEditZoneModal(${originalIndex})">
                수정
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function selectZone(index) {
  selectedZoneIndex = index;
  const zone = workZones[index];

  if (!zoneMapInfo) return;

  zoneMapInfo.innerHTML = `
    <strong>${zone.name}</strong>
    <p>주소: ${zone.address}</p>
    <p>상세 위치: ${zone.detail}</p>
    <p>위도/경도: ${zone.latitude}, ${zone.longitude}</p>
    <p>출근 허용 반경: ${zone.radius}m</p>
    <p>기본 근무 시간: ${zone.startTime} ~ ${zone.endTime}</p>
  `;
}

function openAddZoneModal() {
  editingZoneIndex = null;
  zoneModalTitle.textContent = "근무지역 등록";

  zoneNameInput.value = "";
  zoneStatusInput.value = "활성";
  zoneAddressFormInput.value = "";
  zoneDetailInput.value = "";
  zoneLatInput.value = "";
  zoneLngInput.value = "";
  zoneRadiusInput.value = 100;
  zoneStartTimeInput.value = "09:00";
  zoneEndTimeInput.value = "18:00";
  zoneMemoInput.value = "";

  zoneModal.classList.add("open");
}

function openEditZoneModal(index) {
  editingZoneIndex = index;
  const zone = workZones[index];

  zoneModalTitle.textContent = "근무지역 수정";

  zoneNameInput.value = zone.name;
  zoneStatusInput.value = zone.status;
  zoneAddressFormInput.value = zone.address;
  zoneDetailInput.value = zone.detail;
  zoneLatInput.value = zone.latitude;
  zoneLngInput.value = zone.longitude;
  zoneRadiusInput.value = zone.radius;
  zoneStartTimeInput.value = zone.startTime;
  zoneEndTimeInput.value = zone.endTime;
  zoneMemoInput.value = zone.memo;

  zoneModal.classList.add("open");
}

function closeZoneModal() {
  editingZoneIndex = null;
  zoneModal.classList.remove("open");
}

function saveZone() {
  const name = zoneNameInput.value.trim();
  const address = zoneAddressFormInput.value.trim();
  const radius = Number(zoneRadiusInput.value);

  if (!name || !address || !radius) {
    alert("지역명, 주소, 출근 허용 반경을 입력해 주세요.");
    return;
  }

  const zoneData = {
    id: editingZoneIndex === null ? `zone${Date.now()}` : workZones[editingZoneIndex].id,
    name,
    address,
    detail: zoneDetailInput.value.trim(),
    latitude: zoneLatInput.value.trim(),
    longitude: zoneLngInput.value.trim(),
    radius,
    status: zoneStatusInput.value,
    startTime: zoneStartTimeInput.value,
    endTime: zoneEndTimeInput.value,
    memo: zoneMemoInput.value.trim(),
    assignedEmployees:
      editingZoneIndex === null ? [] : workZones[editingZoneIndex].assignedEmployees,
    todayWorking: editingZoneIndex === null ? 0 : workZones[editingZoneIndex].todayWorking,
    todayIssue: editingZoneIndex === null ? 0 : workZones[editingZoneIndex].todayIssue,
  };

  if (editingZoneIndex === null) {
    workZones.unshift(zoneData);
  } else {
    workZones[editingZoneIndex] = zoneData;
  }

  renderZoneTable();
  closeZoneModal();
}

function openAssignModal(index) {
  selectedZoneIndex = index;
  const zone = workZones[index];

  assignModalTitle.textContent = `${zone.name} 직원 배정`;

  assignedEmployeeList.innerHTML = zone.assignedEmployees.length
    ? zone.assignedEmployees
        .map((name) => `<span class="assigned-employee-chip">${name}</span>`)
        .join("")
    : `<span class="assigned-employee-chip">배정 직원 없음</span>`;

  assignModal.classList.add("open");
}

function closeAssignModal() {
  selectedZoneIndex = null;
  assignModal.classList.remove("open");
}

function saveAssignEmployee() {
  if (selectedZoneIndex === null) return;

  const selectedEmployee = assignEmployeeSelect.value;
  const zone = workZones[selectedZoneIndex];

  if (!zone.assignedEmployees.includes(selectedEmployee)) {
    zone.assignedEmployees.push(selectedEmployee);
  }

  renderZoneTable();
  openAssignModal(selectedZoneIndex);
}

function initZonePage() {
  renderZoneTable();

  if (zoneSearchInput) {
    zoneSearchInput.addEventListener("input", renderZoneTable);
  }

  if (zoneStatusFilter) {
    zoneStatusFilter.addEventListener("change", renderZoneTable);
  }

  if (zoneRadiusFilter) {
    zoneRadiusFilter.addEventListener("change", renderZoneTable);
  }

  if (zoneAddressInput) {
    zoneAddressInput.addEventListener("input", renderZoneTable);
  }

  if (addZoneBtn) {
    addZoneBtn.addEventListener("click", openAddZoneModal);
  }

  if (zoneModalCloseBtn) {
    zoneModalCloseBtn.addEventListener("click", closeZoneModal);
  }

  if (zoneModalCancelBtn) {
    zoneModalCancelBtn.addEventListener("click", closeZoneModal);
  }

  if (zoneSaveBtn) {
    zoneSaveBtn.addEventListener("click", saveZone);
  }

  if (assignModalCloseBtn) {
    assignModalCloseBtn.addEventListener("click", closeAssignModal);
  }

  if (assignModalCancelBtn) {
    assignModalCancelBtn.addEventListener("click", closeAssignModal);
  }

  if (assignSaveBtn) {
    assignSaveBtn.addEventListener("click", saveAssignEmployee);
  }

  if (zoneModal) {
    zoneModal.addEventListener("click", (event) => {
      if (event.target === zoneModal) {
        closeZoneModal();
      }
    });
  }

  if (assignModal) {
    assignModal.addEventListener("click", (event) => {
      if (event.target === assignModal) {
        closeAssignModal();
      }
    });
  }
}

initZonePage();