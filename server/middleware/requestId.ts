import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

export interface RequestWithId extends Request {
  id?: string;
}

export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction) => {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId && /^[a-zA-Z0-9_\-]+$/.test(existingId) ? existingId : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
