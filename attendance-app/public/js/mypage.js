/* =========================
  직원 앱 내 정보
  Supabase 연결 전 임시 데이터
========================= */

document.addEventListener("DOMContentLoaded", () => {
  renderMyPage();
  checkLocationPermission();
});

const employeeData = {
  name: "김민준",
  team: "현장팀",
  loginId: "minjun",
  phone: "010-0000-0000",
  joinDate: "2026.07.01",
  status: "활성",
  regions: ["서면 B구역", "해운대 A구역"],
};

function renderMyPage() {
  const employeeName = document.getElementById("employeeName");
  const employeeTeam = document.getElementById("employeeTeam");
  const employeeLoginId = document.getElementById("employeeLoginId");
  const employeePhone = document.getElementById("employeePhone");
  const employeeJoinDate = document.getElementById("employeeJoinDate");
  const regionList = document.getElementById("regionList");
  const employeeStatus = document.querySelector(".employee-status");
  const profileAvatar = document.querySelector(".profile-avatar");

  if (employeeName) employeeName.textContent = employeeData.name;
  if (employeeTeam) employeeTeam.textContent = employeeData.team;
  if (employeeLoginId) employeeLoginId.textContent = employeeData.loginId;
  if (employeePhone) employeePhone.textContent = employeeData.phone;
  if (employeeJoinDate) employeeJoinDate.textContent = employeeData.joinDate;
  if (employeeStatus) employeeStatus.textContent = employeeData.status;
  if (profileAvatar) profileAvatar.textContent = employeeData.name.charAt(0);

  if (regionList) {
    regionList.innerHTML = employeeData.regions
      .map((region) => `<span class="region-chip">${region}</span>`)
      .join("");
  }
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