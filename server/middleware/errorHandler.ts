import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const status = typeof err.statusCode === 'number' ? err.statusCode : typeof err.status === 'number' ? err.status : 500;

  // Log internal details securely on the server
  console.error(`[Error Handler] ${req.method} ${req.originalUrl || req.url} - Status ${status}:`, err.message || err);

  // Prevent internal error details and file stack traces from leaking to client in 500s
  const safeMessage =
    status >= 500
      ? 'An unexpected institutional server error occurred. The incident has been registered.'
      : err.message || 'Request processing failed.';

  res.status(status).json({
    success: false,
    error: safeMessage,
    ...(isDev && status < 500 ? { details: err.details } : {}),
  });
};
