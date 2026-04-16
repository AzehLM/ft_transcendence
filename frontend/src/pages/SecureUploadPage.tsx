import React, { useState } from 'react';


const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export default function SecureUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5mo

    const handleUpload = async () => {
        if (!file)
            return;
        setIsUploading(true);
        setProgress("Préparation de la cryptographie...");

        try {
            // On génère la Data Encryption Key (DEK) et l'IV de base pour ce fichier
            const dek = window.crypto.getRandomValues(new Uint8Array(32));
            const baseIv = window.crypto.getRandomValues(new Uint8Array(12));

            const cryptoKey = await window.crypto.subtle.importKey(
                "raw", dek, "AES-GCM", false, ["encrypt"]
            );

            // Calcul de la taille finale chiffrée
            // En AES-GCM, chaque morceau chiffré ajoute un "Auth Tag" de 16 octets à la fin.
            const numChunks = Math.ceil(file.size / CHUNK_SIZE);
            const totalEncryptedSize = file.size + (numChunks * 16);

            // 2. DEMANDE D'URL AU BACKEND GO
            setProgress("1/3 : Réservation de l'espace sur le serveur...");
            const initRes = await fetch("/api/files/upload-url", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                // On envoie la taille chiffrée pour que MinIO alloue le bon quota
                body: JSON.stringify({
                    file_size: totalEncryptedSize,
                    folder_id: null,
                    org_id: null
                })
            });

            if (!initRes.ok) throw new Error("Impossible d'obtenir l'URL d'upload");
            const { presigned_url, object_id } = await initRes.json();

            // 3. CRÉATION DU FLUX CHIFFRÉ (STREAMING)
            setProgress("2/3 : Chiffrement et Upload en direct...");

            let offset = 0;
            let chunkIndex = 0;

            const encryptedStream = new ReadableStream({
                async pull(controller) {
                    if (offset >= file.size) {
                        controller.close();
                        return;
                    }

                    const slice = file.slice(offset, offset + CHUNK_SIZE);
                    const buffer = await slice.arrayBuffer();

                    // Sécurité E2EE : On crée un IV unique pour CE morceau en incrémentant l'IV de base
                    const chunkIv = new Uint8Array(12);
                    chunkIv.set(baseIv);
                    const view = new DataView(chunkIv.buffer);
                    // On ajoute l'index du morceau aux 4 derniers octets de l'IV
                    view.setUint32(8, view.getUint32(8) + chunkIndex);

                    // Chiffrement strict du morceau en RAM
                    const encryptedChunk = await window.crypto.subtle.encrypt(
                        { name: "AES-GCM", iv: chunkIv },
                        cryptoKey,
                        buffer
                    );

                    controller.enqueue(new Uint8Array(encryptedChunk));

                    offset += CHUNK_SIZE;
                    chunkIndex++;
                }
            });

            console.log("avant le put")
            // 4. UPLOAD VERS MINIO VIA LE FLUX
            const uploadRes = await fetch(presigned_url, {
                method: "PUT",
                body: encryptedStream,
                // @ts-ignore : Paramètre requis par l'API Fetch pour streamer un Body
                duplex: 'half',
                headers: {
                    "Content-Type": "application/octet-stream"
                }
            });

            console.log("after the put")

            if (!uploadRes.ok)
                throw new Error("MinIO a rejeté le fichier.");

            console.log("wtf")
            // 5. FINALISATION DANS LA BDD GO
            setProgress("3/3 : Finalisation et sauvegarde des clés...");

            // TODO (Plus tard avec ton mate) : Ici on devra chiffrer la variable `dek` avec la clé publique RSA
            // Pour l'instant on simule en l'envoyant directement (Mock)
            const encryptedDEK = dek;

            // Le nom du fichier doit aussi être chiffré, ici on fait un simple base64 pour le MVP
            const encryptedFilename = arrayBufferToBase64(new TextEncoder().encode(file.name));

            const finalizeRes = await fetch("/api/files/finalize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    object_id: object_id,
                    encrypted_filename: encryptedFilename,
                    // En Go, un champ []byte attend du Base64 dans le JSON
                    encrypted_dek: arrayBufferToBase64(encryptedDEK),
                    iv: arrayBufferToBase64(baseIv),
                    org_id: null
                })
            });

            if (!finalizeRes.ok) throw new Error("Erreur lors de la finalisation.");

            setProgress(`✅ Fichier "${file.name}" chiffré et sauvegardé avec succès !`);
            setFile(null); // Reset

        } catch (err: any) {
            console.error(err);
            setProgress("❌ Erreur : " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '600px', margin: 'auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: '#2c3e50' }}>Coffre-fort E2EE - Upload</h2>

            <div style={{
                border: '2px dashed #bdc3c7',
                padding: '30px',
                borderRadius: '10px',
                textAlign: 'center',
                backgroundColor: '#f9f9f9'
            }}>
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                    style={{ marginBottom: '20px' }}
                />

                <br />

                <button
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: (file && !isUploading) ? '#27ae60' : '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (file && !isUploading) ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold'
                    }}
                >
                    {isUploading ? 'Traitement en cours...' : 'Chiffrer et Envoyer'}
                </button>
            </div>

            {progress && (
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#ecf0f1',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    color: progress.includes('❌') ? '#c0392b' : '#2980b9'
                }}>
                    {progress}
                </div>
            )}
        </div>
    );
}