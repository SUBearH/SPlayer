/**
 * 通用持久化 Map 缓存
 */
export class MapCache<T> {
  private key: string;
  private storage: Storage;
  private map: Map<string, T>;

  constructor(key: string, storage: Storage = window.localStorage) {
    this.key = key;
    this.storage = storage;
    this.map = new Map();
    this.load();
  }

  private load() {
    try {
      const stored = this.storage.getItem(this.key);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([k, v]) => {
          this.map.set(k, v as T);
        });
      }
    } catch (error) {
      console.error(`[MapCache] Failed to load ${this.key}:`, error);
    }
  }

  public save() {
    try {
      const data = Object.fromEntries(this.map);
      this.storage.setItem(this.key, JSON.stringify(data));
    } catch (error) {
      console.error(`[MapCache] Failed to save ${this.key}:`, error);
    }
  }

  public get(key: string | number): T | undefined {
    return this.map.get(String(key));
  }

  public set(key: string | number, value: T) {
    this.map.set(String(key), value);
  }

  public has(key: string | number): boolean {
    return this.map.has(String(key));
  }

  public delete(key: string | number) {
    this.map.delete(String(key));
  }

  public clear() {
    this.map.clear();
    this.storage.removeItem(this.key);
  }

  public forEach(callback: (value: T, key: string) => void) {
    this.map.forEach(callback);
  }

  public get size() {
    return this.map.size;
  }
}
