import { useEffect, useState, useRef } from "react";
import {
    X,
    Download,
    AlertTriangle,
    Loader2,
    File,
    FileVideo,
} from "lucide-react";
import { useE2EEPreview } from "../../hooks/useE2EEPreview";
import styles from "./FilePreviewModal.module.css";
import { formatFileSize, getDecryptedSize } from "../../services/fileValidation.service";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolvePreview, MAX_VIDEO_PREVIEW_BYTES } from '../../config/previewType';
import { getFileVisual } from "../../config/fileIcon";

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileId: string;
    fileName: string;
    fileSize: number;
    orgId?: string;
    onDownload?: () => void;
}

export function FilePreviewModal({
    isOpen,
    onClose,
    fileId,
    fileName,
    fileSize,
    orgId,
    onDownload
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
            if (resolvePreview(fileName).kind === 'video'
                && getDecryptedSize(fileSize) > MAX_VIDEO_PREVIEW_BYTES) {
                return;
            }
            try {
                const result = await decryptForPreview(fileId, orgId, controller.signal);
                if (result && isMounted) {
                    setBlob(result.blob);
                    const url = URL.createObjectURL(result.blob);
                    objectUrlRef.current = url;
                    setObjectUrl(url);

                    const { kind: resolvedKind } = resolvePreview(fileName);
                    if (resolvedKind === 'text' || resolvedKind === 'code' || resolvedKind === 'markdown') {
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

    const { kind } = resolvePreview(fileName);
    const { Icon, color } = getFileVisual(fileName);
    const decryptedSize = getDecryptedSize(fileSize);
    const videoTooLarge = kind === 'video' && decryptedSize > MAX_VIDEO_PREVIEW_BYTES;

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
                            <span className={styles.fileSize}>{formatFileSize(blob ? blob.size : getDecryptedSize(fileSize))}</span>
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

                    {!isDownloading && !downloadError && videoTooLarge && (
                        <div className={styles.fallbackContainer}>
                            <FileVideo size={64} className={styles.fallbackIcon} />
                            <h4 className={styles.fallbackTitle}>Video too large to preview</h4>
                            <p className={styles.fallbackMessage}>
                                This video is {formatFileSize(decryptedSize)}. In-browser preview is capped at{' '}
                                {formatFileSize(MAX_VIDEO_PREVIEW_BYTES)} to keep memory usage safe.
                                Downloading it streams directly to disk.
                            </p>
                            <button
                                className={styles.fallbackDownloadButton}
                                onClick={() => { onDownload?.(); onClose(); }}
                            >
                                <Download size={16} /> Download instead
                            </button>
                        </div>
                    )}
                    {!isDownloading && !downloadError && blob && (
                        <div className={styles.previewContainer}>
                            {kind === 'image' && objectUrl && (
                                <div className={styles.imageWrapper}>
                                    <img src={objectUrl} alt={fileName} className={styles.previewImage} />
                                </div>
                            )}

                            {kind === 'pdf' && objectUrl && (
                                <iframe src={`${objectUrl}#toolbar=1`} className={styles.pdfViewer} title={fileName} />
                            )}

                            {kind === 'audio' && objectUrl && (
                                <div className={styles.mediaWrapper}>
                                    <audio controls src={objectUrl} className={styles.audioPlayer} />
                                </div>
                            )}

                            {kind === 'video' && objectUrl && (
                                <div className={styles.mediaWrapper}>
                                    <video controls src={objectUrl} className={styles.videoPlayer} />
                                </div>
                            )}

                            {(kind === 'text' || kind === 'code') && (
                                <div className={styles.textWrapper}>
                                    {isTextLoading ? (
                                        <div className={styles.textLoadingContainer}>
                                            <Loader2 className={styles.textSpinner} size={24} />
                                            <p className={styles.textStatus}>Reading text content...</p>
                                        </div>
                                    ) : (
                                        <pre className={styles.textPre}><code>{textContent}</code></pre>
                                    )}
                                </div>
                            )}

                            {kind === 'markdown' && (
                                <div className={styles.markdownWrapper}>
                                    {isTextLoading ? (
                                        <div className={styles.textLoadingContainer}>
                                            <Loader2 className={styles.textSpinner} size={24} />
                                            <p className={styles.textStatus}>Reading content...</p>
                                        </div>
                                    ) : (
                                        <div className={styles.markdownBody}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}

                            {kind === 'unknown' && (
                                <div className={styles.fallbackContainer}>
                                    <File size={64} className={styles.fallbackIcon} />
                                    <h4 className={styles.fallbackTitle}>No Preview Available</h4>
                                    <p className={styles.fallbackMessage}>
                                        We don't support previewing {fileName.split('.').pop()?.toUpperCase() || 'this type of'} files directly.
                                    </p>
                                    <button className={styles.fallbackDownloadButton} onClick={handleDownloadInstant}>
                                        <Download size={16} /> Download Decrypted File
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
