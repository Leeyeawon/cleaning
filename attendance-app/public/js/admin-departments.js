import supabase from "./supabase.js";

import {
  requireAdmin,
} from "./adminAuth.js";

const workplaceTableBody =
  document.getElementById(
    "workplaceTableBody"
  );

const totalWorkplaceCount =
  document.getElementById(
    "totalWorkplaceCount"
  );

const activeEmployeeCount =
  document.getElementById(
    "activeEmployeeCount"
  );

const assignedEmployeeCount =
  document.getElementById(
    "assignedEmployeeCount"
  );

const unassignedEmployeeCount =
  document.getElementById(
    "unassignedEmployeeCount"
  );

const totalAssignmentCount =
  document.getElementById(
    "totalAssignmentCount"
  );

const filteredWorkplaceCount =
  document.getElementById(
    "filteredWorkplaceCount"
  );

const zoneSearchInput =
  document.getElementById(
    "zoneSearchInput"
  );

const zoneRadiusFilter =
  document.getElementById(
    "zoneRadiusFilter"
  );

const zoneAddressInput =
  document.getElementById(
    "zoneAddressInput"
  );

const addZoneBtn =
  document.getElementById(
    "addZoneBtn"
  );

const zoneModal =
  document.getElementById(
    "zoneModal"
  );

const zoneModalTitle =
  document.getElementById(
    "zoneModalTitle"
  );

const zoneModalCloseBtn =
  document.getElementById(
    "zoneModalCloseBtn"
  );

const zoneModalCancelBtn =
  document.getElementById(
    "zoneModalCancelBtn"
  );

const zoneSaveBtn =
  document.getElementById(
    "zoneSaveBtn"
  );

const zoneNameInput =
  document.getElementById(
    "zoneNameInput"
  );

const zoneAddressFormInput =
  document.getElementById(
    "zoneAddressFormInput"
  );

const zoneLatInput =
  document.getElementById(
    "zoneLatInput"
  );

const zoneLngInput =
  document.getElementById(
    "zoneLngInput"
  );

const zoneRadiusInput =
  document.getElementById(
    "zoneRadiusInput"
  );

const zoneAddressSearchBtn =
  document.getElementById(
    "zoneAddressSearchBtn"
  );

const zoneAddressGuide =
  document.getElementById(
    "zoneAddressGuide"
  );

const zoneMapElement =
  document.getElementById(
    "zoneMap"
  );

const zoneMapStatus =
  document.getElementById(
    "zoneMapStatus"
  );

let zoneMap = null;
let zoneMapMarker = null;
let zoneRadiusCircle = null;
let zoneGeocoder = null;
let zoneAddressVerified = false;

const assignModal =
  document.getElementById(
    "assignModal"
  );

const assignModalTitle =
  document.getElementById(
    "assignModalTitle"
  );

const assignModalCloseBtn =
  document.getElementById(
    "assignModalCloseBtn"
  );

const assignModalCancelBtn =
  document.getElementById(
    "assignModalCancelBtn"
  );

const assignSaveBtn =
  document.getElementById(
    "assignSaveBtn"
  );

const assignEmployeeList =
  document.getElementById(
    "assignEmployeeList"
  );

const assignmentCountText =
  document.getElementById(
    "assignmentCountText"
  );

const selectAllEmployeesBtn =
  document.getElementById(
    "selectAllEmployeesBtn"
  );

const clearAllEmployeesBtn =
  document.getElementById(
    "clearAllEmployeesBtn"
  );


let workplaces = [];
let employees = [];

let editingWorkplaceId = null;
let assigningWorkplaceId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getEmployeeWorkplaceIds(
  employee
) {
  const ids =
    employee.workplaceIds ||
    employee.workplace_ids ||
    [];

  return Array.isArray(ids)
    ? ids.map(String)
    : [];
}

function getAssignedEmployees(
  workplaceId
) {
  const normalizedId =
    String(workplaceId);

  return employees.filter(
    (employee) =>
      getEmployeeWorkplaceIds(
        employee
      ).includes(normalizedId)
  );
}

