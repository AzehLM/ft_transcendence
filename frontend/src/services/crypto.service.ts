/**
 * Cryptography Service for Zero-Knowledge Registration
 *  */

import { saveKey, getKey} from "./idb.service";

// ============================================================================
// STEP 1: Generate a random Salt
// ============================================================================
// Why? The salt makes each password unique — even if 2 users have the same
// password, they will have different derived keys.
// Size: 16 bytes = 128 bits (secure for PBKDF2)

export function generateSalt(): Uint8Array {
    const salt = new Uint8Array(16); // Array of 16 unsigned 8-bit integers
    crypto.getRandomValues(salt); // Fills each slot with a random number between 0-255
    return salt;
}

// ============================================================================
// STEP 2: Derive the Master Key via PBKDF2
// ============================================================================
// Why PBKDF2?
// - It's a "Key Derivation Function" (KDF)
// - It takes (password + salt) and creates a cryptographic key
// - It's iterative (can be made slow = harder to brute-force)
//
// Parameters:
// - iterations: 100,000 (modern standard)
// - hash: SHA-256
// - output: 32 bytes = 256 bits (enough for AES-256 and HMAC-SHA256)

export async function deriveMasterKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    // 1. Convert the password string to bytes
    const passwordBuffer = new TextEncoder().encode(password); // Crypto functions work with binary, not text.

    // 2. Transform the bytes into an object (a key) that crypto.subtle can use for PBKDF2
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false, // Cannot extract this key (for security)
        ["deriveKey"] // This key can be used to derive other keys
    );

    // 3. Derive the Master Key
    const masterKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations: 100000, // OWASP 2023 recommendation
            hash: "SHA-256",
        },
        passwordKey,
        { name: "AES-GCM", length: 256 }, // The resulting key must be usable for AES-GCM
        true, // Make it extractable for later use
        ["encrypt", "decrypt"]
    );

    return masterKey;
}

// ============================================================================
// STEP 3: Generate a random RSA-OAEP key pair
// ============================================================================
// Why RSA?
// - Asymmetric = there is a public key (sent to the server)
// - And a private key (kept locally, encrypted)
// - 4096 bits = secure for the next 20 years
//
// Purpose:
// - The public key allows the server to encrypt data for you
// - The private key lets you decrypt ONLY data intended for you

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096, // 4096 bits = very secure
            publicExponent: new Uint8Array([1, 0, 1]), // Standard: 0x10001 (65537)
            hash: "SHA-256",
        },
        true, // extractable (we will export it)
        ["encrypt", "decrypt"]
    );

    return keyPair;
}

// ============================================================================
// STEP 4: Wrap (encrypt) the RSA private key with the Master Key
// ============================================================================
// Why do this?
// - The RSA private key is VERY sensitive
// - We don't store it in plaintext on disk
// - We encrypt it with the Master Key (derived from the password)
// - Result: If someone steals your computer, they only have a useless encrypted blob
//
// Process:
// 1. Export the private key in PKCS8 format (standard format)
// 2. Encrypt it with AES-GCM + Master Key
// 3. Return the encrypted blob

export async function wrapPrivateKey(
    privateKey: CryptoKey,
    masterKey: CryptoKey
): Promise<{
    encryptedPrivateKey: Uint8Array;
    iv: Uint8Array;
}> {
    // 1. Export the private key as raw binary (PKCS8)
    const privateKeyBuffer = await crypto.subtle.exportKey(
        "pkcs8",
        privateKey
    );

    // 2. Generate a random IV for AES-GCM
    // IV = Initialization Vector (must be different for each encryption)
    // Size: 12 bytes (96 bits) = standard for GCM
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    // 3. Encrypt the private key with AES-GCM
    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        masterKey,
        privateKeyBuffer
    );

    // 4. Convert to Uint8Array (the authentication tag is included inside)
    const encryptedPrivateKey = new Uint8Array(encryptedData);

    return {
        encryptedPrivateKey,
        iv,
    };
}

