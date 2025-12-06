// middleware/ipTracker.js
export const trackRequest = (req, res, next) => {
  // Get client IP from various headers (common proxy setups)
  const ip = req.headers['x-client-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.headers['cf-connecting-ip'] ||
             req.headers['fastly-client-ip'] ||
             req.headers['x-real-ip'] ||
             req.socket?.remoteAddress ||
             req.connection?.remoteAddress ||
             'unknown';

  // Store IP in request object
  req.clientIP = ip;

  // Get additional request info
  req.requestInfo = {
    ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    referrer: req.headers['referer'] || req.headers['referrer'] || 'direct',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  // Store in response headers for debugging
  res.setHeader('X-Request-ID', req.requestInfo.requestId);
  res.setHeader('X-Client-IP', ip);

  next();
};

export const analyticsMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end method
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log the request (in production, send to analytics service)
    const logData = {
      ...req.requestInfo,
      statusCode: res.statusCode,
      responseTime,
      userId: req.headers['x-user-id'] || 'anonymous',
      sessionId: req.headers['x-session-id'] || 'no-session'
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: logData.method,
        url: logData.url,
        status: logData.statusCode,
        time: `${logData.responseTime}ms`,
        ip: logData.ip
      });
    }

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};