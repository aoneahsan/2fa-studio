import React from 'react';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case 'danger':
        return 'danger';
      default:
        return 'primary';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          {getIcon()}
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={getConfirmButtonVariant()}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Preset confirmation dialogs
export const useConfirmation = () => {
  const [dialogState, setDialogState] = React.useState<ConfirmationDialogProps | null>(null);

  const confirm = (options: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        ...options,
        isOpen: true,
        onClose: () => {
          setDialogState(null);
          resolve(false);
        },
        onConfirm: () => {
          options.onConfirm();
          setDialogState(null);
          resolve(true);
        }
      });
    });
  };

  const confirmDelete = (itemName: string, onConfirm: () => void) => {
    return confirm({
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm
    });
  };

  const confirmLogout = (onConfirm: () => void) => {
    return confirm({
      title: 'Logout Confirmation',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      type: 'warning',
      onConfirm
    });
  };

  const confirmDiscard = (onConfirm: () => void) => {
    return confirm({
      title: 'Discard Changes?',
      message: 'You have unsaved changes. Are you sure you want to discard them?',
      confirmText: 'Discard',
      type: 'warning',
      onConfirm
    });
  };

  return {
    dialogState,
    confirm,
    confirmDelete,
    confirmLogout,
    confirmDiscard
  };
};