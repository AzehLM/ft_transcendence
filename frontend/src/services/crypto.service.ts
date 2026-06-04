import { saveKey, getKey} from "./idb.service";


export function generateSalt(): Uint8Array {
    const salt = new Uint8Array(16); // Array of 16 unsigned 8-bit integers
    crypto.getRandomValues(salt); // Fills each slot with a random number between 0-255
    return salt;
}

// Parameters:
// - iterations: 100,000 (modern standard)
// - hash: SHA-256
// - output: 32 bytes = 256 bits (enough for AES-256 and HMAC-SHA256)

export async function deriveMasterKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    const passwordBuffer = new TextEncoder().encode(password);

    const passwordKey = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const masterKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations: 100000, // OWASP 2023 recommendation
            hash: "SHA-256",
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    return masterKey;
}


// - The public key allows the server to encrypt data for you
// - The private key lets you decrypt ONLY data intended for you

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]), // Standard: 0x10001 (65537)
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    return keyPair;
}


// 1. Export the private key in PKCS8 format
// 2. Encrypt it with AES-GCM + Master Key
// 3. Return the encrypted blob

export async function wrapPrivateKey(
    privateKey: CryptoKey,
    masterKey: CryptoKey
): Promise<{
    encryptedPrivateKey: Uint8Array;
    iv: Uint8Array;
}> {
    const privateKeyBuffer = await crypto.subtle.exportKey(
        "pkcs8",
        privateKey
    );


    // Size: 12 bytes (96 bits) = standard for GCM
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        masterKey,
        privateKeyBuffer
    );

    const encryptedPrivateKey = new Uint8Array(encryptedData);

    return {
        encryptedPrivateKey,
        iv,
    };
}


// - HMAC-SHA256(Master_Key, "fixed_string")
// - HMAC = keyed hash, the server can't reproduce it without the Master Key

export async function generateAuthHash(
    masterKey: CryptoKey
): Promise<Uint8Array> {
    const masterKeyBuffer = await crypto.subtle.exportKey(
        "raw",
        masterKey
    );

    const hmacKey = await crypto.subtle.importKey(
        "raw",
        masterKeyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const messageBuffer = new TextEncoder().encode("auth_string");
    const authHashBuffer = await crypto.subtle.sign(
        "HMAC",
        hmacKey,
        messageBuffer
    );

    return new Uint8Array(authHashBuffer);
}

// Format: SPKI = SubjectPublicKeyInfo (standard format)

export async function exportPublicKey(
    publicKey: CryptoKey
): Promise<Uint8Array> {
    const publicKeyBuffer = await crypto.subtle.exportKey(
        "spki",
        publicKey
    );

    return new Uint8Array(publicKeyBuffer);
}

export async function encryptDEKWithPublicKey(
    dek: Uint8Array,
    publicKey: CryptoKey
): Promise<Uint8Array> {
    const encryptedDek = await crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        toArrayBuffer(dek)
    );

    return new Uint8Array(encryptedDek);
}



export function uint8ArrayToBase64(arr: Uint8Array): string {
    const chunkSize = 8192; // Process 8KB at a time
    let binaryString = '';

    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        binaryString += String.fromCharCode(...chunk);
    }

    return btoa(binaryString);
}

export function base64ToUint8Array(str: string): Uint8Array {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}


export async function generateRegistrationData(
    email: string,
    password: string
) {

    const salt = generateSalt();

    const masterKey = await deriveMasterKey(password, salt);

    const keyPair = await generateRSAKeyPair();

    const wrappedPrivateKey = await wrapPrivateKey(
        keyPair.privateKey,
        masterKey
    );

    const authHash = await generateAuthHash(masterKey);

    const publicKey = await exportPublicKey(keyPair.publicKey);

    const registrationData = {
        email,
        salt: uint8ArrayToBase64(salt),
        auth_hash: uint8ArrayToBase64(authHash),
        public_key: uint8ArrayToBase64(publicKey),
        encrypted_private_key: uint8ArrayToBase64(wrappedPrivateKey.encryptedPrivateKey),
        iv: uint8ArrayToBase64(wrappedPrivateKey.iv),
    };


    return registrationData;
}


