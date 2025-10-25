import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db-init";
import { autoDialerService } from "./services/auto-dialer";
import { 
  apiLimiter, 
  securityHeaders, 
  captureClientIP,
  sanitizeBody,
  PAYLOAD_LIMITS 
} from "./middleware/security";

const app = express();

// Trust Replit proxy for accurate client IP detection (required for rate limiting)
// Replit runs behind a reverse proxy that sets X-Forwarded-For header
app.set('trust proxy', 1);

// Apply security middleware early in the stack
app.use(securityHeaders); // Set security headers on all responses
app.use(captureClientIP); // Capture client IP for audit logging

// Enable response compression for better performance with large datasets
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9, 6 is default balance)
}));

// Payload size limits (防止 DOS attacks)
app.use(express.json({ limit: PAYLOAD_LIMITS.json }));
app.use(express.urlencoded({ extended: false, limit: PAYLOAD_LIMITS.urlencoded }));

// Sanitize all incoming request bodies (BEFORE validation)
app.use(sanitizeBody); // Remove HTML/SQL injection patterns

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = createServer(app);
  
  // Initialize database with default admin if needed
  await initializeDatabase();
  
  // Start auto-dialer service
  await autoDialerService.start();
  log("[AutoDialer] Service initialized and started");
  
  // Start AI-powered QA background jobs
  const { startBackgroundJobs } = await import("./services/background-jobs");
  startBackgroundJobs();
  
  // Start DV background job scheduler
  const { startJobScheduler } = await import("./lib/dv-queue");
  startJobScheduler();
  
  // Auto-resume stuck email validation jobs
  const { resumeStuckEmailValidationJobs } = await import("./lib/resume-validation-jobs");
  setTimeout(() => resumeStuckEmailValidationJobs(), 5000); // Wait 5 seconds after startup
  
  // Auto-resume stuck CSV upload jobs
  const { resumeStuckUploadJobs } = await import("./lib/upload-job-processor");
  setTimeout(() => resumeStuckUploadJobs(), 5000); // Wait 5 seconds after startup
  
  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