function updateSummary() {
  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.status === "active"
    );

  const assignedEmployees =
    activeEmployees.filter(
      (employee) =>
        getEmployeeWorkplaceIds(
          employee
        ).length > 0
    );

  const unassignedEmployees =
    activeEmployees.filter(
      (employee) =>
        getEmployeeWorkplaceIds(
          employee
        ).length === 0
    );

  const assignmentCount =
    activeEmployees.reduce(
      (total, employee) =>
        total +
        getEmployeeWorkplaceIds(
          employee
        ).length,
      0
    );

  totalWorkplaceCount.textContent =
    workplaces.length;

  activeEmployeeCount.textContent =
    activeEmployees.length;

  assignedEmployeeCount.textContent =
    assignedEmployees.length;

  unassignedEmployeeCount.textContent =
    unassignedEmployees.length;

  totalAssignmentCount.textContent =
    assignmentCount;
}

function getFilteredWorkplaces() {
  const nameKeyword =
    zoneSearchInput.value
      .trim()
      .toLowerCase();

  const addressKeyword =
    zoneAddressInput.value
      .trim()
      .toLowerCase();

  const radiusValue =
    zoneRadiusFilter.value;

  return workplaces.filter(
    (workplace) => {
      const name =
        String(
          workplace.name || ""
        ).toLowerCase();

      const address =
        String(
          workplace.address || ""
        ).toLowerCase();

      const radius =
        Number(
          workplace.radius_m || 0
        );

      const matchesName =
        !nameKeyword ||
        name.includes(nameKeyword);

      const matchesAddress =
        !addressKeyword ||
        address.includes(
          addressKeyword
        );

      const matchesRadius =
        radiusValue === "all" ||
        radius <= Number(radiusValue);

      return (
        matchesName &&
        matchesAddress &&
        matchesRadius
      );
    }
  );
}

