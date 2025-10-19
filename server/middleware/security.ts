import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * RATE LIMITING MIDDLEWARE
 * Protects against brute force attacks and API abuse
 */

// General API rate limiter: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
});

// Medium rate limiter for write operations: 30 requests per 10 minutes
export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // limit each IP to 30 write requests per windowMs
  message: 'Too many write operations, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for expensive operations (exports, bulk actions): 5 per hour
export const expensiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 expensive operations per hour
  message: 'Too many expensive operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * REQUEST VALIDATION MIDDLEWARE
 * Validates request body/query/params against Zod schemas
 */

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates request against Zod schemas
 * Usage:
 *   app.post('/api/users', validate({ body: insertUserSchema }), handler)
 */
export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      // Validate query parameters
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      // Validate URL parameters
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

/**
 * PAYLOAD SIZE LIMITING
 * Prevents DOS attacks via large payloads
 */
export const PAYLOAD_LIMITS = {
  // Standard JSON request limit: 10MB
  json: '10mb',
  // File upload limit: 50MB
  upload: '50mb',
  // URL encoded data limit: 10MB
  urlencoded: '10mb',
};

/**
 * INPUT SANITIZATION
 * Strips potentially malicious content from user input
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags to prevent XSS
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  
  // Remove SQL injection attempts (basic patterns)
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
  ];
  
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized.trim();
}

/**
 * Middleware to sanitize all string fields in request body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj !== null && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
          } else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      }
      
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * SECURITY HEADERS
 * Additional security headers to prevent common attacks
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (basic - adjust based on your needs)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss://sip.telnyx.com:7443 https://sip.telnyx.com wss://*.telnyx.com https://*.telnyx.com"
  );
  
  next();
}

/**
 * IP LOGGING FOR AUDIT
 * Captures client IP for security auditing
 */
export function getClientIP(req: Request): string {
  // Check various headers for the real IP (considering proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }
  
  return req.headers['x-real-ip'] as string || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
}

/**
 * Attach client IP to request object for logging
 */
export function captureClientIP(req: Request, res: Response, next: NextFunction) {
  (req as any).clientIP = getClientIP(req);
  next();
}
