export function logout(navigate: (path: string) => void) {
  localStorage.removeItem("token");
  sessionStorage.removeItem("privateKey");
  sessionStorage.removeItem("publicKey");
  navigate("/login");
}