import supabase from "./supabase.js";

/**
 * 현재 로그인한 관리자를 조회합니다.
 * 로그인하지 않았거나 관리자 권한이 없으면 null을 반환합니다.
 */
export async function getCurrentAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_users")
    .select(`
      id,
      name,
      role,
      status,
      created_at
    `)
    .eq("id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (adminError) {
    console.error("관리자 정보 조회 실패:", adminError);
    return null;
  }

  if (!adminProfile) {
    return null;
  }

  return {
    ...adminProfile,
    email: user.email || "",
  };
}

/**
 * 관리자 페이지 접근 검사
 */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (admin) {
    return admin;
  }

  await supabase.auth.signOut();

  location.replace("./login.html");

  return null;
}

/**
 * 관리자 로그아웃
 */
export async function logoutAdmin() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("관리자 로그아웃 실패:", error);
    alert("로그아웃 처리 중 오류가 발생했습니다.");
    return;
  }

  location.replace("./login.html");
}