import { z } from 'zod';

export const lineItemSchema = z.object({
  catalogueId: z.string().min(1, 'Catalogue item ID is required'),
  quantity: z
    .number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
});

export type LineItemFormValues = z.infer<typeof lineItemSchema>;
