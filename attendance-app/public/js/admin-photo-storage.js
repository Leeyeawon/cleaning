import supabase from "./supabase.js";

import {
  requireAdmin,
} from "./adminAuth.js";

const statusBadge =
  document.getElementById(
    "photoStorageStatusBadge"
  );

const usedElement =
  document.getElementById(
    "photoStorageUsed"
  );

const limitElement =
  document.getElementById(
    "photoStorageLimit"
  );

const progressBar =
  document.getElementById(
    "photoStorageProgressBar"
  );

const percentElement =
  document.getElementById(
    "photoStoragePercent"
  );

const fileCountElement =
  document.getElementById(
    "photoStorageFileCount"
  );

const expiredCountElement =
  document.getElementById(
    "photoStorageExpiredCount"
  );

const remainingElement =
  document.getElementById(
    "photoStorageRemaining"
  );

const oldestElement =
  document.getElementById(
    "photoStorageOldest"
  );

const refreshButton =
  document.getElementById(
    "refreshPhotoStorageBtn"
  );

const cleanupButton =
  document.getElementById(
    "cleanupExpiredPhotosBtn"
  );

const openDeleteButton =
  document.getElementById(
    "openDeleteAllPhotosBtn"
  );

const deleteModal =
  document.getElementById(
    "deleteAllPhotosModal"
  );

const confirmationInput =
  document.getElementById(
    "deleteAllPhotosConfirmInput"
  );

const confirmDeleteButton =
  document.getElementById(
    "confirmDeleteAllPhotosBtn"
  );

let currentStatus = null;


function formatBytes(bytes) {
  const value =
    Number(bytes || 0);

  if (
    value >=
    1024 * 1024 * 1024
  ) {
    return `${(
      value /
      1024 /
      1024 /
      1024
    ).toFixed(2)}GB`;
  }

  if (
    value >=
    1024 * 1024
  ) {
    return `${(
      value /
      1024 /
      1024
    ).toFixed(1)}MB`;
  }

  if (value >= 1024) {
    return `${(
      value / 1024
    ).toFixed(1)}KB`;
  }

  return `${value}B`;
}


function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "ko-KR",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}


function setLoadingState(
  isLoading
) {
  refreshButton.disabled =
    isLoading;

  cleanupButton.disabled =
    isLoading;

  openDeleteButton.disabled =
    isLoading;
}


function renderStatus(status) {
  currentStatus = status;

  const usedBytes =
    Number(
      status.used_bytes || 0
    );

  const limitBytes =
    Number(
      status.limit_bytes ||
      838860800
    );

  const remainingBytes =
    Number(
      status.remaining_bytes ||
      0
    );

  const fileCount =
    Number(
      status.file_count || 0
    );

  const expiredCount =
    Number(
      status.expired_count || 0
    );

  const percentage =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          status.usage_percent ||
          (
            usedBytes /
            limitBytes
          ) * 100 ||
          0
        )
      )
    );

  usedElement.textContent =
    formatBytes(usedBytes);

  limitElement.textContent =
    formatBytes(limitBytes);

  remainingElement.textContent =
    formatBytes(
      remainingBytes
    );

  percentElement.textContent =
    `${percentage.toFixed(1)}%`;

  fileCountElement.textContent =
    `${fileCount.toLocaleString()}장`;

  expiredCountElement.textContent =
    `${expiredCount.toLocaleString()}장`;

  progressBar.style.width =
    `${percentage}%`;

  progressBar.classList.toggle(
    "warning",
    percentage >= 75 &&
      percentage < 90
  );

  progressBar.classList.toggle(
    "danger",
    percentage >= 90
  );

  statusBadge.className =
    "photo-storage-badge";

  if (
    status.is_upload_blocked ||
    percentage >= 100
  ) {
    statusBadge.textContent =
      "업로드 중단";

    statusBadge.classList.add(
      "danger"
    );
  } else if (
    percentage >= 90
  ) {
    statusBadge.textContent =
      "공간 부족";

    statusBadge.classList.add(
      "danger"
    );
  } else if (
    percentage >= 75
  ) {
    statusBadge.textContent =
      "정리 권장";

    statusBadge.classList.add(
      "warning"
    );
  } else {
    statusBadge.textContent =
      "정상";

    statusBadge.classList.add(
      "normal"
    );
  }

  oldestElement.textContent =
    status.oldest_photo_at
      ? `가장 오래된 사진: ${formatDate(
          status.oldest_photo_at
        )}`
      : "저장된 사진이 없습니다.";

  cleanupButton.disabled =
    expiredCount === 0;

  cleanupButton.textContent =
    expiredCount > 0
      ? `1년 지난 사진 정리 (${expiredCount.toLocaleString()}장)`
      : "1년 지난 사진 없음";

  openDeleteButton.disabled =
    fileCount === 0;
}


async function loadStatus() {
  setLoadingState(true);

  statusBadge.textContent =
    "확인 중";

  statusBadge.className =
    "photo-storage-badge";

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_get_photo_storage_status"
    );

    if (error) {
      throw error;
    }

    renderStatus(data);
  } catch (error) {
    console.error(
      "사진 사용량 조회 실패:",
      error
    );

    statusBadge.textContent =
      "조회 실패";

    statusBadge.classList.add(
      "danger"
    );

    alert(
      "사진 저장공간을 불러오지 못했습니다."
    );
  } finally {
    setLoadingState(false);

    if (currentStatus) {
      renderStatus(
        currentStatus
      );
    }
  }
}


