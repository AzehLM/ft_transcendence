/**
 * Service de Cryptographie pour l'Registration Zero-Knowledge
 */

// ============================================================================
// ÉTAPE 1: Générer un Salt aléatoire
// ============================================================================
// Pourquoi? Le salt rend chaque mot de passe unique, même si 2 utilisateurs
// ont le même mot de passe, ils auront des derives différents.
// Taille: 16 bytes = 128 bits (sécurisé pour PBKDF2)

export function generateSalt(): Uint8Array {
    const salt = new Uint8Array(16); // Un tableau d'entiers (de 16 cases) unsigned de 8 bits
    crypto.getRandomValues(salt); // Elle prend le tableau salt et remplace chaque 0 par un nombre aléatoire entre 0-255
    return salt;
}

// ============================================================================
// ÉTAPE 2: Dériver la Master Key via PBKDF2
// ============================================================================
// Pourquoi PBKDF2?
// - C'est une "Key Derivation Function" (KDF)
// - Elle prend (mot de passe + salt) et crée une clé cryptographique
// - Elle est iterative (on peut la rendre lente = plus dur à brute-force)
//
// Paramètres:
// - iterations: 100,000 (standard moderne)
// - hash: SHA-256
// - output: 32 bytes = 256 bits (assez pour AES-256 et HMAC-SHA256)

export async function deriveMasterKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    // 1. Convertir le mot de passe string en bytes
    const passwordBuffer = new TextEncoder().encode(password); // Les fonctions crypto travaillent avec du binaire, pas du texte.

    // 2.  Transformer les bytes en un objet (une clé) que crypto.subtle peut utiliser pour PBKDF2
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false, // On peut PAS extraire cette clé (pour la sécurité)
        ["deriveKey"] // Cette clé peut servir à dériver d'autres clés
    );

    // 3. Dériver la Master Key
    const masterKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000, // Recos de OWASP 2023
            hash: "SHA-256", // Utiliser SHA-256 pour les iterations
        },
        passwordKey,
        { name: "AES-GCM", length: 256 }, // La clé résultante doit être utilisable pour AES-GCM
        true, // On la rend extractable pour la suite
        ["encrypt", "decrypt"]
    );

    return masterKey;
}

// ============================================================================
// ÉTAPE 3: Générer une paire de clés RSA-OAEP random
// ============================================================================
// Pourquoi RSA?
// - Asymétrique = il y a une clé publique (on l'envoie au serveur)
// - Et une clé privée (on la garde, chiffrée)
// - 4096 bits = sécurisé pour les 20 prochaines années
//
// Utilité:
// - La clé publique permet au serveur de chiffrer des données pour toi
// - La clé privée te permet de déchiffrer SEULEMENT les données qui te sont destinées

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096, // 4096 bits = très sécurisé
            publicExponent: new Uint8Array([1, 0, 1]), // Standard: 0x10001 (65537)
            hash: "SHA-256",
        },
        true, // extractable (on va l'exporter)
        ["encrypt", "decrypt"] // On va l'utiliser pour encryption
    );

    return keyPair;
}

// ============================================================================
// ÉTAPE 4: Envelopper (chiffrer) la clé privée RSA avec la Master Key
// ============================================================================
// Pourquoi faire ça?
// - La clé privée RSA est TRÈS sensible
// - On ne la stocke pas en clair sur ton disque
// - On la chiffre avec la Master Key (qui vient du mot de passe)
// - Résultat: Si quelqu'un vole ton computer, il a juste du blob chiffré inutile
//
// Processus:
// 1. Exporter la clé privée en format PKCS8 (format standard)
// 2. La chiffrer avec AES-GCM + Master Key
// 3. Retourner le blob chiffré

export async function wrapPrivateKey(
    privateKey: CryptoKey,
    masterKey: CryptoKey
): Promise<{
    encryptedPrivateKey: Uint8Array;
    iv: Uint8Array;
    tag: Uint8Array;
}> {
    // 1. Exporter la clé privée en raw binary (PKCS8)
    const privateKeyBuffer = await crypto.subtle.exportKey(
        "pkcs8",
        privateKey
    );

    // 2. Générer un IV aléatoire pour AES-GCM
    // IV = Initialization Vector (doit être différent pour chaque chiffrement)
    // Taille: 12 bytes (96 bits) = standard pour GCM
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    // 3. Chiffrer la clé privée avec AES-GCM
    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        masterKey,
        privateKeyBuffer
    );

    // 4. Récupérer le tag d'authentification (derniers 16 bytes)
    // Le tag prouve que les données n'ont pas été modifiées
    const encryptedArray = new Uint8Array(encryptedData);
    const tag = encryptedArray.slice(-16); // Derniers 16 bytes
    const encryptedPrivateKey = encryptedArray.slice(0, -16); // Tout sauf le tag

    return {
        encryptedPrivateKey,
        iv,
        tag,
    };
}

