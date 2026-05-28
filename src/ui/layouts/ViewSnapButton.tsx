interface ViewSnapButtonProps {
  label?: string;
  title?: string;
  disabled?: boolean;
  onSnap: () => void;
}

export function ViewSnapButton({
  label = 'SNAP',
  title = 'Save screenshot',
  disabled = false,
  onSnap,
}: ViewSnapButtonProps) {
  return (
    <button
      type="button"
      className="view-snap-btn"
      disabled={disabled}
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onSnap();
      }}
    >
      {label}
    </button>
  );
}
