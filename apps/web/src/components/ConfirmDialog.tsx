import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Modal title={props.title} onClose={props.onCancel}>
      <p className="text-sm text-slate-600">{props.message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={props.onConfirm} disabled={props.isConfirming}>
          {props.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
