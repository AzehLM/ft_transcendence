export default function NotFoundPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <h1>404</h1>
      <p>Page not found.</p>
      <a href="/dashboard">Go back to dashboard</a>
    </div>
  );
}