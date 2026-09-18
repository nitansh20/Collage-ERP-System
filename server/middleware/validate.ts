import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (targets: ValidationTargets | ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if ('parse' in targets && typeof (targets as any).parse === 'function') {
        req.body = (targets as ZodSchema).parse(req.body);
        return next();
      }
      const t = targets as ValidationTargets;
      if (t.params) {
        req.params = t.params.parse(req.params) as any;
      }
      if (t.query) {
        req.query = t.query.parse(req.query) as any;
      }
      if (t.body) {
        req.body = t.body.parse(req.body);
      }
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return res.status(400).json({
          success: false,
          error: `Validation Error: ${issues.map((i) => `${i.field ? `${i.field}: ` : ''}${i.message}`).join('; ')}`,
          issues,
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Malformed request data rejected by security gate.',
      });
    }
  };
};
