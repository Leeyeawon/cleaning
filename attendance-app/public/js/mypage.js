import supabase from "./supabase.js";
import {
  getEmployeeSessionToken,
  getCurrentEmployee,
  logoutEmployee,
} from "./employeeAuth.js";

const employeeName = document.getElementById("employeeName");
const employeeTeam = document.getElementById("employeeTeam");
const employeeLoginId = document.getElementById("employeeLoginId");
const employeePhone = document.getElementById("employeePhone");
const employeeJoinDate = document.getElementById("employeeJoinDate");
const regionList = document.getElementById("regionList");

const employeeStatus = document.querySelector(".employee-status");
const profileAvatar = document.querySelector(".profile-avatar");
const logoutButton = document.querySelector(".logout-button");

const editPhoneBtn = document.getElementById("editPhoneBtn");
const infoRequestBtn = document.getElementById("infoRequestBtn");
const locationSettingBtn = document.getElementById("locationSettingBtn");
const notificationToggle = document.getElementById("notificationToggle");

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
  if (!phone) return "";

  return phone.replaceAll("-", "").replaceAll(" ", "").trim();
}

function formatPhone(phone) {
  const onlyNumber = normalizePhone(phone);

  if (onlyNumber.length !== 11) return phone || "-";

  return `${onlyNumber.slice(0, 3)}-${onlyNumber.slice(3, 7)}-${onlyNumber.slice(7)}`;
}

function formatStatus(status) {
  if (status === "active") return "활성";
  if (status === "pending") return "승인 대기";
  if (status === "inactive") return "비활성";
  if (status === "blocked") return "차단";

  return status || "-";
}

function renderStatus(status) {
  if (!employeeStatus) return;

  employeeStatus.textContent = formatStatus(status);
  employeeStatus.classList.remove("active", "pending", "inactive", "blocked");

  if (status === "active") employeeStatus.classList.add("active");
  if (status === "pending") employeeStatus.classList.add("pending");
  if (status === "inactive") employeeStatus.classList.add("inactive");
  if (status === "blocked") employeeStatus.classList.add("blocked");
}

function renderProfile(profile) {
  const name = profile.name || "직원";

  if (employeeName) employeeName.textContent = name;
  if (employeeTeam) employeeTeam.textContent = "소속 미지정";
  if (employeeLoginId) employeeLoginId.textContent = profile.employee_code || "-";
  if (employeePhone) employeePhone.textContent = formatPhone(profile.phone);
  if (employeeJoinDate) employeeJoinDate.textContent = formatDate(profile.created_at);

  if (profileAvatar) {
    profileAvatar.textContent = name.slice(0, 1);
  }

  renderStatus(profile.status);
}

async function loadMyWorkplaces() {
  const token = getEmployeeSessionToken();

  if (!token || !regionList) return;

  const { data, error } = await supabase.rpc("get_my_workplaces", {
    p_session_token: token,
  });

  if (error) {
    console.error("근무지역 조회 오류:", error);
    regionList.innerHTML = `<span class="region-chip empty">근무지역 확인 실패</span>`;
    return;
  }

  if (!data || data.length === 0) {
    regionList.innerHTML = `<span class="region-chip empty">배정된 근무지역 없음</span>`;
    return;
  }

  regionList.innerHTML = data
    .map((item) => `<span class="region-chip">${item.workplace_name}</span>`)
    .join("");
}

async function submitInfoChangeRequest(type, title, defaultMessage = "") {
  const token = getEmployeeSessionToken();

  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const content = prompt(title, defaultMessage);

  if (content === null) return;

  const trimmedContent = content.trim();

  if (!trimmedContent) {
    alert("요청 내용을 입력해주세요.");
    return;
  }

  const { error } = await supabase.rpc("create_employee_request_by_session", {
    p_session_token: token,
    p_request_type: type,
    p_title: title,
    p_content: trimmedContent,
  });

  if (error) {
    console.error("요청 등록 오류:", error);
    alert("요청을 등록하지 못했습니다.");
    return;
  }

  alert("관리자에게 변경 요청이 등록되었습니다.");
}

function requestPhoneChange() {
  const currentPhone = formatPhone(currentEmployee?.phone);

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

function requestLocationPermission() {
  if (!navigator.geolocation) {
    alert("이 브라우저에서는 위치 기능을 사용할 수 없습니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => {
      alert("위치 권한이 허용되었습니다.");
      checkLocationPermission();
    },
    () => {
      alert("위치 권한이 거부되었거나 위치를 가져올 수 없습니다.");
      checkLocationPermission();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

async function checkLocationPermission() {
  const permissionBadge = document.getElementById("locationPermission");

  if (!permissionBadge) return;

  if (!navigator.permissions) {
    permissionBadge.textContent = "확인 필요";
    permissionBadge.className = "permission-badge denied";
    return;
  }

  try {
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });

    updatePermissionBadge(permission.state);

    permission.addEventListener("change", () => {
      updatePermissionBadge(permission.state);
    });
  } catch (error) {
    permissionBadge.textContent = "확인 필요";
    permissionBadge.className = "permission-badge denied";
  }
}

function updatePermissionBadge(state) {
  const permissionBadge = document.getElementById("locationPermission");

  if (!permissionBadge) return;

  if (state === "granted") {
    permissionBadge.textContent = "허용됨";
    permissionBadge.className = "permission-badge allowed";
    return;
  }

  if (state === "prompt") {
    permissionBadge.textContent = "확인 필요";
    permissionBadge.className = "permission-badge denied";
    return;
  }

  permissionBadge.textContent = "차단됨";
  permissionBadge.className = "permission-badge denied";
}

function initNotificationSetting() {
  if (!notificationToggle) return;

  const savedValue = localStorage.getItem("employeeNotificationEnabled");

  notificationToggle.checked = savedValue !== "false";

  notificationToggle.addEventListener("change", () => {
    localStorage.setItem(
      "employeeNotificationEnabled",
      notificationToggle.checked ? "true" : "false"
    );
  });
}

async function handleLogout() {
  const confirmed = confirm("로그아웃하시겠습니까?");

  if (!confirmed) return;

  await logoutEmployee();
}

async function init() {
  currentEmployee = await getCurrentEmployee();

  if (!currentEmployee) return;

  renderProfile(currentEmployee);
  await loadMyWorkplaces();
  await checkLocationPermission();

  editPhoneBtn?.addEventListener("click", requestPhoneChange);
  infoRequestBtn?.addEventListener("click", requestProfileChange);
  locationSettingBtn?.addEventListener("click", requestLocationPermission);
  logoutButton?.addEventListener("click", handleLogout);

  initNotificationSetting();
}

init();