// 1. Send the email to the server to retrieve the salt
// 2. Derive the Master Key with password + salt
// 3. Generate the AuthHash
// 4. Send the AuthHash for verification

export async function generateLoginData(email: string, password: string) {

    let saltResponse;
    try {
        saltResponse = await fetch("/api/auth/salt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        if (!saltResponse.ok) {
            if (saltResponse.status === 502 || saltResponse.status === 503) {
                throw new Error("Network error, please try again later.");
            }
             const errorData = await saltResponse.json().catch(() => null);
             throw new Error(errorData?.message || "Failed to retrieve salt");
        }
    } catch (err: any) {
        console.error("Error when fetching the salt:", err);
        throw err;
    }

    const saltData = await saltResponse.json();
    const salt = base64ToUint8Array(saltData.salt);

    const masterKey = await deriveMasterKey(password, salt);

    const authHash = await generateAuthHash(masterKey);

    const loginData = {
        email,
        auth_hash: uint8ArrayToBase64(authHash),
    };


    return { masterKey, loginData };
}

// unwrap private key

export function toArrayBuffer(data: ArrayBuffer | Uint8Array | number[]): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;

  if (data instanceof Uint8Array) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  }

  if (!data.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
    throw new Error("toArrayBuffer: number[] contains invalid byte values (expected 0-255)");
  }

  return new Uint8Array(data).buffer;
}

export async function unwrapPrivateKey(
    encryptedPrivateKey: Uint8Array,
    masterKey: CryptoKey,
    iv: Uint8Array,
    extractable: boolean = false
): Promise<CryptoKey> {

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        masterKey,
        toArrayBuffer(encryptedPrivateKey)
    );

    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        decryptedBuffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        extractable,
        ["decrypt"]
    );

    return privateKey;
}

export async function storePrivateKey(privateKey: CryptoKey) {
  await saveKey("privateKey", privateKey);
}

export async function getPrivateKeyFromSession(): Promise<CryptoKey | null> {
    return await getKey("privateKey");
}


export async function getPublicKeyFromSession(): Promise<CryptoKey | null> {
    return await getKey("publicKey");
}

export async function storePublicKey(publicKey: CryptoKey) {
    await saveKey("publicKey", publicKey);
}
export async function decryptDEKWithPrivateKey(
    encryptedDek: Uint8Array,
    privateKey: CryptoKey
): Promise<Uint8Array> {
    const decryptedDek = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        toArrayBuffer(encryptedDek)
    );

    return new Uint8Array(decryptedDek);
}




export async function encryptFilenameAsymmetric(
    filename: string,
    publicKey: CryptoKey
): Promise<string> {
    const filenameBuffer = new TextEncoder().encode(filename);
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        filenameBuffer
    );
    return uint8ArrayToBase64(new Uint8Array(encryptedBuffer));
}

export async function decryptFilenameAsymmetric(
    encryptedFilenameBase64: string,
    privateKey: CryptoKey
): Promise<string> {
    const encryptedBuffer = base64ToUint8Array(encryptedFilenameBase64);
    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privateKey,
        toArrayBuffer(encryptedBuffer)
    );
    return new TextDecoder().decode(decryptedBuffer);
}

export async function generateChangePasswordData(
    password: string,
    privateKey: CryptoKey,
) {

    const salt = generateSalt();

    const masterKey = await deriveMasterKey(password, salt);

    const wrappedPrivateKey = await wrapPrivateKey(
        privateKey,
        masterKey
    );

    const authHash = await generateAuthHash(masterKey);

    const passwordData = {
        new_client_salt: uint8ArrayToBase64(salt),
        new_auth_hash: uint8ArrayToBase64(authHash),
        new_encrypted_private_key: uint8ArrayToBase64(wrappedPrivateKey.encryptedPrivateKey),
        new_iv: uint8ArrayToBase64(wrappedPrivateKey.iv),
    };

    return passwordData;
}