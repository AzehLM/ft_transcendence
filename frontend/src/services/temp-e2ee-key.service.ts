let temporaryPrivateKey: CryptoKey | null = null;

export function setTemporaryPrivateKey(privateKey: CryptoKey): void {
    temporaryPrivateKey = privateKey;
}

export function getTemporaryPrivateKey(): CryptoKey | null {
    return temporaryPrivateKey;
}

export function clearTemporaryPrivateKey(): void {
    temporaryPrivateKey = null;
}