function renderWorkplaceTable() {
  const filtered =
    getFilteredWorkplaces();

  filteredWorkplaceCount.textContent =
    `${filtered.length}개 지역`;

  if (filtered.length === 0) {
    workplaceTableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="
            padding:30px;
            text-align:center;
            color:#737373;
          "
        >
          조건에 맞는 근무지역이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  workplaceTableBody.innerHTML =
    filtered
      .map((workplace) => {
        const assigned =
          getAssignedEmployees(
            workplace.id
          );

        return `
          <tr>
            <td>
              <strong>
                ${escapeHtml(
                  workplace.name
                )}
              </strong>
            </td>

            <td class="zone-address">
              ${escapeHtml(
                workplace.address ||
                  "주소 미등록"
              )}
            </td>

            <td>
              <span
                class="zone-radius-chip"
              >
                ${Number(
                  workplace.radius_m ||
                    0
                )}m
              </span>
            </td>

            <td>
              <button
                type="button"
                class="table-action-btn"
                data-assign-workplace="${
                  workplace.id
                }"
              >
                ${assigned.length}명 배정
              </button>
            </td>

            <td>
              <div
                class="zone-action-group"
              >
                <button
                  type="button"
                  class="table-action-btn"
                  data-edit-workplace="${
                    workplace.id
                  }"
                >
                  수정
                </button>

                <button
                  type="button"
                  class="table-action-btn"
                  data-delete-workplace="${
                    workplace.id
                  }"
                  style="color:#dc2626;"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  workplaceTableBody
    .querySelectorAll(
      "[data-assign-workplace]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openAssignmentModal(
            button.dataset
              .assignWorkplace
          );
        }
      );
    });

  workplaceTableBody
    .querySelectorAll(
      "[data-edit-workplace]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openZoneModal(
            button.dataset
              .editWorkplace
          );
        }
      );
    });

  workplaceTableBody
    .querySelectorAll(
      "[data-delete-workplace]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteWorkplace(
            button.dataset
              .deleteWorkplace
          );
        }
      );
    });
}

async function loadData() {
  workplaceTableBody.innerHTML = `
    <tr>
      <td
        colspan="5"
        style="
          padding:30px;
          text-align:center;
          color:#737373;
        "
      >
        근무지역 정보를 불러오는 중입니다.
      </td>
    </tr>
  `;

  const [
    workplaceResult,
    employeeResult,
  ] = await Promise.all([
    supabase
      .from("workplaces")
      .select(`
        id,
        name,
        address,
        latitude,
        longitude,
        radius_m
      `)
      .order("name"),

    supabase.rpc(
      "admin_get_employees_v2"
    ),
  ]);

  if (workplaceResult.error) {
    console.error(
      "근무지역 조회 실패:",
      workplaceResult.error
    );

    workplaceTableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="
            padding:30px;
            text-align:center;
            color:#dc2626;
          "
        >
          근무지역을 불러오지 못했습니다.
          <br />
          ${escapeHtml(
            workplaceResult.error
              .message
          )}
        </td>
      </tr>
    `;

    return;
  }

  if (employeeResult.error) {
    console.error(
      "직원 조회 실패:",
      employeeResult.error
    );

    workplaceTableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="
            padding:30px;
            text-align:center;
            color:#dc2626;
          "
        >
          배정 직원 정보를 불러오지
          못했습니다.
          <br />
          ${escapeHtml(
            employeeResult.error
              .message
          )}
        </td>
      </tr>
    `;

    return;
  }

  workplaces =
    workplaceResult.data || [];

  employees =
    Array.isArray(
      employeeResult.data
    )
      ? employeeResult.data
      : [];

  updateSummary();
  renderWorkplaceTable();
}

const DEFAULT_MAP_POSITION = {
  latitude: 35.1796,
  longitude: 129.0756,
};

function isKakaoMapReady() {
  return Boolean(
    window.kakao?.maps &&
    window.kakao.maps.services
  );
}

function initZoneMap() {
  if (
    zoneMap ||
    !zoneMapElement
  ) {
    return;
  }

  if (!isKakaoMapReady()) {
    zoneMapStatus.textContent =
      "카카오 지도를 불러오지 못했습니다.";

    zoneMapStatus.classList.add(
      "error"
    );

    return;
  }

  const center =
    new kakao.maps.LatLng(
      DEFAULT_MAP_POSITION.latitude,
      DEFAULT_MAP_POSITION.longitude
    );

  zoneMap =
    new kakao.maps.Map(
      zoneMapElement,
      {
        center,
        level: 4,
      }
    );

  zoneGeocoder =
    new kakao.maps.services.Geocoder();

  zoneMapMarker =
    new kakao.maps.Marker({
      position: center,
      map: zoneMap,
    });

  zoneRadiusCircle =
    new kakao.maps.Circle({
      center,
      radius: 100,
      strokeWeight: 2,
      strokeColor: "#2563eb",
      strokeOpacity: 0.9,
      fillColor: "#60a5fa",
      fillOpacity: 0.2,
      map: zoneMap,
    });
}

function updateZoneMap(
  latitude,
  longitude,
  radius = 100
) {
  initZoneMap();

  if (!zoneMap) {
    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const safeRadius =
    Math.max(
      1,
      Number(radius) || 100
    );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return;
  }

  const position =
    new kakao.maps.LatLng(
      lat,
      lng
    );

  zoneMapMarker.setPosition(
    position
  );

  zoneRadiusCircle.setPosition(
    position
  );

  zoneRadiusCircle.setRadius(
    safeRadius
  );

  zoneMap.setCenter(position);

  if (safeRadius <= 100) {
    zoneMap.setLevel(3);
  } else if (safeRadius <= 300) {
    zoneMap.setLevel(4);
  } else if (safeRadius <= 700) {
    zoneMap.setLevel(5);
  } else {
    zoneMap.setLevel(6);
  }

  zoneMapStatus.textContent =
    `출근 허용 반경: ${safeRadius}m`;

  zoneMapStatus.classList.remove(
    "error"
  );

  setTimeout(() => {
    zoneMap.relayout();
    zoneMap.setCenter(position);
  }, 50);
}

function geocodeZoneAddress(address) {
  initZoneMap();

  if (!zoneGeocoder) {
    alert(
      "주소 좌표 변환 기능을 불러오지 못했습니다."
    );

    return;
  }

  zoneAddressSearchBtn.disabled = true;
  zoneAddressSearchBtn.textContent =
    "위치 확인 중...";

  zoneGeocoder.addressSearch(
    address,
    (result, status) => {
      zoneAddressSearchBtn.disabled =
        false;

      zoneAddressSearchBtn.textContent =
        "주소 검색";

      if (
        status !==
          kakao.maps.services.Status.OK ||
        !result.length
      ) {
        zoneAddressVerified = false;

        zoneAddressGuide.textContent =
          "주소의 지도 위치를 찾지 못했습니다.";

        zoneAddressGuide.classList.add(
          "error"
        );

        alert(
          "주소에 맞는 지도 위치를 찾지 못했습니다."
        );

        return;
      }

      const latitude =
        Number(result[0].y);

      const longitude =
        Number(result[0].x);

      zoneAddressFormInput.value =
        address;

      zoneLatInput.value =
        latitude.toFixed(7);

      zoneLngInput.value =
        longitude.toFixed(7);

      zoneAddressVerified = true;

      zoneAddressGuide.textContent =
        "주소와 지도 위치가 확인되었습니다.";

      zoneAddressGuide.classList.remove(
        "error"
      );

      updateZoneMap(
        latitude,
        longitude,
        zoneRadiusInput.value
      );
    }
  );
}

function openZoneAddressSearch() {
  if (!window.daum?.Postcode) {
    alert(
      "주소 검색 기능을 불러오지 못했습니다."
    );

    return;
  }

  new daum.Postcode({
    oncomplete(data) {
      const selectedAddress =
        data.roadAddress ||
        data.jibunAddress;

      if (!selectedAddress) {
        alert(
          "선택한 주소를 확인하지 못했습니다."
        );

        return;
      }

      zoneAddressVerified = false;

      zoneAddressFormInput.value =
        selectedAddress;

      zoneAddressGuide.textContent =
        "주소의 지도 위치를 확인하고 있습니다.";

      zoneAddressGuide.classList.remove(
        "error"
      );

      geocodeZoneAddress(
        selectedAddress
      );
    },
  }).open();
}

function resetZoneForm() {
  zoneNameInput.value = "";
  zoneAddressFormInput.value = "";
  zoneLatInput.value = "";
  zoneLngInput.value = "";
  zoneRadiusInput.value = "100";

  zoneAddressVerified = false;

  zoneAddressGuide.textContent =
    "검색한 주소에 맞춰 위치가 자동으로 설정됩니다.";

  zoneAddressGuide.classList.remove(
    "error"
  );

  zoneMapStatus.textContent =
    "주소를 검색하면 지도에 위치가 표시됩니다.";

  zoneMapStatus.classList.remove(
    "error"
  );
}

function openZoneModal(
  workplaceId = null
) {
  editingWorkplaceId =
    workplaceId
      ? String(workplaceId)
      : null;

  resetZoneForm();

  if (editingWorkplaceId) {
    const workplace =
      workplaces.find(
        (item) =>
          String(item.id) ===
          editingWorkplaceId
      );

    if (!workplace) {
      alert(
        "근무지역 정보를 찾지 못했습니다."
      );

      return;
    }

    zoneModalTitle.textContent =
      "근무지역 수정";

    zoneNameInput.value =
      workplace.name || "";

    zoneAddressFormInput.value =
      workplace.address || "";

    zoneLatInput.value =
      workplace.latitude ?? "";

    zoneLngInput.value =
      workplace.longitude ?? "";

    zoneRadiusInput.value =
      workplace.radius_m || 100;

    zoneAddressVerified =
      Boolean(
        workplace.address &&
        workplace.latitude != null &&
        workplace.longitude != null
      );
      
  } else {
    zoneModalTitle.textContent =
      "근무지역 등록";
  }

  zoneModal.classList.add("open");

  setTimeout(() => {
    initZoneMap();

    if (
      editingWorkplaceId &&
      zoneLatInput.value &&
      zoneLngInput.value
    ) {
      updateZoneMap(
        zoneLatInput.value,
        zoneLngInput.value,
        zoneRadiusInput.value
      );
    } else if (zoneMap) {
      const defaultPosition =
        new kakao.maps.LatLng(
          DEFAULT_MAP_POSITION.latitude,
          DEFAULT_MAP_POSITION.longitude
        );

      zoneMap.relayout();
      zoneMap.setCenter(
        defaultPosition
      );
    }
  }, 80);


  setTimeout(() => {
    zoneNameInput.focus();
  }, 0);
}

function closeZoneModal() {
  zoneModal.classList.remove("open");
  editingWorkplaceId = null;
  resetZoneForm();
}

async function saveWorkplace() {
  const name =
    zoneNameInput.value.trim();

  const address =
    zoneAddressFormInput.value
      .trim();

  const latitude =
    Number(zoneLatInput.value);

  const longitude =
    Number(zoneLngInput.value);

  const radius =
    Number(zoneRadiusInput.value);

  if (!name) {
    alert(
      "근무지명을 입력해 주세요."
    );

    zoneNameInput.focus();
    return;
  }

  if (!address) {
    alert("주소를 입력해 주세요.");

    zoneAddressFormInput.focus();
    return;
  }

  if (!zoneAddressVerified) {
    alert(
      "주소 검색을 통해 근무지 위치를 확인해 주세요."
    );

    zoneAddressSearchBtn.focus();
    return;
  }

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    alert(
      "올바른 위도를 입력해 주세요."
    );

    zoneLatInput.focus();
    return;
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    alert(
      "올바른 경도를 입력해 주세요."
    );

    zoneLngInput.focus();
    return;
  }

  if (
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    alert(
      "출근 허용 반경을 입력해 주세요."
    );

    zoneRadiusInput.focus();
    return;
  }

  const payload = {
    name,
    address,
    latitude,
    longitude,
    radius_m: radius,
  };

  zoneSaveBtn.disabled = true;
  zoneSaveBtn.textContent =
    "저장 중...";

  try {
    let result;

    if (editingWorkplaceId) {
      result = await supabase
        .from("workplaces")
        .update(payload)
        .eq(
          "id",
          editingWorkplaceId
        );
    } else {
      result = await supabase
        .from("workplaces")
        .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    alert(
      editingWorkplaceId
        ? "근무지역이 수정되었습니다."
        : "근무지역이 등록되었습니다."
    );

    closeZoneModal();
    await loadData();
  } catch (error) {
    console.error(
      "근무지역 저장 실패:",
      error
    );

    alert(
      `근무지역을 저장하지 못했습니다.\n${
        error.message ||
        "Supabase 권한을 확인해 주세요."
      }`
    );
  } finally {
    zoneSaveBtn.disabled = false;
    zoneSaveBtn.textContent =
      "저장";
  }
}

async function deleteWorkplace(
  workplaceId
) {
  const workplace =
    workplaces.find(
      (item) =>
        String(item.id) ===
        String(workplaceId)
    );

  if (!workplace) {
    return;
  }

  const assigned =
    getAssignedEmployees(
      workplaceId
    );

  if (assigned.length > 0) {
    alert(
      `현재 ${assigned.length}명의 직원이 배정되어 있습니다.\n직원 배정을 모두 해제한 후 삭제해 주세요.`
    );

    return;
  }

  const confirmed =
    confirm(
      `"${workplace.name}" 근무지역을 삭제하시겠습니까?\n\n출퇴근 기록이 존재하는 지역은 삭제되지 않을 수 있습니다.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const { count, error: countError } =
      await supabase
        .from("attendance")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "workplace_id",
          workplaceId
        );

    if (countError) {
      throw countError;
    }

    if ((count || 0) > 0) {
      alert(
        `이 지역에는 출퇴근 기록 ${count}건이 있어 삭제할 수 없습니다.\n기록 보존을 위해 지역 정보를 수정해서 사용해 주세요.`
      );

      return;
    }

    const { error } =
      await supabase
        .from("workplaces")
        .delete()
        .eq("id", workplaceId);

    if (error) {
      throw error;
    }

    alert(
      "근무지역이 삭제되었습니다."
    );

    await loadData();
  } catch (error) {
    console.error(
      "근무지역 삭제 실패:",
      error
    );

    alert(
      `근무지역을 삭제하지 못했습니다.\n${
        error.message ||
        "연결된 데이터를 확인해 주세요."
      }`
    );
  }
}

function openAssignmentModal(
  workplaceId
) {
  assigningWorkplaceId =
    String(workplaceId);

  const workplace =
    workplaces.find(
      (item) =>
        String(item.id) ===
        assigningWorkplaceId
    );

  if (!workplace) {
    alert(
      "근무지역 정보를 찾지 못했습니다."
    );

    return;
  }

  assignModalTitle.textContent =
    `${workplace.name} 직원 배정`;

  renderAssignmentEmployees();

  assignModal.classList.add("open");
}

function closeAssignmentModal() {
  assignModal.classList.remove("open");
  assigningWorkplaceId = null;
  assignEmployeeList.innerHTML = "";
}

function renderAssignmentEmployees() {
  if (!assigningWorkplaceId) {
    return;
  }

  if (employees.length === 0) {
    assignEmployeeList.innerHTML = `
      <p style="color:#737373;">
        등록된 직원이 없습니다.
      </p>
    `;

    assignmentCountText.textContent =
      "배정 가능한 직원이 없습니다.";

    return;
  }

  const sortedEmployees =
    [...employees].sort(
      (first, second) => {
        const firstActive =
          first.status === "active"
            ? 0
            : 1;

        const secondActive =
          second.status === "active"
            ? 0
            : 1;

        if (
          firstActive !== secondActive
        ) {
          return (
            firstActive -
            secondActive
          );
        }

        return String(
          first.name || ""
        ).localeCompare(
          String(
            second.name || ""
          ),
          "ko"
        );
      }
    );

  assignEmployeeList.innerHTML =
    sortedEmployees
      .map((employee) => {
        const assigned =
          getEmployeeWorkplaceIds(
            employee
          ).includes(
            assigningWorkplaceId
          );

        const inactive =
          employee.status !== "active";

        return `
          <label
            style="
              width:100%;
              min-height:44px;
              padding:10px 12px;
              border:1px solid #e5e5e5;
              border-radius:8px;
              background:#fff;
              display:flex;
              align-items:center;
              gap:10px;
              cursor:pointer;
            "
          >
            <input
              type="checkbox"
              name="assignedEmployee"
              value="${employee.id}"
              ${assigned
                ? "checked"
                : ""}
              style="
                width:18px;
                height:18px;
              "
            />

            <span
              style="
                flex:1;
                display:flex;
                flex-direction:column;
                gap:2px;
              "
            >
              <strong
                style="
                  color:#171717;
                  font-size:14px;
                "
              >
                ${escapeHtml(
                  employee.name ||
                    "이름 없음"
                )}
              </strong>

              <small
                style="
                  color:#737373;
                  font-size:12px;
                "
              >
                ${escapeHtml(
                  employee.department ||
                    "소속 미지정"
                )}
              </small>
            </span>

            ${
              inactive
                ? `
                  <small
                    style="
                      color:#dc2626;
                      font-size:11px;
                    "
                  >
                    비활성
                  </small>
                `
                : ""
            }
          </label>
        `;
      })
      .join("");

  updateAssignmentCount();

  assignEmployeeList
    .querySelectorAll(
      'input[name="assignedEmployee"]'
    )
    .forEach((input) => {
      input.addEventListener(
        "change",
        updateAssignmentCount
      );
    });
}

function updateAssignmentCount() {
  const selectedCount =
    assignEmployeeList
      .querySelectorAll(
        'input[name="assignedEmployee"]:checked'
      ).length;

  assignmentCountText.textContent =
    `${selectedCount}명이 이 근무지역에 배정됩니다.`;
}

async function saveAssignments() {
  if (!assigningWorkplaceId) {
    return;
  }

  const selectedUserIds =
    new Set(
      [
        ...assignEmployeeList
          .querySelectorAll(
            'input[name="assignedEmployee"]:checked'
          ),
      ].map(
        (input) =>
          String(input.value)
      )
    );

  const changedEmployees =
    employees.filter(
      (employee) => {
        const currentlyAssigned =
          getEmployeeWorkplaceIds(
            employee
          ).includes(
            assigningWorkplaceId
          );

        const shouldBeAssigned =
          selectedUserIds.has(
            String(employee.id)
          );

        return (
          currentlyAssigned !==
          shouldBeAssigned
        );
      }
    );

  if (
    changedEmployees.length === 0
  ) {
    alert(
      "변경된 직원 배정이 없습니다."
    );

    closeAssignmentModal();
    return;
  }

  assignSaveBtn.disabled = true;
  assignSaveBtn.textContent =
    "저장 중...";

  try {
    for (
      const employee
      of changedEmployees
    ) {
      const currentIds =
        getEmployeeWorkplaceIds(
          employee
        );

      const shouldBeAssigned =
        selectedUserIds.has(
          String(employee.id)
        );

      let nextIds;

      if (shouldBeAssigned) {
        nextIds = [
          ...new Set([
            ...currentIds,
            assigningWorkplaceId,
          ]),
        ];
      } else {
        nextIds =
          currentIds.filter(
            (workplaceId) =>
              workplaceId !==
              assigningWorkplaceId
          );
      }

      const { error } =
        await supabase.rpc(
          "admin_set_user_workplaces",
          {
            p_user_id:
              employee.id,

            p_workplace_ids:
              nextIds,
          }
        );

      if (error) {
        throw new Error(
          `${employee.name || "직원"} 배정 실패: ${error.message}`
        );
      }
    }

    alert(
      "직원 배정이 저장되었습니다."
    );

    closeAssignmentModal();
    await loadData();
  } catch (error) {
    console.error(
      "직원 배정 저장 실패:",
      error
    );

    alert(
      `직원 배정을 저장하지 못했습니다.\n${error.message}`
    );

    await loadData();
  } finally {
    assignSaveBtn.disabled = false;
    assignSaveBtn.textContent =
      "배정 저장";
  }
}

addZoneBtn.addEventListener(
  "click",
  () => openZoneModal()
);

zoneModalCloseBtn.addEventListener(
  "click",
  closeZoneModal
);

zoneModalCancelBtn.addEventListener(
  "click",
  closeZoneModal
);

zoneSaveBtn.addEventListener(
  "click",
  saveWorkplace
);

assignModalCloseBtn.addEventListener(
  "click",
  closeAssignmentModal
);

assignModalCancelBtn.addEventListener(
  "click",
  closeAssignmentModal
);

assignSaveBtn.addEventListener(
  "click",
  saveAssignments
);

selectAllEmployeesBtn.addEventListener(
  "click",
  () => {
    assignEmployeeList
      .querySelectorAll(
        'input[name="assignedEmployee"]'
      )
      .forEach((input) => {
        input.checked = true;
      });

    updateAssignmentCount();
  }
);

clearAllEmployeesBtn.addEventListener(
  "click",
  () => {
    assignEmployeeList
      .querySelectorAll(
        'input[name="assignedEmployee"]'
      )
      .forEach((input) => {
        input.checked = false;
      });

    updateAssignmentCount();
  }
);

zoneSearchInput.addEventListener(
  "input",
  renderWorkplaceTable
);

zoneAddressInput.addEventListener(
  "input",
  renderWorkplaceTable
);

zoneRadiusFilter.addEventListener(
  "change",
  renderWorkplaceTable
);

zoneModal.addEventListener(
  "click",
  (event) => {
    if (event.target === zoneModal) {
      closeZoneModal();
    }
  }
);

assignModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target === assignModal
    ) {
      closeAssignmentModal();
    }
  }
);

async function initPage() {
  const admin =
    await requireAdmin();

  if (!admin) {
    return;
  }

  await loadData();

  zoneAddressSearchBtn.addEventListener(
    "click",
    openZoneAddressSearch
  );

  zoneRadiusInput.addEventListener(
    "input",
    () => {
      if (
        zoneLatInput.value &&
        zoneLngInput.value
      ) {
        updateZoneMap(
          zoneLatInput.value,
          zoneLngInput.value,
          zoneRadiusInput.value
        );
      }
    }
  );
}

initPage();