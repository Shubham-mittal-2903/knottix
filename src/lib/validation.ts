import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be lowercase alphanumeric with hyphens');

export const emailSchema = z.string().email().max(255).transform((v) => v.toLowerCase().trim());

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = z.object({
  query: z.string().max(255).optional(),
  ...paginationSchema.shape,
});

export const nameSchema = z.string().min(1).max(255).transform((v) => v.trim());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export function paginationMeta(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export function toPrismaSkipTake(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
