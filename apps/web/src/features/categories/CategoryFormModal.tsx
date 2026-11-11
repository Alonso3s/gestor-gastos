import { useCreateCategory, useUpdateCategory } from '../../api/categories';
import type { Category } from '../../api/types';
import { Modal } from '../../components/Modal';
import type { CategoryFormValues } from './category-schema';
import { CategoryForm } from './CategoryForm';

const DEFAULT_COLOR = '#64748b';

interface CategoryFormModalProps {
  /** Categoría a editar; sin ella el formulario crea una nueva. */
  category?: Category;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function CategoryFormModal({ category, onClose, onSaved }: CategoryFormModalProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const mutation = category ? updateCategory : createCategory;

  const handleSubmit = (values: CategoryFormValues) => {
    if (category) {
      updateCategory.mutate(
        { id: category.id, name: values.name, color: values.color },
        { onSuccess: () => onSaved('Categoría actualizada') },
      );
    } else {
      createCategory.mutate(values, { onSuccess: () => onSaved('Categoría creada') });
    }
  };

  return (
    <Modal title={category ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <CategoryForm
        defaultValues={{
          name: category?.name ?? '',
          type: category?.type ?? 'EXPENSE',
          color: category?.color ?? DEFAULT_COLOR,
        }}
        isTypeLocked={Boolean(category)}
        submitLabel={category ? 'Guardar cambios' : 'Crear categoría'}
        isSubmitting={mutation.isPending}
        errorMessage={mutation.error?.message}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
