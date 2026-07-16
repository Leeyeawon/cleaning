import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const workplaceSelect =
  document.getElementById(
    "checklistWorkplace"
  );

const checklistList =
  document.getElementById(
    "checklistList"
  );

const customInput =
  document.getElementById(
    "customChecklistInput"
  );

const addItemBtn =
  document.getElementById(
    "addChecklistItemBtn"
  );

const noteInput =
  document.getElementById(
    "checklistNote"
  );

const submitBtn =
  document.getElementById(
    "submitChecklistBtn"
  );

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadChecklistItems() {
  const workplaceId =
    workplaceSelect.value;

  if (!workplaceId) {
    checklistList.innerHTML = `
      <p class="request-empty">
        배정된 현장이 없습니다.
      </p>
    `;

    return;
  }

  checklistList.innerHTML = `
    <p class="request-empty">
      점검 항목을 불러오는 중입니다.
    </p>
  `;

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_cleaning_checklist",
    {
      p_session_token:
        getEmployeeSessionToken(),

      p_workplace_id:
        workplaceId,
    }
  );

  if (error) {
    console.error(
      "청소 점검표 조회 오류:",
      error
    );

    checklistList.innerHTML = `
      <p class="request-empty error">
        점검 항목을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  const items =
    Array.isArray(data)
      ? data
      : [];

  if (items.length === 0) {
    checklistList.innerHTML = `
      <p class="request-empty">
        등록된 점검 항목이 없습니다.<br />
        위에서 개인 점검 항목을 추가할 수 있습니다.
      </p>
    `;

    return;
  }

  checklistList.innerHTML =
    items
      .map(
        (item) => `
          <label class="checklist-row">
            <input
              type="checkbox"
              value="${escapeHtml(item.id)}"
            />

            <span>
              ${escapeHtml(item.label)}
            </span>

            ${
              item.source === "custom"
                ? `<small>개인</small>`
                : ""
            }
          </label>
        `
      )
      .join("");
}

async function loadWorkplaces() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_workplaces",
    {
      p_session_token:
        getEmployeeSessionToken(),
    }
  );

  if (error) {
    console.error(
      "근무지역 조회 오류:",
      error
    );

    alert(
      "배정 현장을 불러오지 못했습니다."
    );

    return;
  }

  const workplaces =
    Array.isArray(data)
      ? data
      : [];

  if (workplaces.length === 0) {
    workplaceSelect.innerHTML = `
      <option value="">
        배정 현장 없음
      </option>
    `;

    await loadChecklistItems();

    return;
  }

  workplaceSelect.innerHTML =
    workplaces
      .map(
        (workplace) => `
          <option value="${escapeHtml(
            workplace.workplace_id
          )}">
            ${escapeHtml(
              workplace.workplace_name
            )}
          </option>
        `
      )
      .join("");

  await loadChecklistItems();
}

async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) return;

  if (
    employee.app_role !==
    "team_lead"
  ) {
    alert(
      "청소 점검표는 팀장만 사용할 수 있습니다."
    );

    location.replace(
      "request.html"
    );

    return;
  }

  workplaceSelect.addEventListener(
    "change",
    loadChecklistItems
  );

  addItemBtn.addEventListener(
    "click",
    async () => {
      const label =
        customInput.value.trim();

      if (!label) {
        alert(
          "추가할 항목을 입력해 주세요."
        );

        return;
      }

      if (!workplaceSelect.value) {
        alert(
          "점검 현장을 먼저 선택해 주세요."
        );

        return;
      }

      addItemBtn.disabled =
        true;

      const {
        error,
      } = await supabase.rpc(
        "add_my_checklist_item",
        {
          p_session_token:
            getEmployeeSessionToken(),

          p_workplace_id:
            workplaceSelect.value,

          p_label:
            label,
        }
      );

      addItemBtn.disabled =
        false;

      if (error) {
        console.error(
          "개인 점검 항목 추가 오류:",
          error
        );

        alert(
          "점검 항목을 추가하지 못했습니다."
        );

        return;
      }

      customInput.value = "";

      await loadChecklistItems();
    }
  );

  submitBtn.addEventListener(
    "click",
    async () => {
      if (!workplaceSelect.value) {
        alert(
          "점검 현장을 선택해 주세요."
        );

        return;
      }

      const checklistResults = [
        ...checklistList
          .querySelectorAll(
            'input[type="checkbox"]'
          ),
      ].map((input) => {
        const row =
          input.closest(
            ".checklist-row"
          );

        const label =
          row
            ?.querySelector("span")
            ?.textContent
            .trim() ||
          "항목명 없음";

        return {
          id: input.value,
          label,
          checked:
            input.checked,
        };
      });

      const completedCount =
        checklistResults.filter(
          (item) => item.checked
        ).length;

      if (completedCount === 0) {
        const confirmed = confirm(
          "완료한 점검 항목이 없습니다.\n그래도 제출하시겠습니까?"
        );

        if (!confirmed) {
          return;
        }
      }

      submitBtn.disabled =
        true;

      submitBtn.textContent =
        "점검표 제출 중...";

      const {
        error,
      } = await supabase.rpc(
        "submit_cleaning_checklist",
        {
          p_session_token:
            getEmployeeSessionToken(),

          p_workplace_id:
            workplaceSelect.value,

          p_checked_items:
            checklistResults,

          p_note:
            noteInput.value.trim(),
        }
      );

      submitBtn.disabled =
        false;

      submitBtn.textContent =
        "점검 완료 제출";

      if (error) {
        console.error(
          "청소 점검표 제출 오류:",
          error
        );

        alert(
          "점검표를 제출하지 못했습니다."
        );

        return;
      }

      alert(
        "청소 점검표가 제출되었습니다."
      );

      location.replace(
        "request.html"
      );
    }
  );

  await loadWorkplaces();
}

init();