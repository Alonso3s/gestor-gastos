import type { TransactionFilters as Filters } from '../../api/transactions';
import type { Category, TransactionType } from '../../api/types';
import { INPUT_CLASSES } from '../../components/Field';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from '../../lib/transaction-types';

interface TransactionFiltersProps {
  filters: Filters;
  categories: Category[];
  onChange: (changes: Partial<Filters>) => void;
}

const LABEL_CLASSES = 'block space-y-1 text-sm font-medium text-slate-700';

export function TransactionFilters({ filters, categories, onChange }: TransactionFiltersProps) {
  const selectableCategories = filters.type
    ? categories.filter((category) => category.type === filters.type)
    : categories;

  return (
    <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <label className={LABEL_CLASSES}>
        <span>Mes</span>
        <input
          type="month"
          value={filters.month}
          onChange={(event) => onChange({ month: event.target.value })}
          className={INPUT_CLASSES}
        />
      </label>
      <label className={LABEL_CLASSES}>
        <span>Tipo</span>
        <select
          value={filters.type}
          // Al cambiar el tipo, la categoría elegida puede dejar de corresponder.
          onChange={(event) =>
            onChange({ type: event.target.value as TransactionType | '', categoryId: '' })
          }
          className={INPUT_CLASSES}
        >
          <option value="">Todos</option>
          {TRANSACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {TRANSACTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASSES}>
        <span>Categoría</span>
        <select
          value={filters.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
          className={INPUT_CLASSES}
        >
          <option value="">Todas</option>
          {selectableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