// ============================================================================
// STEP 5: Generate the AuthHash
// ============================================================================
// Why?
// - It's the "proof of knowledge" = proof that we know the password
// - We send it to the server (not the password itself!)
// - The server hashes it with bcrypt and compares it during login
//
// How?
// - HMAC-SHA256(Master_Key, "fixed_string")
// - HMAC = keyed hash, the server can't reproduce it without the Master Key
//
// Note: We export the Master Key in order to hash it

export async function generateAuthHash(
    masterKey: CryptoKey
): Promise<Uint8Array> {
    // 1. Export the Master Key as bytes
    const masterKeyBuffer = await crypto.subtle.exportKey(
        "raw",
        masterKey
    );

    // 2. Create an HMAC key from the Master Key
    const hmacKey = await crypto.subtle.importKey(
        "raw",
        masterKeyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    // 3. Sign the message "auth_string"
    const messageBuffer = new TextEncoder().encode("auth_string");
    const authHashBuffer = await crypto.subtle.sign(
        "HMAC",
        hmacKey,
        messageBuffer
    );

    return new Uint8Array(authHashBuffer);
}

// ============================================================================
// STEP 6: Export the public key to send to the server
// ============================================================================
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

// ============================================================================
// UTILITY: Convert Uint8Array to Base64 for HTTP transmission
// ============================================================================
// Why? HTTP works with text, not binary
// Base64 = binary encoding using text characters

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

// ============================================================================
// MAIN FUNCTION: Orchestrate the entire registration process
// ============================================================================
// This is the function called from RegisterPage.tsx
// It runs steps 1-5 in the correct order

export async function generateRegistrationData(
    email: string,
    password: string
) {

    // STEP 1: Generate Salt
    const salt = generateSalt();

    // STEP 2: Derive Master Key
    const masterKey = await deriveMasterKey(password, salt);

    // STEP 3: Generate RSA key pair
    const keyPair = await generateRSAKeyPair();

    // STEP 4: Wrap the private key
    const wrappedPrivateKey = await wrapPrivateKey(
        keyPair.privateKey,
        masterKey
    );

    // STEP 5: Generate AuthHash
    const authHash = await generateAuthHash(masterKey);

    // STEP 6: Export public key
    const publicKey = await exportPublicKey(keyPair.publicKey);

    // Build the object to send to the server
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

// ============================================================================
// LOGIN FUNCTION: Retrieve the salt and generate the AuthHash for login
// ============================================================================
// Process:
// 1. Send the email to the server to retrieve the salt
// 2. Derive the Master Key with password + salt
// 3. Generate the AuthHash
// 4. Send the AuthHash for verification

export async function generateLoginData(email: string, password: string) {

    // STEP 1: Retrieve the salt from the server
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
            const errorData = await saltResponse.json();
            throw new Error(errorData.message || "Failed to retrieve salt");
        }
    } catch (err: any) {
        console.error("Error when fetching the salt:", err);
        throw err;
    }

    const saltData = await saltResponse.json();
    const salt = base64ToUint8Array(saltData.salt);

    // STEP 2: Derive Master Key
    const masterKey = await deriveMasterKey(password, salt);

    // STEP 3: Generate AuthHash
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


export async function encryptFilename(
    filename: string,
    dek: Uint8Array,
    iv: Uint8Array
): Promise<string> {
    const filenameBuffer = new TextEncoder().encode(filename);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        toArrayBuffer(dek),
        "AES-GCM",
        false,
        ["encrypt"]
    );

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        cryptoKey,
        filenameBuffer
    );

    return uint8ArrayToBase64(new Uint8Array(encryptedBuffer));
}

export async function decryptFilename(
    encryptedFilenameBase64: string,
    dek: Uint8Array,
    iv: Uint8Array
): Promise<string> {
    const encryptedBuffer = base64ToUint8Array(encryptedFilenameBase64);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        toArrayBuffer(dek),
        "AES-GCM",
        false,
        ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        cryptoKey,
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