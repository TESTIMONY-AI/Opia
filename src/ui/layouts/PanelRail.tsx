import type { ReactNode } from 'react';

interface PanelRailProps {
  side: 'left' | 'right';
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function PanelRail({
  side,
  title,
  collapsed,
  onToggle,
  children,
}: PanelRailProps) {
  const chevron =
    side === 'left'
      ? collapsed
        ? '›'
        : '‹'
      : collapsed
        ? '‹'
        : '›';

  return (
    <div
      className={[
        'panel-rail',
        `panel-rail--${side}`,
        collapsed ? 'panel-rail--collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={`panel-rail__toggle panel-rail__toggle--${side}`}
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Show ${title}` : `Hide ${title}`}
        title={collapsed ? `Show ${title}` : `Hide ${title}`}
      >
        {chevron}
      </button>
      {collapsed ? (
        <span className="panel-rail__label" aria-hidden>
          {title}
        </span>
      ) : (
        <div className="panel-rail__body">{children}</div>
      )}
    </div>
  );
}
