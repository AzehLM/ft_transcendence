import type { ComponentType } from 'react';
import { File, FileText, FileImage, FileVideo, FileAudio, FileCode, FileSpreadsheet, FileArchive } from 'lucide-react';
import { resolvePreview, type PreviewKind } from './previewType';

export interface FileVisual {
	Icon: ComponentType<{ size?: number | string }>;
	color: string;
	bg: string;
}

const VISUALS: Record<PreviewKind, FileVisual> = {
	image:    { Icon: FileImage, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
	video:    { Icon: FileVideo, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
	audio:    { Icon: FileAudio, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
	pdf:      { Icon: FileText,  color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
	code:     { Icon: FileCode,  color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
	markdown: { Icon: FileText,  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
	text:     { Icon: FileText,  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
	unknown:  { Icon: File,      color: '#865142', bg: 'rgba(134, 81, 66, 0.1)' },
};

const SPREADSHEET: FileVisual = { Icon: FileSpreadsheet, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
const ARCHIVE: FileVisual = { Icon: FileArchive, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };

export function getFileVisual(filename: string): FileVisual {

	const { kind } = resolvePreview(filename);
	if (kind !== 'unknown') return VISUALS[kind];

	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return SPREADSHEET;
	if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return ARCHIVE;

	return VISUALS.unknown;
}
