import React, { useState } from 'react';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (folderName: string) => Promise<void>;
}

export function CreateFolderModal({ isOpen, onClose, onSubmit }: CreateFolderModalProps) {
    const [folderName, setFolderName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!folderName.trim()) {
            setError("Le nom du dossier ne peut pas être vide.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            await onSubmit(folderName.trim());
            setFolderName("");
            onClose();
        } catch (err: any) {
            setError(err.message || "Erreur lors de la création du dossier");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white', padding: '24px', borderRadius: '8px',
                width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#2c3e50' }}>Nouveau dossier</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Nom du dossier"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        autoFocus
                        disabled={isLoading}
                        style={{
                            width: '100%', padding: '10px', marginBottom: '16px',
                            border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box'
                        }}
                    />

                    {error && <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: 0 }}>{error}</p>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            style={{ padding: '8px 16px', border: '1px solid #ccc', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{ padding: '8px 16px', border: 'none', background: '#3498db', color: 'white', borderRadius: '4px', cursor: isLoading ? 'not-allowed' : 'pointer' }}
                        >
                            {isLoading ? 'Création...' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}