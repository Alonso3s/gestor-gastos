import type { Category } from '../../api/types';
import { Button } from '../../components/Button';
import { ColorDot } from '../../components/ColorDot';

interface CategoryListProps {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryList({ title, categories, onEdit, onDelete }: CategoryListProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-500">({categories.length})</span>
      </h2>
      {categories.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">Todavía no hay categorías de este tipo.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 px-4 py-2">
              <ColorDot color={category.color} />
              <span className="flex-1 text-sm text-slate-900">{category.name}</span>
              <Button
                variant="ghost"
                aria-label={`Editar ${category.name}`}
                onClick={() => onEdit(category)}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                aria-label={`Borrar ${category.name}`}
                onClick={() => onDelete(category)}
              >
                Borrar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
