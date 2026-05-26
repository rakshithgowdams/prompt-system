export interface UploadEntry {
  /** Relative path inside the dropped folder, e.g. "subdir/image.png". For a single file, just the filename. */
  relativePath: string;
  file: File;
}

async function readDirEntry(entry: any): Promise<UploadEntry[]> {
  if (entry.isFile) {
    const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ relativePath: entry.fullPath.replace(/^\//, ''), file }];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const allEntries: any[] = [];
    let batch: any[];
    do {
      batch = await new Promise<any[]>((resolve, reject) => reader.readEntries(resolve, reject));
      allEntries.push(...batch);
    } while (batch.length > 0);
    const nested = await Promise.all(allEntries.map(readDirEntry));
    return nested.flat();
  }
  return [];
}

export async function extractEntries(dt: DataTransfer): Promise<UploadEntry[]> {
  const out: UploadEntry[] = [];
  if (dt.items && dt.items.length > 0) {
    const items = Array.from(dt.items);
    const entries = items.map((it) => (it as any).webkitGetAsEntry?.()).filter(Boolean);
    if (entries.length > 0) {
      const all = await Promise.all(entries.map(readDirEntry));
      out.push(...all.flat());
      return out;
    }
  }
  for (const f of Array.from(dt.files ?? [])) {
    out.push({ relativePath: f.name, file: f });
  }
  return out;
}

export function extractFromInput(files: FileList): UploadEntry[] {
  return Array.from(files).map((f) => ({
    relativePath: (f as any).webkitRelativePath || f.name,
    file: f,
  }));
}

export function splitPath(relativePath: string): { folders: string[]; fileName: string } {
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length === 0) return { folders: [], fileName: '' };
  return { folders: parts.slice(0, -1), fileName: parts[parts.length - 1] };
}
