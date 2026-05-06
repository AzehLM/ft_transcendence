# E2EE File Upload Architecture - Final Implementation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD (React Component)                   │
├─────────────────────────────────────────────────────────────────┤
│  • Displays file grid with FileCard components                   │
│  • Manages upload/download UI states                             │
│  • Shows progress bars with speed metrics                        │
│  • Displays animated status messages                             │
│  • Handles file selection via ActionButtons                      │
└────────────────┬──────────────────────────────────┬──────────────┘
                 │                                  │
        ┌────────▼────────────┐          ┌─────────▼──────────────┐
        │  useE2EEUpload Hook │          │  useE2EEDownload Hook  │
        └────────┬────────────┘          └─────────┬──────────────┘
                 │                               │
      ┌──────────┴────────────┐      ┌──────────┴──────────────┐
      │                       │      │                         │
      ▼                       ▼      ▼                         ▼
  ┌─────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ FileValidation      │  │ CryptoService    │  │ FileService      │
  │ Service             │  │                  │  │                  │
  │ ─────────────────── │  │ ─────────────────│  │ ──────────────── │
  │ • Magic Numbers     │  │ • RSA-OAEP       │  │ • API requests   │
  │ • File Type Labels  │  │ • AES-GCM        │  │ • File metadata  │
  │ • Format Size       │  │ • Key storage    │  │                  │
  └─────────────────────┘  └──────────────────┘  └──────────────────┘
      │                           │                      │
      └───────────────────────────┼──────────────────────┘
                                  │
                ┌─────────────────▼──────────────┐
                │   uploadConfig.ts              │
                │ ──────────────────────────────│
                │ • CHUNK_SIZE (5 MB)            │
                │ • MAX_FILE_SIZE (2 GB)         │
                │ • ALLOWED_FILE_TYPES          │
                │ • UPLOAD_MESSAGES             │
                └────────────────────────────────┘
                                  │
                ┌─────────────────▼──────────────┐
                │   Global Styles (CSS)          │
                │ ──────────────────────────────│
                │ • fadeIn animation (0.3s)     │
                │ • slideDown animation (0.3s)  │
                │ • pulse animation (1.5s)      │
                │ • CSS utility classes         │
                └────────────────────────────────┘
```

## Data Flow: File Upload

```
User selects file
       │
       ▼
┌──────────────────────────┐
│ FileValidationService    │
│ • Check file size        │
│ • Check MIME type        │
│ • Check magic number     │
└────────────┬─────────────┘
             │
       ┌─────▼─────┐
       │ Valid?    │
       └─┬────┬────┘
      NO│    │YES
        │    │
        │    ▼
        │  ┌─────────────────────────────┐
        │  │ Generate encryption keys    │
        │  │ • DEK (Data Encryption Key) │
        │  │ • Base IV                   │
        │  │ • Import public key         │
        │  └────────────┬────────────────┘
        │               │
        │               ▼
        │  ┌──────────────────────────────┐
        │  │ Encrypt DEK with RSA-OAEP    │
        │  └────────────┬─────────────────┘
        │               │
        │               ▼
        │  ┌──────────────────────────────┐
        │  │ Get upload URL from server   │
        │  │ (presigned S3/MinIO URL)     │
        │  └────────────┬─────────────────┘
        │               │
        │               ▼
        │  ┌──────────────────────────────┐
        │  │ Encrypt file in chunks       │
        │  │ • Read 5MB chunks            │
        │  │ • AES-GCM encrypt each chunk │
        │  │ • Update progress UI         │
        │  │ • Calculate remaining time   │
        │  └────────────┬─────────────────┘
        │               │
        │               ▼
        │  ┌──────────────────────────────┐
        │  │ Upload to MinIO (PUT request)│
        │  │ • Send encrypted blob        │
        │  │ • Animation transition       │
        │  └────────────┬─────────────────┘
        │               │
        │               ▼
        │  ┌──────────────────────────────┐
        │  │ Finalize upload              │
        │  │ • Send metadata to API       │
        │  │ • Save to database           │
        │  │ • Show success message       │
        │  └─────────────────────────────┘
        │
        ▼
   ┌─────────────────┐
   │ Show error msg  │
   │ Retry available │
   └─────────────────┘
