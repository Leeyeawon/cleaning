import supabase from "./supabase.js";

const workplaceTableBody = document.getElementById("workplaceTableBody");
const btnSaveWorkplace = document.getElementById("btnSaveWorkplace");

// 1. 근무지 목록 및 배정 직원수 조회
async function loadWorkplaces() {
  const { data, error } = await supabase
    .from("workplaces")
    .select(`
      *,
      workplace_users(count)
    `);

  if (error) return console.error(error);

  workplaceTableBody.innerHTML = data.map(wp => `
    <tr>
      <td><strong>${wp.name}</strong></td>
      <td>${wp.address || "-"}</td>
      <td>${wp.radius_m}m</td>
      <td>${wp.workplace_users[0]?.count || 0}명</td>
      <td>
        <button class="table-action-btn" onclick="assignEmployees('${wp.id}')">배정</button>
        <button class="table-action-btn" style="color:red" onclick="deleteWorkplace('${wp.id}')">삭제</button>
      </td>
    </tr>
  `).join("");
}

// 2. 근무지 등록/저장 로직
btnSaveWorkplace?.addEventListener("click", async () => {
  const name = document.getElementById("wpName").value;
  const address = document.getElementById("wpAddress").value;
  const lat = document.getElementById("wpLat").value;
  const lng = document.getElementById("wpLng").value;
  const radius = document.getElementById("wpRadius").value;

  const { error } = await supabase.from("workplaces").insert({
    name, address, latitude: lat, longitude: lng, radius_m: radius
  });

  if (!error) {
    alert("등록 완료");
    loadWorkplaces();
  }
});

// 3. 근무지 삭제
window.deleteWorkplace = async (id) => {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  await supabase.from("workplaces").delete().eq("id", id);
  loadWorkplaces();
};

// 4. 직원 배정 창 (추후 직원 선택 모달 호출로 연결)
window.assignEmployees = (wpId) => {
  alert("해당 근무지에 배정할 직원을 선택하는 모달창을 띄웁니다.");
  // 여기에 별도의 직원 선택 모달 호출 로직을 넣으시면 됩니다.
};

loadWorkplaces();// 페이지 로드 시 실행