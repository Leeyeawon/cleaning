const { data: { user } } = await supabase.auth.getUser();

const { data: profile } = await supabase
  .from("users")
  .select("status")
  .eq("id", user.id)
  .single();

if (profile.status === "active") {
  location.href = "/employee/index.html";
} else if (profile.status === "pending") {
  location.href = "/employee/pending.html";
} else {
  location.href = "/employee/blocked.html";
}