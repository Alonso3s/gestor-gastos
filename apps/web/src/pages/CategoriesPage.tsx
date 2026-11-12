import { useState } from 'react';
import { useCategories, useDeleteCategory } from '../api/categories';
import type { Category } from '../api/types';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { CategoryFormModal } from '../features/categories/CategoryFormModal';
import { CategoryList } from '../features/categories/CategoryList';
import { useNotice } from '../lib/use-notice';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; category: Category }
  | { kind: 'delete'; category: Category };

export function CategoriesPage() {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { notice, showSuccess, showError } = useNotice();
  const categories = useCategories();
  const deleteCategory = useDeleteCategory();

  const closeDialog = () => setDialog(null);

  const confirmDelete = (category: Category) => {
    deleteCategory.mutate(category.id, {
      onSuccess: () => showSuccess('Categoría borrada'),
      // Caso típico: la API responde 409 porque la categoría tiene transacciones.
      onError: (error) => showError(error.message),
      onSettled: closeDialog,
    });
  };

  const renderLists = () => {
    if (categories.isPending) return <Spinner />;
    if (categories.isError) return <Alert variant="error">{categories.error.message}</Alert>;

    const listProps = {
      onEdit: (category: Category) => setDialog({ kind: 'edit', category }),
      onDelete: (category: Category) => setDialog({ kind: 'delete', category }),
    };
    return (
      <div className="grid items-start gap-4 md:grid-cols-2">
        <CategoryList
          title="Gastos"
          categories={categories.data.filter((category) => category.type === 'EXPENSE')}
          {...listProps}
        />
        <CategoryList
          title="Ingresos"
          categories={categories.data.filter((category) => category.type === 'INCOME')}
          {...listProps}
        />
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Categorías">
        <Button onClick={() => setDialog({ kind: 'create' })}>Nueva categoría</Button>
      </PageHeader>

      {notice && (
        <div className="mb-4">
          <Alert variant={notice.variant}>{notice.message}</Alert>
        </div>
      )}
      {renderLists()}

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <CategoryFormModal
          category={dialog.kind === 'edit' ? dialog.category : undefined}
          onClose={closeDialog}
          onSaved={(message) => {
            showSuccess(message);
            closeDialog();
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Borrar categoría"
          message={`¿Borrar la categoría "${dialog.category.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Borrar"
          isConfirming={deleteCategory.isPending}
          onConfirm={() => confirmDelete(dialog.category)}
          onCancel={closeDialog}
        />
      )}
    </>
  );
}
