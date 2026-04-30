export function logout(navigate: (path: string) => void) {
  localStorage.removeItem("token");
  sessionStorage.removeItem("privateKey");
  navigate("/login");
}