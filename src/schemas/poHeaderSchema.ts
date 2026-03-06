import { z } from 'zod';

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const poHeaderSchema = z.object({
  requestor: z.string().min(2, 'Requestor name must be at least 2 characters'),
  costCenter: z.string().min(1, 'Cost center is required'),
  neededByDate: z
    .string()
    .min(1, 'Needed-by date is required')
    .refine((val) => new Date(val) > today(), {
      message: 'Needed-by date must be a future date',
    }),
  paymentTerms: z.enum(['Net 15', 'Net 30', 'Net 45', 'Net 60'], {
    errorMap: () => ({ message: 'Select a valid payment term' }),
  }),
});

export type POHeaderFormValues = z.infer<typeof poHeaderSchema>;
