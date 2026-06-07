export type PreviewKind =
	| 'image' | 'pdf' | 'markdown' | 'code'
	| 'text' | 'audio' | 'video' | 'unknown';

export interface PreviewDescriptor {
	kind: PreviewKind;
	mime: string;
}

export const MAX_VIDEO_PREVIEW_BYTES = 500 * 1024 * 1024; // max preview size

const TABLE: Record<string, PreviewDescriptor> = {

	png: { kind: 'image', mime: 'image/png' },
	jpg: { kind: 'image', mime: 'image/jpeg' },
	jpeg: { kind: 'image', mime: 'image/jpeg' },
	gif: { kind: 'image', mime: 'image/gif' },
	webp: { kind: 'image', mime: 'image/webp' },
	svg: { kind: 'image', mime: 'image/svg+xml' },
	bmp: { kind: 'image', mime: 'image/bmp' },

	pdf: { kind: 'pdf', mime: 'application/pdf' },
	md: { kind: 'markdown', mime: 'text/markdown' },
	markdown: { kind: 'markdown', mime: 'text/markdown' },

	// code is rendered as source text, never executed
	go: { kind: 'code', mime: 'text/x-go' },
	ts: { kind: 'code', mime: 'text/typescript' },
	tsx: { kind: 'code', mime: 'text/typescript' },
	js: { kind: 'code', mime: 'text/javascript' },
	css: { kind: 'code', mime: 'text/css' },
	html: { kind: 'text', mime: 'text/plain' }, // text/plain on purpose: neutralizes the blob URL
	sh: { kind: 'code', mime: 'text/x-sh' },
	yaml: { kind: 'code', mime: 'text/yaml' },
	yml: { kind: 'code', mime: 'text/yaml' },
	cpp: { kind: 'code', mime: 'text/x-c++src' },
	c: { kind: 'code', mime: 'text/x-csrc' },
	h: { kind: 'code', mime: 'text/x-chdr' },
	json: { kind: 'code', mime: 'application/json' },

	txt: { kind: 'text', mime: 'text/plain' },

	mp3: { kind: 'audio', mime: 'audio/mpeg' },
	wav: { kind: 'audio', mime: 'audio/wav' },
	ogg: { kind: 'audio', mime: 'audio/ogg' },
	flac: { kind: 'audio', mime: 'audio/flac' },

	mp4: { kind: 'video', mime: 'video/mp4' },
	webm: { kind: 'video', mime: 'video/webm' },
};

const UNKNOWN: PreviewDescriptor = { kind: 'unknown', mime: 'application/octet-stream' };

export function resolvePreview(filename: string): PreviewDescriptor {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	return TABLE[ext] ?? UNKNOWN;
}
