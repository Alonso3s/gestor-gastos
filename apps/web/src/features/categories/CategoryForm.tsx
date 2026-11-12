import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Field, INPUT_CLASSES } from '../../components/Field';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from '../../lib/transaction-types';
import { categoryFormSchema, type CategoryFormValues } from './category-schema';

interface CategoryFormProps {
  defaultValues: CategoryFormValues;
  /** El tipo no se puede cambiar al editar: la API no lo permite. */
  isTypeLocked: boolean;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel: () => void;
}

export function CategoryForm(props: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: props.defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(props.onSubmit)} noValidate className="space-y-4">
      {props.errorMessage && <Alert variant="error">{props.errorMessage}</Alert>}

      <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
        <input
          id="name"
          aria-invalid={Boolean(errors.name)}
          className={INPUT_CLASSES}
          {...register('name')}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo" htmlFor="type" error={errors.type?.message}>
          <select
            id="type"
            className={INPUT_CLASSES}
            {...register('type')}
            disabled={props.isTypeLocked}
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {TRANSACTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Color" htmlFor="color" error={errors.color?.message}>
          <input
            id="color"
            type="color"
            className="h-9.5 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            {...register('color')}
          />
        </Field>
      </div>

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
