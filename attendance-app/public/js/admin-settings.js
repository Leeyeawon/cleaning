/* 로그아웃 */
import { logoutAdmin } from "./adminAuth.js";

/* 설정 페이지 */

const settingsNavItems = document.querySelectorAll(".settings-nav-item");
const settingsSections = document.querySelectorAll(".settings-section");
const saveAllSettingsBtn = document.getElementById("saveAllSettingsBtn");
const logoutBtn = document.getElementById("logoutBtn");

function changeSettingsTab(target) {
  settingsNavItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.target === target);
  });

  settingsSections.forEach((section) => {
    section.classList.toggle("active", section.id === `settings-${target}`);
  });
}

function getSettingsData() {
  return {
    basic: {
      serviceName: document.getElementById("serviceNameInput")?.value,
      companyName: document.getElementById("companyNameInput")?.value,
      companyPhone: document.getElementById("companyPhoneInput")?.value,
      companyEmail: document.getElementById("companyEmailInput")?.value,
      defaultStartTime: document.getElementById("defaultStartTimeInput")?.value,
      defaultEndTime: document.getElementById("defaultEndTimeInput")?.value,
    },
    attendance: {
      lateStandard: document.getElementById("lateStandardInput")?.value,
      checkInOpen: document.getElementById("checkInOpenInput")?.value,
      checkOutOpen: document.getElementById("checkOutOpenInput")?.value,
      missingCheckOut: document.getElementById("missingCheckOutInput")?.value,
    },
    location: {
      locationUse: document.getElementById("locationUseInput")?.value,
      defaultRadius: document.getElementById("defaultRadiusInput")?.value,
      outsideCheckIn: document.getElementById("outsideCheckInInput")?.value,
      gpsError: document.getElementById("gpsErrorInput")?.value,
      locationGuide: document.getElementById("locationGuideInput")?.value,
    },
    notification: {
      absentAlert: document.getElementById("absentAlertInput")?.checked,
      lateAlert: document.getElementById("lateAlertInput")?.checked,
      locationAlert: document.getElementById("locationAlertInput")?.checked,
      editRequestAlert: document.getElementById("editRequestAlertInput")?.checked,
    },
    admin: {
      adminName: document.getElementById("adminNameInput")?.value,
      adminEmail: document.getElementById("adminEmailInput")?.value,
      adminRole: document.getElementById("adminRoleInput")?.value,
    },
    data: {
      recordKeep: document.getElementById("recordKeepInput")?.value,
      editHistory: document.getElementById("editHistoryInput")?.value,
      excelPermission: document.getElementById("excelPermissionInput")?.value,
      phoneVisible: document.getElementById("phoneVisibleInput")?.value,
    },
  };
}

function saveSettings() {
  const settingsData = getSettingsData();

  localStorage.setItem("adminSettings", JSON.stringify(settingsData));

  alert("설정이 저장되었습니다. Supabase 연결 후에는 DB에 저장되도록 변경하면 됩니다.");
}

function loadSettings() {
  const savedSettings = localStorage.getItem("adminSettings");

  if (!savedSettings) return;

  const settingsData = JSON.parse(savedSettings);

  if (settingsData.basic) {
    document.getElementById("serviceNameInput").value = settingsData.basic.serviceName || "";
    document.getElementById("companyNameInput").value = settingsData.basic.companyName || "";
    document.getElementById("companyPhoneInput").value = settingsData.basic.companyPhone || "";
    document.getElementById("companyEmailInput").value = settingsData.basic.companyEmail || "";
    document.getElementById("defaultStartTimeInput").value = settingsData.basic.defaultStartTime || "09:00";
    document.getElementById("defaultEndTimeInput").value = settingsData.basic.defaultEndTime || "18:00";
  }

  if (settingsData.attendance) {
    document.getElementById("lateStandardInput").value = settingsData.attendance.lateStandard || "0";
    document.getElementById("checkInOpenInput").value = settingsData.attendance.checkInOpen || "30";
    document.getElementById("checkOutOpenInput").value = settingsData.attendance.checkOutOpen || "30";
    document.getElementById("missingCheckOutInput").value = settingsData.attendance.missingCheckOut || "2";
  }

  if (settingsData.location) {
    document.getElementById("locationUseInput").value = settingsData.location.locationUse || "on";
    document.getElementById("defaultRadiusInput").value = settingsData.location.defaultRadius || "100";
    document.getElementById("outsideCheckInInput").value = settingsData.location.outsideCheckIn || "deny";
    document.getElementById("gpsErrorInput").value = settingsData.location.gpsError || "request";
    document.getElementById("locationGuideInput").value =
      settingsData.location.locationGuide || "정확한 출퇴근 처리를 위해 위치 권한을 허용해 주세요.";
  }

  if (settingsData.notification) {
    document.getElementById("absentAlertInput").checked = !!settingsData.notification.absentAlert;
    document.getElementById("lateAlertInput").checked = !!settingsData.notification.lateAlert;
    document.getElementById("locationAlertInput").checked = !!settingsData.notification.locationAlert;
    document.getElementById("editRequestAlertInput").checked =
      !!settingsData.notification.editRequestAlert;
  }

  if (settingsData.admin) {
    document.getElementById("adminNameInput").value = settingsData.admin.adminName || "";
    document.getElementById("adminEmailInput").value = settingsData.admin.adminEmail || "";
    document.getElementById("adminRoleInput").value = settingsData.admin.adminRole || "owner";
  }

  if (settingsData.data) {
    document.getElementById("recordKeepInput").value = settingsData.data.recordKeep || "12";
    document.getElementById("editHistoryInput").value = settingsData.data.editHistory || "on";
    document.getElementById("excelPermissionInput").value =
      settingsData.data.excelPermission || "admin";
    document.getElementById("phoneVisibleInput").value = settingsData.data.phoneVisible || "full";
  }
}

function initSettingsPage() {
  loadSettings();

  settingsNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      changeSettingsTab(item.dataset.target);
    });
  });

  if (saveAllSettingsBtn) {
    saveAllSettingsBtn.addEventListener("click", saveSettings);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirmed = confirm(
        "관리자 계정에서 로그아웃하시겠습니까?"
      );

      if (!confirmed) return;

      logoutBtn.disabled = true;
      logoutBtn.textContent = "로그아웃 중...";

      await logoutAdmin();
    });
  }
}

initSettingsPage();