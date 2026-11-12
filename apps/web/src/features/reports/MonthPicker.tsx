import { Button } from '../../components/Button';
import { INPUT_CLASSES } from '../../components/Field';
import { shiftMonth } from '../../lib/format';

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        aria-label="Mes anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        ←
      </Button>
      <input
        type="month"
        aria-label="Mes"
        value={month}
        // El navegador entrega '' si el usuario borra el campo; se ignora para no pedir un mes inválido.
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className={INPUT_CLASSES}
      />
      <Button
        variant="secondary"
        aria-label="Mes siguiente"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        →
      </Button>
    </div>
  );
}
