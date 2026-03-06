import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { poHeaderSchema, type POHeaderFormValues } from '../../schemas/poHeaderSchema';
import type { POHeader } from '../../types';

interface Props {
  defaultValues?: Partial<POHeader>;
  onSubmit: (values: POHeaderFormValues) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const inputCls =
  'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

const labelCls = 'mb-1 block text-[11px] text-slate-400';
const errorCls = 'mt-1 text-[11px] text-red-400';

export function POHeaderForm({ defaultValues, onSubmit, onBack, isSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<POHeaderFormValues>({
    resolver: zodResolver(poHeaderSchema),
    defaultValues: {
      requestor: defaultValues?.requestor ?? '',
      costCenter: defaultValues?.costCenter ?? 'CC-1234',
      neededByDate: defaultValues?.neededByDate ?? '',
      paymentTerms: defaultValues?.paymentTerms ?? 'Net 30',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div>
        <label className={labelCls}>Requestor Name *</label>
        <input {...register('requestor')} placeholder="e.g. Alex Morgan" className={inputCls} />
        {errors.requestor && <p className={errorCls}>{errors.requestor.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Cost Center *</label>
        <input {...register('costCenter')} placeholder="CC-1234" className={inputCls} />
        {errors.costCenter && <p className={errorCls}>{errors.costCenter.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Needed-By Date *</label>
        <input type="date" {...register('neededByDate')} className={inputCls} />
        {errors.neededByDate && <p className={errorCls}>{errors.neededByDate.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Payment Terms *</label>
        <select {...register('paymentTerms')} className={inputCls}>
          {(['Net 15', 'Net 30', 'Net 45', 'Net 60'] as const).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.paymentTerms && <p className={errorCls}>{errors.paymentTerms.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-600 px-4 py-2 text-xs text-slate-300 hover:border-slate-400"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          Next → Review
        </button>
      </div>
    </form>
  );
}