async function readFunctionError(
  error
) {
  try {
    if (
      error?.context instanceof
      Response
    ) {
      const payload =
        await error.context
          .clone()
          .json();

      return (
        payload.message ||
        "사진 관리 작업에 실패했습니다."
      );
    }
  } catch (readError) {
    console.error(
      "함수 오류 확인 실패:",
      readError
    );
  }

  return (
    error?.message ||
    "사진 관리 작업에 실패했습니다."
  );
}


async function invokeManager(
  body
) {
  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        "manage-employee-photos",
        {
          body,
        }
      );

  if (error) {
    throw new Error(
      await readFunctionError(
        error
      )
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.message ||
      "사진 관리 작업에 실패했습니다."
    );
  }

  return data;
}


async function runDeletion(
  action,
  confirmation = null
) {
  let totalDeleted = 0;
  let hasMore = true;
  let requestCount = 0;

  while (
    hasMore &&
    requestCount < 20
  ) {
    requestCount += 1;

    const result =
      await invokeManager({
        action,
        confirmation,
      });

    totalDeleted +=
      Number(
        result.deleted_count ||
        0
      );

    hasMore =
      result.has_more ===
      true;

    if (action === "delete_all") {
      confirmDeleteButton.textContent =
        `${totalDeleted.toLocaleString()}장 삭제 중...`;
    } else {
      cleanupButton.textContent =
        `${totalDeleted.toLocaleString()}장 정리 중...`;
    }
  }

  if (hasMore) {
    throw new Error(
      "정리할 사진이 많이 남아 있습니다. 잠시 후 다시 실행해 주세요."
    );
  }

  return totalDeleted;
}


async function cleanupExpiredPhotos() {
  const expiredCount =
    Number(
      currentStatus
        ?.expired_count || 0
    );

  if (expiredCount <= 0) {
    alert(
      "1년이 지난 사진이 없습니다."
    );

    return;
  }

  const confirmed =
    confirm(
      `1년이 지난 사진 ${expiredCount.toLocaleString()}장을 삭제할까요?\n\n삭제된 사진은 복구할 수 없습니다.`
    );

  if (!confirmed) {
    return;
  }

  setLoadingState(true);

  cleanupButton.textContent =
    "사진 정리 중...";

  try {
    const deletedCount =
      await runDeletion(
        "cleanup_expired"
      );

    alert(
      `${deletedCount.toLocaleString()}장의 오래된 사진을 정리했습니다.`
    );

    await loadStatus();
  } catch (error) {
    console.error(
      "오래된 사진 정리 실패:",
      error
    );

    alert(
      error.message ||
      "사진을 정리하지 못했습니다."
    );
  } finally {
    setLoadingState(false);
  }
}


function openDeleteModal() {
  if (
    Number(
      currentStatus
        ?.file_count || 0
    ) <= 0
  ) {
    alert(
      "삭제할 사진이 없습니다."
    );

    return;
  }

  confirmationInput.value =
    "";

  confirmDeleteButton.disabled =
    true;

  confirmDeleteButton.textContent =
    "사진 전체 삭제";

  deleteModal.hidden = false;

  document.body.style.overflow =
    "hidden";

  setTimeout(
    () => {
      confirmationInput.focus();
    },
    50
  );
}


function closeDeleteModal() {
  deleteModal.hidden = true;

  confirmationInput.value =
    "";

  confirmDeleteButton.disabled =
    true;

  document.body.style.overflow =
    "";
}


async function deleteAllPhotos() {
  if (
    confirmationInput.value
      .trim() !==
    "사진 전체 삭제"
  ) {
    alert(
      "'사진 전체 삭제'를 정확히 입력해 주세요."
    );

    return;
  }

  const finalConfirmed =
    confirm(
      "모든 업로드 사진을 영구 삭제합니다.\n정말 계속할까요?"
    );

  if (!finalConfirmed) {
    return;
  }

  confirmDeleteButton.disabled =
    true;

  confirmDeleteButton.textContent =
    "삭제 준비 중...";

  try {
    const deletedCount =
      await runDeletion(
        "delete_all",
        "사진 전체 삭제"
      );

    closeDeleteModal();

    alert(
      `${deletedCount.toLocaleString()}장의 사진을 모두 삭제했습니다.\n요청과 점검표 기록은 유지됩니다.`
    );

    await loadStatus();
  } catch (error) {
    console.error(
      "전체 사진 삭제 실패:",
      error
    );

    alert(
      error.message ||
      "사진을 삭제하지 못했습니다."
    );

    confirmDeleteButton.disabled =
      false;

    confirmDeleteButton.textContent =
      "사진 전체 삭제";
  }
}


async function init() {
  const isAdmin =
    await requireAdmin();

  if (!isAdmin) {
    return;
  }

  refreshButton.addEventListener(
    "click",
    loadStatus
  );

  cleanupButton.addEventListener(
    "click",
    cleanupExpiredPhotos
  );

  openDeleteButton.addEventListener(
    "click",
    openDeleteModal
  );

  confirmationInput.addEventListener(
    "input",
    () => {
      confirmDeleteButton.disabled =
        confirmationInput.value
          .trim() !==
        "사진 전체 삭제";
    }
  );

  confirmDeleteButton.addEventListener(
    "click",
    deleteAllPhotos
  );

  document
    .querySelectorAll(
      "[data-close-photo-modal]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          closeDeleteModal
        );
      }
    );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
          "Escape" &&
        !deleteModal.hidden
      ) {
        closeDeleteModal();
      }
    }
  );

  await loadStatus();
}


init();