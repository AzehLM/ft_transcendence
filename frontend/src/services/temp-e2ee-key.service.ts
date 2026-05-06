let temporaryPrivateKey: CryptoKey | null = null;

export async function setTemporaryPrivateKey(privateKey: CryptoKey): Promise<void> {
    temporaryPrivateKey = privateKey;

    try {
        const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
        sessionStorage.setItem("temporaryPrivateKey", base64);
    } catch (err) {
        console.error("Erreur lors du stockage de la clé temporaire:", err);
    }
}

export async function getTemporaryPrivateKey(): Promise<CryptoKey | null> {
    if (temporaryPrivateKey) {
        return temporaryPrivateKey;
    }

    const base64Key = sessionStorage.getItem("temporaryPrivateKey");
    if (!base64Key) return null;

    try {
        const keyBuffer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
        const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            keyBuffer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["decrypt"]
        );
        temporaryPrivateKey = privateKey; // Mettre en cache
        return privateKey;
    } catch (err) {
        console.error("Erreur lors de la récupération de la clé temporaire:", err);
        return null;
    }
}

export function clearTemporaryPrivateKey(): void {
    temporaryPrivateKey = null;
    sessionStorage.removeItem("temporaryPrivateKey");
}
