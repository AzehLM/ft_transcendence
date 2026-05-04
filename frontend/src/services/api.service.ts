export async function fetchWithRefresh(url: string, options: RequestInit = {}) {
    let token = localStorage.getItem("token") || "";

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        const refreshResponse = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include", // cookie HttpOnly
        });

                const text = await refreshResponse.text();
                let data: any;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { error: text || "Invalid JSON" };
                }

                if (!refreshResponse.ok) {
                    console.error("Error backend:", data);
                }

        if (!refreshResponse.ok) {
            throw new Error("Session Expired, cannot refresh token");
        }

        token = data.access_token;

        localStorage.setItem("token", token);

        const newHeaders = {
            ...options.headers,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        response = await fetch(url, { ...options, headers: newHeaders });
    }

    return response;
}