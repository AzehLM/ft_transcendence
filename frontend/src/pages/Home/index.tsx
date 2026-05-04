function HomePage() {
    return (
        <div>
            <h1>Ft_box</h1>
            <p>We are on the Home page</p>
            <nav style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                <a href="/register" style={{ border: "1px solid black", padding: "4px 8px" }}>Register</a>
                <a href="/login" style={{ border: "1px solid black", padding: "4px 8px" }}>Login</a>
                <a href="/dashboard" style={{ border: "1px solid black", padding: "4px 8px" }}>Dashboard</a>
                <a href="/profile" style={{ border: "1px solid black", padding: "4px 8px" }}>Profile</a>
            </nav>
        </div>
    )
}

export default HomePage