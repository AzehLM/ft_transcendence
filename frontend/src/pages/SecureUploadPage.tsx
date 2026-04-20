import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    generateRSAKeyPair,
    encryptDEKWithPublicKey,
    uint8ArrayToBase64
} from '../services/crypto.service';
import { setTemporaryPrivateKey } from '../services/temp-e2ee-key.service';

export default function TestUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [lastFileId, setLastFileId] = useState("");
    const navigate = useNavigate();

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 Mo

    const startTestUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setStatus("Initialisation du chiffrement...");
        setLastFileId("");

        const token = localStorage.getItem("token");
        if (!token) {
            setStatus("❌ Session expirée. Reconnecte-toi.");
            setIsUploading(false);
            navigate("/login");
            return;
        }

        try {
            // 1. CLÉ PUBLIQUE TEMPORAIRE (EN ATTENDANT LE STOCKAGE PERSISTANT)
            // Flux final attendu:
            // const b64PubKey = sessionStorage.getItem("public_key");
            // if (!b64PubKey) throw new Error("Clé publique absente du sessionStorage. Connectez-vous d'abord.");
            // const publicKey = await importPublicKey(b64PubKey);
// 1. GÉNÉRATION D'UN COUPLE DE CLÉS TEMPORAIRES (Pour le test)
            // On remplace temporairement l'utilisation du sessionStorage
            setStatus("Génération des clés de test...");
            const temporaryKeyPair = await window.crypto.subtle.generateKey(
                { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
                true, ["encrypt", "decrypt"]
            );

            // On stocke la clé privée en RAM pour que SecureDownloadPage puisse la récupérer !
            setTemporaryPrivateKey(temporaryKeyPair.privateKey);

            // On utilise la clé publique temporaire pour chiffrer la DEK
            const publicKey = temporaryKeyPair.publicKey;

            // 2. GÉNÉRATION DES SECRETS DU FICHIER (DEK & IV)
            const dek = window.crypto.getRandomValues(new Uint8Array(32)); // AES-256
            const baseIv = window.crypto.getRandomValues(new Uint8Array(12)); // IV pour GCM

            const cryptoKey = await window.crypto.subtle.importKey(
                "raw", dek, "AES-GCM", false, ["encrypt"]
            );

            // 3. CHIFFREMENT DE LA CLÉ AES (DEK) AVEC RSA-OAEP
            // C'est ici que le Zero-Knowledge opère : le serveur ne verra jamais la DEK en clair.
            const encryptedDEK = await encryptDEKWithPublicKey(dek, publicKey);

            // 4. DEMANDE D'URL AU BACKEND GO
            setStatus("Étape 1/3 : Réservation de l'Upload...");
            const numChunks = Math.ceil(file.size / CHUNK_SIZE);
            const totalEncryptedSize = file.size + (numChunks * 16); // +16 octets de tag GCM par chunk

            const initRes = await fetch("/api/files/upload-url", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    file_size: totalEncryptedSize,
                    folder_id: null,
                    org_id: null
                })
            });

            if (!initRes.ok) throw new Error("Échec de l'obtention de la Presigned URL");
            const { presigned_url, object_id } = await initRes.json();

// 5. UPLOAD CHIFFRÉ VERS MINIO (Mode Blob avec Content-Length strict)
            setStatus("Étape 2/3 : Chiffrement et envoi vers MinIO...");
            let offset = 0;
            let chunkIndex = 0;
            const encryptedChunks = []; // On stocke les blocs chiffrés en RAM pour le test

            while (offset < file.size) {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                const buffer = await slice.arrayBuffer();

                const chunkIv = new Uint8Array(12);
                chunkIv.set(baseIv);
                const view = new DataView(chunkIv.buffer);
                view.setUint32(8, view.getUint32(8) + chunkIndex);

                const encryptedChunk = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: chunkIv },
                    cryptoKey,
                    buffer
                );

                encryptedChunks.push(new Uint8Array(encryptedChunk));
                offset += CHUNK_SIZE;
                chunkIndex++;
            }

            // On fusionne tous les blocs en un seul fichier virtuel (Blob)
            const finalBlob = new Blob(encryptedChunks, { type: "application/octet-stream" });
            console.log(`Taille finale exacte envoyée à MinIO : ${finalBlob.size} octets`);

            const uploadRes = await fetch(presigned_url, {
                method: "PUT",
                body: finalBlob
                // On retire duplex: 'half' car on n'utilise plus de stream direct
            });

            if (!uploadRes.ok) throw new Error("L'upload vers MinIO a échoué");
            // 6. FINALISATION (ENVOI DES MÉTADONNÉES CHIFFRÉES) [cite: 1, 2, 4]
            setStatus("Étape 3/3 : Finalisation en base de données...");

            const finalizeRes = await fetch("/api/files/finalize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    object_id: object_id,
                    // Nom de fichier encodé (à chiffrer en AES plus tard pour plus de secret)
                    encrypted_filename: uint8ArrayToBase64(new TextEncoder().encode(file.name)),
                    // Envoi de la DEK chiffrée par RSA et de l'IV de base
                    encrypted_dek: uint8ArrayToBase64(encryptedDEK),
                    iv: uint8ArrayToBase64(baseIv),
                    org_id: null
                })
            });

            if (!finalizeRes.ok) {
                throw new Error("La finalisation a échoué côté Backend");
            }

            const finalizeData = await finalizeRes.json();
            const fileId = finalizeData.file_id as string | undefined;
            if (!fileId) {
                throw new Error("Réponse invalide: file_id manquant");
            }

            setLastFileId(fileId);
            setStatus(`✅ Upload réussi. file_id: ${fileId}`);

        } catch (err: any) {
            setStatus(`❌ Erreur : ${err.message}`);
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace' }}>
            <h1>🛠 Page de Test Upload E2EE</h1>
            <div style={{ border: '1px solid #ccc', padding: '20px', background: '#f4f4f4' }}>
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                />
                <button
                    onClick={startTestUpload}
                    disabled={!file || isUploading}
                    style={{ marginLeft: '10px', padding: '5px 15px' }}
                >
                    {isUploading ? "Upload en cours..." : "Lancer le Test"}
                </button>
            </div>
            <div style={{ marginTop: '20px', fontWeight: 'bold', color: '#333' }}>
                Statut : {status}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => navigate(lastFileId ? `/download?fileId=${encodeURIComponent(lastFileId)}` : '/download')}
                    style={{ padding: '6px 12px', border: '1px solid #333', background: '#fff', cursor: 'pointer' }}
                >
                    Aller à Download
                </button>
                {lastFileId && (
                    <span style={{ fontSize: '13px', color: '#333' }}>
                        Dernier file_id: {lastFileId}
                    </span>
                )}
            </div>
        </div>
    );
}