import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    generateRSAKeyPair,
    encryptDEKWithPublicKey,
    uint8ArrayToBase64,
    // importPublicKey // À décommenter pour la prod
} from '../services/crypto.service';
import { setTemporaryPrivateKey } from '../services/temp-e2ee-key.service';

interface UploadUrlResponse {
    presigned_url: string;
    object_id: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 Mo

export default function SecureUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>("");
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [lastFileId, setLastFileId] = useState<string>("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const handleUpload = async () => {
        if (!file)
            return;

        const token = localStorage.getItem("token");
        if (!token) {
            setStatus("❌ Session expirée. Reconnecte-toi.");
            navigate("/login");
            return;
        }

        setIsUploading(true);
        setStatus("1/4 : Initialisation de la cryptographie Zero-Knowledge...");
        setLastFileId("");

        try {
            // ====================================================================
            // ÉTAPE 1 : RÉCUPÉRATION DE LA CLÉ PUBLIQUE (RSA)
            // ====================================================================

            // [PROD : SESSION STORAGE]
            /*
            const b64PubKey = sessionStorage.getItem("public_key");
            if (!b64PubKey)
                throw new Error("Clé publique introuvable. Veuillez vous reconnecter.");
            const publicKey = await importPublicKey(b64PubKey);
            */

            // [DEV] Génération d'une clé temporaire pour les tests actuels
            const temporaryKeyPair = await window.crypto.subtle.generateKey(
                { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
                true, ["encrypt", "decrypt"]
            );
            setTemporaryPrivateKey(temporaryKeyPair.privateKey); // Sauvegarde en RAM pour le Download
            const publicKey = temporaryKeyPair.publicKey;

            // ====================================================================
            // ÉTAPE 2 : GÉNÉRATION DES CLÉS DU FICHIER (AES-GCM)
            // ====================================================================
            // Pourquoi AES-GCM ? C'est le standard de l'industrie. Il chiffre les données
            // ET vérifie leur intégrité (grâce à un "Auth Tag" de 16 octets ajouté à la fin).
            const dek = window.crypto.getRandomValues(new Uint8Array(32)); // Data Encryption Key (256-bit)
            const baseIv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization Vector (96-bit)

            const cryptoKey = await window.crypto.subtle.importKey(
                "raw", dek, "AES-GCM", false, ["encrypt"]
            );

            // Chiffrement de la clé AES (DEK) avec la clé RSA publique de l'utilisateur.
            const encryptedDEK = await encryptDEKWithPublicKey(dek, publicKey);

            // ====================================================================
            // ÉTAPE 3 : RÉSERVATION DE L'ESPACE SUR LE SERVEUR (API)
            // ====================================================================
            setStatus("2/4 : Demande d'autorisation au serveur...");

            // Calcul de la taille finale : Fichier original + 16 octets d'Auth Tag par bloc chiffré
            const numChunks = Math.ceil(file.size / CHUNK_SIZE);
            const totalEncryptedSize = file.size + (numChunks * 16);

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

            if (!initRes.ok)
                throw new Error(`Erreur Backend (${initRes.status}) : Impossible de préparer l'upload`);
            const { presigned_url, object_id }: UploadUrlResponse = await initRes.json();

            // ====================================================================
            // ÉTAPE 4 : CHIFFREMENT PAR BLOCS ET ENVOI À MINIO (S3)
            // ====================================================================
            setStatus("3/4 : Chiffrement et transfert vers le coffre-fort...");

            let offset = 0;
            let chunkIndex = 0;
            const encryptedChunks: Uint8Array[] = [];

            // Découpage du fichier en morceaux pour ne pas saturer la RAM (sauf lors du Blob final)
            while (offset < file.size) {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                const buffer = await slice.arrayBuffer();

                // Sécurité GCM : L'IV doit être unique pour chaque bloc. On l'incrémente mathématiquement.
                const chunkIv = new Uint8Array(12);
                chunkIv.set(baseIv);
                const view = new DataView(chunkIv.buffer);
                view.setUint32(8, view.getUint32(8) + chunkIndex);

                // Chiffrement du bloc
                const encryptedChunk = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: chunkIv },
                    cryptoKey,
                    buffer
                );

                encryptedChunks.push(new Uint8Array(encryptedChunk));
                offset += CHUNK_SIZE;
                chunkIndex++;
            }

            // Assemblage final.
            // Pourquoi un Blob ? MinIO (S3) exige l'en-tête HTTP 'Content-Length' exact.
            // L'objet Blob calcule automatiquement cette taille pour le navigateur avant le fetch.
            const finalBlob = new Blob(encryptedChunks as BlobPart[], { type: "application/octet-stream" });
            const uploadRes = await fetch(presigned_url, {
                method: "PUT",
                body: finalBlob
            });

            if (!uploadRes.ok) {
                const s3Error = await uploadRes.text();
                throw new Error(`MinIO a rejeté le fichier : ${s3Error}`);
            }

            // ====================================================================
            // ÉTAPE 5 : FINALISATION ET MÉTADONNÉES (API)
            // ====================================================================
            setStatus("4/4 : Enregistrement sécurisé en base de données...");

            const finalizeRes = await fetch("/api/files/finalize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    object_id: object_id,
                    // TODO (Optionnel) : Remplacer l'encodage base64 par un vrai chiffrement AES du nom de fichier
                    encrypted_filename: uint8ArrayToBase64(new TextEncoder().encode(file.name)),
                    encrypted_dek: uint8ArrayToBase64(encryptedDEK),
                    iv: uint8ArrayToBase64(baseIv),
                    org_id: null
                })
            });

            if (!finalizeRes.ok)
                throw new Error("Le serveur a échoué lors de la finalisation.");

            const { file_id } = await finalizeRes.json();
            // Fin de la procédure
            setStatus("✅ Succès ! Votre fichier est protégé par chiffrement de bout en bout.");
            setLastFileId(file_id);

        } catch (err: any) {
            console.error("Erreur d'upload sécurisé :", err);
            setStatus(`❌ ${err.message}`);
        } finally {
            setIsUploading(false);
            // On vide l'input file pour permettre d'uploader le même fichier consécutivement si besoin
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
                🛡️ Upload Sécurisé (E2EE)
            </h1>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', background: '#f8f9fa', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        disabled={isUploading}
                        style={{ padding: '10px', background: '#fff', border: '1px dashed #bdc3c7', borderRadius: '4px' }}
                    />

                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: (file && !isUploading) ? '#27ae60' : '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (file && !isUploading) ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold',
                            transition: 'background-color 0.3s ease'
                        }}
                    >
                        {isUploading ? "Chiffrement et envoi en cours..." : "Chiffrer et Envoyer"}
                    </button>
                </div>
            </div>

            {/* Zone de notification / statut */}
            {status && (
                <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '6px',
                    fontWeight: '500',
                    backgroundColor: status.includes('❌') ? '#fdecea' : '#e8f5e9',
                    color: status.includes('❌') ? '#c0392b' : '#2e7d32',
                    border: `1px solid ${status.includes('❌') ? '#fadbd8' : '#c8e6c9'}`
                }}>
                    {status}
                </div>
            )}

            {/* Zone de redirection vers le téléchargement */}
            {lastFileId && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#7f8c8d' }}>
                        ID du fichier (UUID) : <code style={{ background: '#ecf0f1', padding: '2px 6px', borderRadius: '4px' }}>{lastFileId}</code>
                    </p>
                    <button
                        onClick={() => navigate(`/download?fileId=${encodeURIComponent(lastFileId)}`)}
                        style={{ padding: '8px 16px', border: '1px solid #34495e', background: 'transparent', color: '#34495e', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Tester le Téléchargement →
                    </button>
                </div>
            )}
        </div>
    );
}