```

## Magic Number Validation Details

### File Type Signatures Supported

```
┌────────────────────────────────────────────────┐
│              MAGIC NUMBER TABLE                │
├────────────────────────────────────────────────┤
│ File Type           │ Bytes                    │
├─────────────────────┼──────────────────────────┤
│ JPEG                │ FF D8 FF                 │
│ PNG                 │ 89 50 4E 47              │
│ GIF                 │ 47 49 46                 │
│ WebP                │ 52 49 46 46              │
│ BMP                 │ 42 4D                    │
│ PDF                 │ 25 50 44 46              │
│ ZIP                 │ 50 4B 03 04              │
│ RAR                 │ 52 61 72 21              │
│ 7Z                  │ 37 7A BC AF 27 1C        │
│ MP4                 │ 00 00 00 18 66 74 79... │
│ WebM                │ 1A 45 DF A3              │
│ MPEG Video          │ 00 00 01 B3              │
│ MS Office (DOC)     │ D0 CF 11 E0              │
│ XLSX/DOCX/PPTX      │ 50 4B 03 04              │
└────────────────────────────────────────────────┘

File types without magic numbers (validated by type only):
• text/plain
• text/csv
• application/json
```

## Upload Message Phases

```
Timeline of Status Messages Shown to User:

T=0s  → "Initialisation du chiffrement de 'photo.jpg'..."
        [File info card appears with slideDown animation]
        [Progress bar appears at 0%]

T=0.5s → "Demande d'autorisation de serveur..."
        [Progress: Getting upload URL from backend]

T=1.5s → "Chiffrement et envoi des chunks..."
        [Progress: 0-99% as file is encrypted]
        [Speed: X.XX MB/s shown]
        [Remaining time: Ns displayed]

T=(encryption)s → "Envoi du fichier chiffré..."
                 [500ms animation pause]

T=(upload)s    → "Sauvegarde des métadonnées..."
               [Final API call to save metadata]

T=success      → "photo.jpg a été chiffré et uploadé avec succès."
               [fadeIn animation]
               [Auto-dismiss after 4 seconds]
```



## Security Features

### Multi-Layer Validation

1. **MIME Type Whitelist**
   - Only 20+ pre-approved file types allowed
   - Others rejected before processing

2. **Magic Number Verification**
   - Checks file signature bytes
   - Prevents MIME type spoofing
   - Detects file corruption

3. **Encryption Before Upload**
   - AES-GCM per-chunk encryption
   - RSA-OAEP DEK encryption
   - IV counter per chunk

4. **Server-Side Verification**
   - Metadata validation on API
   - Database integrity checks

## Performance Optimizations

| Optimization | Implementation |
|---|---|
| Chunk-based processing | 5MB chunks to prevent memory overflow |
| Progress calculation | O(1) speed calculation without buffers |
| Lazy validation | Magic number check only if needed |
| Service reusability | FileValidationService used across app |



## Testing Recommendations

### Unit Tests
- [ ] FileValidationService.validateMagicNumber() with real file signatures
- [ ] FileValidationService.formatFileSize() with edge cases (0, 1023, 1024, 2GB)
- [ ] FileValidationService.getFileTypeLabel() with all supported types

### Integration Tests
- [ ] Full upload flow with small file (< 100MB)
- [ ] Full upload flow with large file (1-2GB)
- [ ] Upload with invalid MIME type + valid magic number → should fail
- [ ] Upload with valid MIME type + invalid magic number → should fail
- [ ] Progress bar accuracy with different file sizes
- [ ] Animation smoothness on different browsers

### E2E Tests
- [ ] User selects file → validation → encryption → upload → success
- [ ] User selects invalid file → error message → can retry
- [ ] Progress metrics shown accurately during upload
- [ ] Can download immediately after upload
- [ ] Works across Chrome, Firefox, Safari, Edge
