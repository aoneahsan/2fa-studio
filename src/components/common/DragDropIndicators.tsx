import React from 'react';
import { 
  ArrowsUpDownIcon,
  ArrowsRightLeftIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

// Drag handle component
interface DragHandleProps {
  isDragging?: boolean;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export const DragHandle: React.FC<DragHandleProps> = ({
  isDragging = false,
  className = '',
  orientation = 'vertical'
}) => {
  const Icon = orientation === 'vertical' ? ArrowsUpDownIcon : ArrowsRightLeftIcon;
  
  return (
    <div 
      className={`cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50' : 'opacity-30 hover:opacity-70'
      } ${className}`}
    >
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
  );
};

// Drop zone indicator
interface DropZoneProps {
  isActive: boolean;
  isOver: boolean;
  canDrop: boolean;
  children?: React.ReactNode;
  className?: string;
  label?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  isActive,
  isOver,
  canDrop,
  children,
  className = '',
  label
}) => {
  const getBorderColor = () => {
    if (!canDrop) return 'border-gray-200';
    if (isOver) return 'border-primary bg-primary/5';
    if (isActive) return 'border-primary/50 border-dashed';
    return 'border-gray-200';
  };

  const showPlaceholder = !children && (isActive || isOver);

  return (
    <div 
      className={`relative transition-all border-2 rounded-lg ${getBorderColor()} ${className}`}
    >
      {children}
      
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <PlusCircleIcon className="w-8 h-8 mx-auto mb-2 text-primary/50" />
            <p className="text-sm text-muted-foreground">{label || 'Drop here'}</p>
          </div>
        </div>
      )}
      
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none animate-pulse" />
      )}
    </div>
  );
};

// Draggable item wrapper
interface DraggableItemProps {
  isDragging: boolean;
  children: React.ReactNode;
  className?: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  isDragging,
  children,
  className = ''
}) => {
  return (
    <div 
      className={`transition-all ${
        isDragging 
          ? 'opacity-50 scale-95 rotate-1 shadow-2xl' 
          : 'opacity-100 scale-100 rotate-0'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// Drag ghost/preview
interface DragGhostProps {
  children: React.ReactNode;
  className?: string;
}

export const DragGhost: React.FC<DragGhostProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`opacity-80 shadow-lg transform scale-105 ${className}`}>
      {children}
    </div>
  );
};

// Sortable list container
interface SortableListProps {
  isDraggingOver: boolean;
  children: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export const SortableList: React.FC<SortableListProps> = ({
  isDraggingOver,
  children,
  className = '',
  orientation = 'vertical'
}) => {
  const listStyles = orientation === 'vertical' 
    ? 'flex flex-col gap-2' 
    : 'flex flex-row gap-2';
    
  return (
    <div 
      className={`${listStyles} transition-all ${
        isDraggingOver ? 'bg-muted/50 ring-2 ring-primary/20' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

// Insertion indicator (shows where item will be placed)
interface InsertionIndicatorProps {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export const InsertionIndicator: React.FC<InsertionIndicatorProps> = ({
  orientation = 'vertical',
  className = ''
}) => {
  const indicatorStyles = orientation === 'vertical'
    ? 'h-0.5 w-full'
    : 'w-0.5 h-full';
    
  return (
    <div className={`relative ${className}`}>
      <div className={`${indicatorStyles} bg-primary animate-pulse`} />
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
    </div>
  );
};

// Drag overlay (shows count when dragging multiple items)
interface DragOverlayProps {
  count?: number;
  isDragging: boolean;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({
  count,
  isDragging
}) => {
  if (!isDragging || !count || count <= 1) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium shadow-lg animate-in">
        Moving {count} items
      </div>
    </div>
  );
};

// Empty drop zone
interface EmptyDropZoneProps {
  isActive: boolean;
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyDropZone: React.FC<EmptyDropZoneProps> = ({
  isActive,
  message = 'Drag items here',
  icon,
  className = ''
}) => {
  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        isActive 
          ? 'border-primary bg-primary/5 scale-105' 
          : 'border-gray-300'
      } ${className}`}
    >
      {icon || <ArrowsUpDownIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />}
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

// Reorder handle (for keyboard accessibility)
interface ReorderHandleProps {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export const ReorderHandle: React.FC<ReorderHandleProps> = ({
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <button
        onClick={onMoveUp}
        disabled={!canMoveUp}
        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
        aria-label="Move up"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={onMoveDown}
        disabled={!canMoveDown}
        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
        aria-label="Move down"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

// Drag feedback toast
interface DragFeedbackProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  visible: boolean;
}

export const DragFeedback: React.FC<DragFeedbackProps> = ({
  message,
  type = 'info',
  visible
}) => {
  if (!visible) return null;

  const typeStyles = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500'
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none animate-in">
      <div className={`${typeStyles[type]} text-white px-4 py-2 rounded-lg shadow-lg`}>
        {message}
      </div>
    </div>
  );
};