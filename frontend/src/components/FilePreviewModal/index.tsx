import { useEffect, useState, useRef } from "react";
import {
    X,
    Download,
    AlertTriangle,
    Loader2,
    FileText,
    FileImage,
    FileCode,
    File,
    FileVideo,
    FileSpreadsheet,
    FileArchive
} from "lucide-react";
import { useE2EEPreview } from "../../hooks/useE2EEPreview";
import styles from "./FilePreviewModal.module.css";

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileId: string;
    fileName: string;
    fileSize: number;
    orgId?: string;
}

const getFileIconAndColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
        return { Icon: FileImage, color: "#ec4899" };
    }
    if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'mpeg'].includes(ext)) {
        return { Icon: FileVideo, color: "#8b5cf6" };
    }
    if (['pdf'].includes(ext)) {
        return { Icon: FileText, color: "#ef4444" };
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
        return { Icon: FileSpreadsheet, color: "#10b981" };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return { Icon: FileArchive, color: "#f59e0b" };
    }
    if (['json', 'js', 'ts', 'tsx', 'html', 'css', 'go', 'py', 'sh', 'yaml', 'yml'].includes(ext)) {
        return { Icon: FileCode, color: "#06b6d4" };
    }
    if (['txt', 'md', 'rtf'].includes(ext)) {
        return { Icon: FileText, color: "#3b82f6" };
    }
    return { Icon: File, color: "#865142" };
};

export function FilePreviewModal({
    isOpen,
    onClose,
    fileId,
    fileName,
    fileSize,
    orgId
}: FilePreviewModalProps) {
    const { decryptForPreview, downloadStatus, isDownloading, downloadError } = useE2EEPreview();
    const [blob, setBlob] = useState<Blob | null>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [textContent, setTextContent] = useState<string>("");
    const [isTextLoading, setIsTextLoading] = useState(false);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
            setObjectUrl(null);
            setBlob(null);
            setTextContent("");
            return;
        }

        let isMounted = true;
        const controller = new AbortController();

        const loadPreview = async () => {
            try {
                const result = await decryptForPreview(fileId, orgId, controller.signal);
                if (result && isMounted) {
                    setBlob(result.blob);
                    const url = URL.createObjectURL(result.blob);
                    objectUrlRef.current = url;
                    setObjectUrl(url);

                    const type = result.blob.type;
                    if (type.startsWith("text/") || type === "application/json") {
                        setIsTextLoading(true);
                        try {
                            const text = await result.blob.text();
                            if (isMounted) {
                                setTextContent(text);
                            }
                        } catch (textErr) {
                            console.error("Error reading decrypted text content:", textErr);
                        } finally {
                            if (isMounted) {
                                setIsTextLoading(false);
                            }
                        }
                    }
                }
            } catch (err) {
                if ((err as any)?.name === 'AbortError') {
                    return;
                }
                console.error("Error setting up preview:", err);
            }
        };

        loadPreview();

        return () => {
            isMounted = false;
            controller.abort();
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [isOpen, fileId, orgId]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const handleDownloadInstant = () => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isImage = blob?.type.startsWith("image/");
    const isPDF = blob?.type === "application/pdf";
    const isText = blob?.type.startsWith("text/") || blob?.type === "application/json";

    const { Icon, color } = getFileIconAndColor(fileName);

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.fileInfo}>
                        <div className={styles.iconContainer} style={{ color }}>
                            <Icon size={22} />
                        </div>
                        <div className={styles.meta}>
                            <h3 className={styles.fileName} title={fileName}>{fileName}</h3>
                            <span className={styles.fileSize}>{formatSize(fileSize)}</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        {blob && (
                            <button
                                className={styles.actionButton}
                                onClick={handleDownloadInstant}
                                title="Download decrypted file"
                            >
                                <Download size={18} />
                                <span className={styles.actionText}>Download</span>
                            </button>
                        )}
                        <button className={styles.closeButton} onClick={onClose} title="Close Preview">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Viewport Content */}
                <div className={styles.viewport}>
                    {isDownloading && (
                        <div className={styles.loadingContainer}>
                            <Loader2 className={styles.spinner} size={40} />
                            <p className={styles.statusText}>{downloadStatus || "Preparing decryption..."}</p>
                            <p className={styles.subStatusText}>All decryption happens securely in your browser.</p>
                        </div>
                    )}

                    {downloadError && (
                        <div className={styles.errorContainer}>
                            <AlertTriangle size={48} className={styles.errorIcon} />
                            <h4 className={styles.errorTitle}>Preview Failed</h4>
                            <p className={styles.errorMessage}>{downloadStatus || "We couldn't decrypt this file."}</p>
                            <div className={styles.errorActions}>
                                <button className={styles.retryButton} onClick={onClose}>Close</button>
                            </div>
                        </div>
                    )}

                    {!isDownloading && !downloadError && blob && (
                        <div className={styles.previewContainer}>
                            {isImage && objectUrl && (
                                <div className={styles.imageWrapper}>
                                    <img src={objectUrl} alt={fileName} className={styles.previewImage} />
                                </div>
                            )}

                            {isPDF && objectUrl && (
                                <iframe
                                    src={`${objectUrl}#toolbar=1`}
                                    className={styles.pdfViewer}
                                    title={fileName}
                                />
                            )}

                            {isText && (
                                <div className={styles.textWrapper}>
                                    {isTextLoading ? (
                                        <div className={styles.textLoadingContainer}>
                                            <Loader2 className={styles.textSpinner} size={24} />
                                            <p className={styles.textStatus}>Reading text content...</p>
                                        </div>
                                    ) : (
                                        <pre className={styles.textPre}>
                                            <code>{textContent}</code>
                                        </pre>
                                    )}
                                </div>
                            )}

                            {!isImage && !isPDF && !isText && (
                                <div className={styles.fallbackContainer}>
                                    <File size={64} className={styles.fallbackIcon} />
                                    <h4 className={styles.fallbackTitle}>No Preview Available</h4>
                                    <p className={styles.fallbackMessage}>
                                        We don't support previewing {fileName.split('.').pop()?.toUpperCase() || 'this type of'} files directly.
                                    </p>
                                    <button className={styles.fallbackDownloadButton} onClick={handleDownloadInstant}>
                                        <Download size={16} />
                                        Download Decrypted File
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
