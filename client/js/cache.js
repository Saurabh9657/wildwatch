/**
 * Simple Cache Manager
 * Stores API responses to reduce network calls and improve performance.
 * Tune maxAge in get() (default 60s) or call CacheManager.clear() after creates/updates.
 */

const CacheManager = {
    cache: new Map(),
    
    // Get cached data
    get(key, maxAge = 60000) { // Default 1 minute TTL (ms)
        const item = this.cache.get(key);
        if (!item) return null;
        
        const now = Date.now();
        if (now - item.timestamp > maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    },
    
    // Set cached data
    set(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    },
    
    // Clear specific cache
    clear(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    },
    
    // Get cache stats
    stats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
};

// Global cache instance
window.CacheManager = CacheManager;