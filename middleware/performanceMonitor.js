import { performance } from 'perf_hooks';

const performanceMonitor = (req, res, next) => {
    const start = performance.now();
    
    // Store original end method
    const originalEnd = res.end;
    
    // Override end method
    res.end = function(chunk, encoding) {
        const duration = performance.now() - start;
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration.toFixed(2)}ms`);
        }
        
        if (duration > 2000) {
            console.warn(`SLOW REQUEST: ${req.method} ${req.originalUrl} took ${duration.toFixed(2)}ms`);
        }
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

export default performanceMonitor;
