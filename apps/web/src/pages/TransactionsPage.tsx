import { useState } from 'react';
import { useCategories } from '../api/categories';
import {
  useDeleteTransaction,
  useTransactions,
  type TransactionFilters as Filters,
} from '../api/transactions';
import type { Transaction } from '../api/types';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { TransactionFilters } from '../features/transactions/TransactionFilters';
import { TransactionFormModal } from '../features/transactions/TransactionFormModal';
import { TransactionTable } from '../features/transactions/TransactionTable';
import { currentMonth, formatCurrency } from '../lib/format';
import { useNotice } from '../lib/use-notice';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; transaction: Transaction }
  | { kind: 'delete'; transaction: Transaction };

export function TransactionsPage() {
  const [filters, setFilters] = useState<Filters>({
    month: currentMonth(),
    type: '',
    categoryId: '',
    page: 1,
  });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { notice, showSuccess, showError } = useNotice();

  const categories = useCategories();
  const transactions = useTransactions(filters);
  const deleteTransaction = useDeleteTransaction();

  const closeDialog = () => setDialog(null);
  // Cualquier cambio de filtro vuelve a la primera página.
  const changeFilters = (changes: Partial<Filters>) =>
    setFilters((current) => ({ ...current, page: 1, ...changes }));

  const confirmDelete = (transaction: Transaction) => {
    deleteTransaction.mutate(transaction.id, {
      onSuccess: () => showSuccess('Transacción borrada'),
      onError: (error) => showError(error.message),
      onSettled: closeDialog,
    });
  };

  const renderList = () => {
    if (transactions.isPending) return <Spinner />;
    if (transactions.isError) return <Alert variant="error">{transactions.error.message}</Alert>;
    if (transactions.data.data.length === 0) {
      return (
        <EmptyState
          title="No hay transacciones"
          description="Probá con otros filtros o registrá una transacción nueva."
        />
      );
    }
    return (
      <>
        <TransactionTable
          transactions={transactions.data.data}
          onEdit={(transaction) => setDialog({ kind: 'edit', transaction })}
          onDelete={(transaction) => setDialog({ kind: 'delete', transaction })}
        />
        <Pagination {...transactions.data.meta} onPageChange={(page) => changeFilters({ page })} />
      </>
    );
  };

  return (
    <>
      <PageHeader title="Transacciones">
        <Button onClick={() => setDialog({ kind: 'create' })}>Nueva transacción</Button>
      </PageHeader>

      {notice && (
        <div className="mb-4">
          <Alert variant={notice.variant}>{notice.message}</Alert>
        </div>
      )}

      <TransactionFilters
        filters={filters}
        categories={categories.data ?? []}
        onChange={changeFilters}
      />
      {renderList()}

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <TransactionFormModal
          transaction={dialog.kind === 'edit' ? dialog.transaction : undefined}
          categories={categories.data ?? []}
          onClose={closeDialog}
          onSaved={(message) => {
            showSuccess(message);
            closeDialog();
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Borrar transacción"
          message={`¿Borrar "${dialog.transaction.description ?? dialog.transaction.category.name}" por ${formatCurrency(dialog.transaction.amount)}? Esta acción no se puede deshacer.`}
          confirmLabel="Borrar"
          isConfirming={deleteTransaction.isPending}
          onConfirm={() => confirmDelete(dialog.transaction)}
          onCancel={closeDialog}
        />
      )}
    </>
  );
}