// ============================================================================
// ÉTAPE 5: Générer l'AuthHash
// ============================================================================
// Pourquoi?
// - C'est la "proof of knowledge" = preuve qu'on connaît le mot de passe
// - On l'envoie au serveur (pas le mot de passe!)
// - Le serveur le hash avec bcrypt et le compare lors de la login
//
// Comment?
// - HMAC-SHA256(Master_Key, "fixed_string")
// - HMAC = keyed hash, le serveur peut pas le reproduire sans la Master Key
//
// Note: On va extraire la Master Key pour pouvoir la hacher

export async function generateAuthHash(
    masterKey: CryptoKey
): Promise<Uint8Array> {
    // 1. Extraire la Master Key en bytes
    const masterKeyBuffer = await crypto.subtle.exportKey(
        "raw",
        masterKey
    );

    // 2. Créer une clé HMAC à partir de la Master Key
    const hmacKey = await crypto.subtle.importKey(
        "raw",
        masterKeyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    // 3. Signer le message "fixed_string"
    const messageBuffer = new TextEncoder().encode("auth_string");
    const authHashBuffer = await crypto.subtle.sign(
        "HMAC",
        hmacKey,
        messageBuffer
    );

    return new Uint8Array(authHashBuffer);
}

// ============================================================================
// ÉTAPE 6: Exporter la clé publique pour l'envoyer au serveur
// ============================================================================
// Format: SPKI = SubjectPublicKeyInfo (format standard)

export async function exportPublicKey(
    publicKey: CryptoKey
): Promise<Uint8Array> {
    const publicKeyBuffer = await crypto.subtle.exportKey(
        "spki",
        publicKey
    );

    return new Uint8Array(publicKeyBuffer);
}

// ============================================================================
// UTILITAIRE: Convertir Uint8Array en Base64 pour l'envoi HTTP
// ============================================================================
// Pourquoi? HTTP fonctionne avec du texte, pas du binaire
// Base64 = encodage binaire en caractères texte

export function uint8ArrayToBase64(arr: Uint8Array): string {
    return btoa(String.fromCharCode(...Array.from(arr)));
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
// FONCTION PRINCIPALE: Orchestrer tout le processus
// ============================================================================
// C'est la fonction qu'on appellera depuis RegisterPage.tsx
// Elle fait les étapes 1-5 dans le bon ordre

export async function generateRegistrationData(
    email: string,
    password: string
) {
    console.log("🔐 Démarrage du processus d'enregistrement cryptographique...");

    // ÉTAPE 1: Générer Salt
    console.log("1️⃣ Génération du Salt...");
    const salt = generateSalt();

    // ÉTAPE 2: Dériver Master Key
    console.log("2️⃣ Dérivation de la Master Key...");
    const masterKey = await deriveMasterKey(password, salt);

    // ÉTAPE 3: Générer paire RSA
    console.log("3️⃣ Génération de la paire RSA-OAEP...");
    const keyPair = await generateRSAKeyPair();

    // ÉTAPE 4: Envelopper la clé privée
    console.log("4️⃣ Enveloppe de la clé privée (AES-GCM)...");
    const wrappedPrivateKey = await wrapPrivateKey(
        keyPair.privateKey,
        masterKey
    );

    // ÉTAPE 5: Générer AuthHash
    console.log("5️⃣ Génération de l'AuthHash...");
    const authHash = await generateAuthHash(masterKey);

    // ÉTAPE 6: Exporter clé publique
    console.log("6️⃣ Export de la clé publique...");
    const publicKey = await exportPublicKey(keyPair.publicKey);

    // Créer l'objet à envoyer au serveur
    const registrationData = {
        email,
        salt_1: uint8ArrayToBase64(salt),
        auth_hash: uint8ArrayToBase64(authHash),
        public_key: uint8ArrayToBase64(publicKey),
        encrypted_private_key: uint8ArrayToBase64(wrappedPrivateKey.encryptedPrivateKey),
        iv: uint8ArrayToBase64(wrappedPrivateKey.iv),
        tag: uint8ArrayToBase64(wrappedPrivateKey.tag),
        
    };

    console.log("✅ Données de registration générées:", registrationData);

    return registrationData;
}
