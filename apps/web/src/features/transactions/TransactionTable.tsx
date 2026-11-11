import type { Transaction } from '../../api/types';
import { Button } from '../../components/Button';
import { ColorDot } from '../../components/ColorDot';
import { classNames } from '../../lib/class-names';
import { formatCurrency, formatDate } from '../../lib/format';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const HEADER_CLASSES =
  'px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-500 uppercase';

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={HEADER_CLASSES}>Fecha</th>
            <th className={HEADER_CLASSES}>Categoría</th>
            <th className={HEADER_CLASSES}>Descripción</th>
            <th className={classNames(HEADER_CLASSES, 'text-right')}>Monto</th>
            <th className={classNames(HEADER_CLASSES, 'text-right')}>Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {formatDate(transaction.date)}
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2 text-slate-900">
                  <ColorDot color={transaction.category.color} />
                  {transaction.category.name}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{transaction.description ?? '—'}</td>
              <td
                className={classNames(
                  'px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums',
                  transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900',
                )}
              >
                {transaction.type === 'INCOME' ? '+' : '−'} {formatCurrency(transaction.amount)}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Button variant="ghost" onClick={() => onEdit(transaction)}>
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => onDelete(transaction)}>
                  Borrar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
