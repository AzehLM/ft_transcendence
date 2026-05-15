

export class MimeTypesLoader {
  private static mimeMap: Map<string, string[]> = new Map();
  private static extensionMap: Map<string, string> = new Map();
  private static isLoaded = false;

  static async load(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const response = await fetch('/src/config/mime.types');
      const text = await response.text();

      this.parse(text);
      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to load mime.types file:", error);
      this.mimeMap.set('application/pdf', ['pdf']);
    }
  }

  private static parse(content: string): void {
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [mime, ...extensions] = trimmed.split(/\s+/);
      if (mime && extensions.length > 0) {
        this.mimeMap.set(mime, extensions);
        for (const ext of extensions) {
          this.extensionMap.set(ext, mime);
        }
      }
    }
  }

  static getExtensions(mime: string): string[] {
    return this.mimeMap.get(mime) || [];
  }

  static getMimeType(extension: string): string | undefined {
    const ext = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
    return this.extensionMap.get(ext);
  }

  static getAllowedMimes(): string[] {
    return Array.from(this.mimeMap.keys());
  }

  static isValid(mime: string, filename: string): boolean {
    const extensions = this.getExtensions(mime);
    if (extensions.length === 0) return false;

    const fileExt = filename.split('.').pop()?.toLowerCase();
    return fileExt ? extensions.includes(fileExt) : false;
  }
}
