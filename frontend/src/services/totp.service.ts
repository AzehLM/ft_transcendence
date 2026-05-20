import { fetchWithRefresh } from "./api.service";


export async function generateTOTPSecret() {
    const response = await fetchWithRefresh("/api/auth/2fa/totp/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate TOTP secret");
    }

    return response.json();
}


export async function verifyTOTPSetup(code: string) {
    const response = await fetchWithRefresh("/api/auth/2fa/totp/verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify TOTP code");
    }

    return response.json();
}


export async function verifyTOTPLogin(code: string, tempToken: string) {
    const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid TOTP code");
    }

    return response.json();
}


export async function verifyRecoveryCode(code: string, tempToken: string) {
    const response = await fetch("/api/auth/2fa/recovery-code", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid recovery code");
    }

    return response.json();
}


export async function getRecoveryCodesStatus() {
    const response = await fetchWithRefresh(
        "/api/auth/2fa/recovery-codes",
        {
            method: "GET",
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to get recovery codes status");
    }

    return response.json();
}

export async function disableTwoFactor(password: string) {
    const response = await fetchWithRefresh("/api/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to disable 2FA");
    }

    return response.json();
}
