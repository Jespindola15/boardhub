import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Guardado de salas en un archivo JSON (escritura atómica y agrupada).
 * Se reemplazará por PostgreSQL/Supabase sin cambiar la interfaz: load() / save(rooms).
 */
export function createFileStore(file) {
  let timer = null;
  let pending = null;
  return {
    load() {
      if (!file || !existsSync(file)) return [];
      try {
        return JSON.parse(readFileSync(file, 'utf8'));
      } catch {
        return [];
      }
    },
    save(rooms) {
      if (!file) return;
      pending = rooms;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        mkdirSync(dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        writeFileSync(tmp, JSON.stringify(pending));
        renameSync(tmp, file);
      }, 200);
    },
    flush() {
      if (!timer || !file) return;
      clearTimeout(timer);
      timer = null;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(pending));
    },
  };
}
