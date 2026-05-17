export async function logout(navigate: (path: string) => void) {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    localStorage.removeItem("token");
    sessionStorage.removeItem("privateKey");
    sessionStorage.removeItem("publicKey");

    navigate("/login");
  }
}