import { z } from 'zod';

export const screenshotRequestSchema = z.object({
  targetUrl: z
    .string()
    .url('Invalid URL format')
    .regex(/^https?:\/\//, 'URL must start with http:// or https://')
    .max(2048, 'URL too long (max 2048 characters)'),
  callbackUrl: z
    .string()
    .url('Invalid callback URL format')
    .regex(/^https?:\/\//, 'Callback URL must start with http:// or https://')
    .max(2048, 'Callback URL too long (max 2048 characters)'),
  options: z
    .object({
      viewport: z
        .object({
          width: z.number().min(320).max(3840).optional(),
          height: z.number().min(240).max(2160).optional(),
        })
        .optional(),
      fullPage: z.boolean().optional(),
      format: z.enum(['png', 'jpeg', 'webp']).optional(),
      quality: z.number().min(1).max(100).optional(),
    })
    .optional(),
});

export type ScreenshotRequestInput = z.infer<typeof screenshotRequestSchema>;

export function validateScreenshotRequest(data: unknown) {
  try {
    const validated = screenshotRequestSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors,
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred during validation',
      },
    };
  }
}
