import supabase from "./supabase.js";

import {
  getEmployeeSessionToken,
  getCurrentEmployee,
  logoutEmployee,
} from "./employeeAuth.js";

const employeeName = document.getElementById("employeeName");
const employeeTeam = document.getElementById("employeeTeam");
const employeePhone = document.getElementById("employeePhone");
const employeeJoinDate = document.getElementById("employeeJoinDate");
const employeeAppRole = document.getElementById("employeeAppRole");
const regionList = document.getElementById("regionList");

const editPhoneBtn = document.getElementById("editPhoneBtn");
const infoRequestBtn = document.getElementById("infoRequestBtn");
const locationSettingBtn = document.getElementById("locationSettingBtn");
const locationPermission = document.getElementById("locationPermission");
const notificationToggle = document.getElementById("notificationToggle");
const logoutButton = document.getElementById("logoutButton");

let currentEmployee = null;

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

function formatPhone(phone) {
  const number = normalizePhone(phone);

  if (number.length === 11) {
    return number.replace(
      /(\d{3})(\d{4})(\d{4})/,
      "$1-$2-$3"
    );
  }

  if (number.length === 10) {
    return number.replace(
      /(\d{3})(\d{3})(\d{4})/,
      "$1-$2-$3"
    );
  }

  return phone || "-";
}

function renderProfile(profile) {
  if (employeeName) {
    employeeName.textContent =
      profile.name || "직원";
  }

  if (employeeTeam) {
    employeeTeam.textContent =
      profile.department || "소속 미지정";
  }

  if (employeePhone) {
    employeePhone.textContent =
      formatPhone(profile.phone);
  }

  if (employeeJoinDate) {
    employeeJoinDate.textContent =
      formatDate(profile.created_at);
  }

  if (employeeAppRole) {
    employeeAppRole.textContent =
      profile.app_role === "team_lead"
        ? "팀장"
        : "일반 직원";
  }
}

async function loadMyWorkplaces() {
  const token = getEmployeeSessionToken();

  if (!token || !regionList) return;

  const { data, error } = await supabase.rpc(
    "get_my_workplaces",
    {
      p_session_token: token,
    }
  );

  if (error) {
    console.error(
      "근무지역 조회 오류:",
      error
    );

    regionList.innerHTML = `
      <span class="region-chip empty">
        근무지역 확인 실패
      </span>
    `;

    return;
  }

  if (!data || data.length === 0) {
    regionList.innerHTML = `
      <span class="region-chip empty">
        배정된 근무지역 없음
      </span>
    `;

    return;
  }

  regionList.innerHTML = data
    .map(
      (item) => `
        <span class="region-chip">
          ${item.workplace_name}
        </span>
      `
    )
    .join("");
}

async function submitInfoChangeRequest(
  type,
  title,
  defaultMessage = ""
) {
  const token = getEmployeeSessionToken();

  if (!token) {
    location.replace(
      "../employee/login.html"
    );

    return;
  }

  const content = prompt(
    title,
    defaultMessage
  );

  if (content === null) return;

  const trimmedContent =
    content.trim();

  if (!trimmedContent) {
    alert(
      "요청 내용을 입력해주세요."
    );

    return;
  }

  const { error } = await supabase.rpc(
    "create_employee_request_by_session",
    {
      p_session_token: token,
      p_request_type: type,
      p_title: title,
      p_content: trimmedContent,
    }
  );

  if (error) {
    console.error(
      "정보 변경 요청 오류:",
      error
    );

    alert(
      "요청을 등록하지 못했습니다."
    );

    return;
  }

  alert(
    "관리자에게 변경 요청이 등록되었습니다."
  );
}

function requestPhoneChange() {
  const currentPhone =
    formatPhone(
      currentEmployee?.phone
    );

  submitInfoChangeRequest(
    "phone_change",
    "연락처 변경 요청",
    `현재 연락처: ${currentPhone}\n변경할 연락처: `
  );
}

function requestProfileChange() {
  submitInfoChangeRequest(
    "profile_change",
    "내 정보 변경 요청",
    "변경이 필요한 내용을 입력해주세요.\n예: 근무지역을 서면 B구역으로 변경 요청합니다."
  );
}

