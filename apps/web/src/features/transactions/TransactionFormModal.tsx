import { useCreateTransaction, useUpdateTransaction } from '../../api/transactions';
import type { Category, Transaction } from '../../api/types';
import { Modal } from '../../components/Modal';
import { todayIsoDate } from '../../lib/format';
import type { TransactionFormValues } from './transaction-schema';
import { TransactionForm } from './TransactionForm';

interface TransactionFormModalProps {
  /** Transacción a editar; sin ella el formulario crea una nueva. */
  transaction?: Transaction;
  categories: Category[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

function toFormValues(transaction?: Transaction): TransactionFormValues {
  if (!transaction) {
    return { type: 'EXPENSE', amount: '', date: todayIsoDate(), categoryId: '', description: '' };
  }
  return {
    type: transaction.type,
    amount: transaction.amount,
    date: transaction.date,
    categoryId: transaction.categoryId,
    description: transaction.description ?? '',
  };
}

export function TransactionFormModal(props: TransactionFormModalProps) {
  const { transaction, onSaved } = props;
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const mutation = transaction ? updateTransaction : createTransaction;

  const handleSubmit = (values: TransactionFormValues) => {
    const input = { ...values, description: values.description || null };
    if (transaction) {
      updateTransaction.mutate(
        { id: transaction.id, ...input },
        { onSuccess: () => onSaved('Transacción actualizada') },
      );
    } else {
      createTransaction.mutate(input, { onSuccess: () => onSaved('Transacción creada') });
    }
  };

  return (
    <Modal title={transaction ? 'Editar transacción' : 'Nueva transacción'} onClose={props.onClose}>
      <TransactionForm
        categories={props.categories}
        defaultValues={toFormValues(transaction)}
        submitLabel={transaction ? 'Guardar cambios' : 'Crear transacción'}
        isSubmitting={mutation.isPending}
        errorMessage={mutation.error?.message}
        onSubmit={handleSubmit}
        onCancel={props.onClose}
      />
    </Modal>
  );
}
