import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { Category } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Field, INPUT_CLASSES } from '../../components/Field';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from '../../lib/transaction-types';
import { transactionFormSchema, type TransactionFormValues } from './transaction-schema';

interface TransactionFormProps {
  categories: Category[];
  defaultValues: TransactionFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (values: TransactionFormValues) => void;
  onCancel: () => void;
}

export function TransactionForm(props: TransactionFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: props.defaultValues,
  });
  const selectedType = useWatch({ control, name: 'type' });
  const categoriesOfType = props.categories.filter((category) => category.type === selectedType);

  const typeField = register('type', {
    // La categoría elegida deja de ser válida al cambiar entre gasto e ingreso.
    onChange: () => setValue('categoryId', ''),
  });

  return (
    <form onSubmit={handleSubmit(props.onSubmit)} noValidate className="space-y-4">
      {props.errorMessage && <Alert variant="error">{props.errorMessage}</Alert>}

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Tipo</legend>
        <div className="flex gap-4">
          {TRANSACTION_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" value={type} className="accent-emerald-600" {...typeField} />
              {TRANSACTION_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monto (₡)" htmlFor="amount" error={errors.amount?.message}>
          <input
            id="amount"
            inputMode="decimal"
            placeholder="0.00"
            aria-invalid={Boolean(errors.amount)}
            className={INPUT_CLASSES}
            {...register('amount')}
          />
        </Field>
        <Field label="Fecha" htmlFor="date" error={errors.date?.message}>
          <input
            id="date"
            type="date"
            aria-invalid={Boolean(errors.date)}
            className={INPUT_CLASSES}
            {...register('date')}
          />
        </Field>
      </div>

      <Field label="Categoría" htmlFor="categoryId" error={errors.categoryId?.message}>
        <select
          id="categoryId"
          aria-invalid={Boolean(errors.categoryId)}
          className={INPUT_CLASSES}
          {...register('categoryId')}
        >
          <option value="">Elegí una categoría</option>
          {categoriesOfType.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Descripción (opcional)"
        htmlFor="description"
        error={errors.description?.message}
      >
        <input id="description" className={INPUT_CLASSES} {...register('description')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={props.isSubmitting}>
          {props.isSubmitting ? 'Guardando…' : props.submitLabel}
        </Button>
      </div>
    </form>
  );
}