function updatePermissionBadge(state) {
  if (!locationPermission) return;

  if (state === "granted") {
    locationPermission.textContent =
      "허용됨";

    locationPermission.className =
      "permission-badge allowed";

    return;
  }

  if (state === "denied") {
    locationPermission.textContent =
      "차단됨";

    locationPermission.className =
      "permission-badge denied";

    return;
  }

  locationPermission.textContent =
    "확인 필요";

  locationPermission.className =
    "permission-badge pending";
}

async function checkLocationPermission() {
  if (!locationPermission) return;

  if (!navigator.permissions) {
    updatePermissionBadge("prompt");
    return;
  }

  try {
    const permission =
      await navigator.permissions.query({
        name: "geolocation",
      });

    updatePermissionBadge(
      permission.state
    );

    permission.addEventListener(
      "change",
      () => {
        updatePermissionBadge(
          permission.state
        );
      }
    );
  } catch (error) {
    console.warn(
      "위치 권한 상태 확인 실패:",
      error
    );

    updatePermissionBadge("prompt");
  }
}

function requestLocationPermission() {
  if (!navigator.geolocation) {
    alert(
      "이 브라우저에서는 위치 기능을 사용할 수 없습니다."
    );

    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => {
      alert(
        "위치 권한이 허용되었습니다."
      );

      checkLocationPermission();
    },

    (error) => {
      console.error(
        "위치 권한 요청 오류:",
        error
      );

      if (
        error.code ===
        error.PERMISSION_DENIED
      ) {
        alert(
          "위치 권한이 차단되었습니다.\n휴대폰 설정에서 위치 권한을 허용해주세요."
        );
      } else {
        alert(
          "현재 위치를 확인하지 못했습니다."
        );
      }

      checkLocationPermission();
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

async function openLocationSettingGuide() {
  if (!navigator.permissions) {
    requestLocationPermission();
    return;
  }

  try {
    const permission =
      await navigator.permissions.query({
        name: "geolocation",
      });

    if (
      permission.state === "prompt"
    ) {
      requestLocationPermission();
      return;
    }

    if (
      permission.state === "granted"
    ) {
      alert(
        "위치 권한이 이미 허용되어 있습니다."
      );

      return;
    }

    alert(
      "위치 권한이 차단되어 있습니다.\n\n" +
      "Android\n" +
      "설정 → 앱 → 사용 중인 브라우저 또는 설치한 앱 → 권한 → 위치\n\n" +
      "iPhone\n" +
      "설정 → 개인정보 보호 및 보안 → 위치 서비스 → Safari 웹 사이트\n\n" +
      "브라우저 보안상 웹에서 휴대폰 설정 화면을 직접 열 수는 없습니다."
    );
  } catch (error) {
    requestLocationPermission();
  }
}

async function initNotificationSetting() {
  if (!notificationToggle) return;

  const savedValue =
    localStorage.getItem(
      "employeeNotificationEnabled"
    );

  notificationToggle.checked =
    savedValue !== "false";

  notificationToggle.addEventListener(
    "change",
    async () => {
      if (
        notificationToggle.checked &&
        typeof Notification !==
          "undefined" &&
        Notification.permission ===
          "default"
      ) {
        const permission =
          await Notification
            .requestPermission();

        if (
          permission !== "granted"
        ) {
          notificationToggle.checked =
            false;
        }
      }

      localStorage.setItem(
        "employeeNotificationEnabled",
        notificationToggle.checked
          ? "true"
          : "false"
      );
    }
  );
}

async function init() {
  currentEmployee =
    await getCurrentEmployee();

  if (!currentEmployee) return;

  renderProfile(
    currentEmployee
  );

  await loadMyWorkplaces();
  await checkLocationPermission();

  editPhoneBtn?.addEventListener(
    "click",
    requestPhoneChange
  );

  infoRequestBtn?.addEventListener(
    "click",
    requestProfileChange
  );

  locationSettingBtn?.addEventListener(
    "click",
    openLocationSettingGuide
  );

  initNotificationSetting();

  logoutButton?.addEventListener(
    "click",
    async () => {
      const confirmed =
        confirm(
          "로그아웃하시겠습니까?"
        );

      if (!confirmed) return;

      await logoutEmployee();
    }
  );
}

init();