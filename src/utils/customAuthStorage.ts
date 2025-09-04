// Custom storage implementation for permanent auth sessions
class CustomAuthStorage {
  private storage = new Map<string, string>();
  private readonly KEY_PREFIX = 'automot-auth-';
  
  constructor() {
    this.restoreAllFromStorage();
  }

  private restoreAllFromStorage() {
    // Try multiple storage methods for maximum persistence
    this.tryRestoreFrom('sessionStorage');
    this.tryRestoreFrom('localStorage');
  }

  private tryRestoreFrom(storageType: 'sessionStorage' | 'localStorage') {
    try {
      const storage = window[storageType];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('supabase.auth')) {
          const value = storage.getItem(key);
          if (value) {
            this.storage.set(key, value);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not restore from ${storageType}:`, error);
    }
  }

  private syncToAllStorage(key: string, value: string) {
    // Store in multiple places for redundancy
    ['sessionStorage', 'localStorage'].forEach(storageType => {
      try {
        const storage = window[storageType as 'sessionStorage' | 'localStorage'];
        storage.setItem(key, value);
      } catch (error) {
        console.warn(`Could not sync to ${storageType}:`, error);
      }
    });
  }

  private removeFromAllStorage(key: string) {
    ['sessionStorage', 'localStorage'].forEach(storageType => {
      try {
        const storage = window[storageType as 'sessionStorage' | 'localStorage'];
        storage.removeItem(key);
      } catch (error) {
        console.warn(`Could not remove from ${storageType}:`, error);
      }
    });
  }

  getItem(key: string): string | null {
    let value = this.storage.get(key);
    
    // If not in memory, try to restore from persistent storage
    if (!value) {
      try {
        value = sessionStorage.getItem(key) || localStorage.getItem(key) || null;
        if (value) {
          this.storage.set(key, value);
        }
      } catch (error) {
        console.warn('Could not restore from storage:', error);
      }
    }
    
    return value || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
    this.syncToAllStorage(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
    this.removeFromAllStorage(key);
  }

  clear(): void {
    this.storage.clear();
    ['sessionStorage', 'localStorage'].forEach(storageType => {
      try {
        const storage = window[storageType as 'sessionStorage' | 'localStorage'];
        storage.clear();
      } catch (error) {
        console.warn(`Could not clear ${storageType}:`, error);
      }
    });
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }

  get length(): number {
    return this.storage.size;
  }
}

export const customAuthStorage = new CustomAuthStorage();