import { IconChartBar, IconDashboard, IconSettings, IconX } from '@tabler/icons-react';

import { PixelMark } from './PixelMark';

const navMain = [
  { title: 'Dashboard', icon: IconDashboard, active: true },
  { title: 'Analytics', icon: IconChartBar },
  { title: 'Settings', icon: IconSettings },
] as const;

type AppSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function AppSidebar({ open = true, onClose }: AppSidebarProps) {
  return (
    <aside
      id="db-sidebar"
      className="db-sidebar"
      aria-label="Primary"
      aria-hidden={!open || undefined}
    >
      <div className="db-sidebar__header">
        <a href="/" className="db-brand">
          <PixelMark />
          <span className="db-brand__name">dune</span>
        </a>
        {onClose ? (
          <button
            type="button"
            className="db-sidebar__close"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <IconX size={18} stroke={2.25} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="db-sidebar__content">
        <div className="db-nav-group">
          <ul className="db-nav">
            {navMain.map((item) => (
              <li key={item.title}>
                <button
                  type="button"
                  className={`db-nav__item${'active' in item && item.active ? ' is-active' : ''}`}
                  aria-current={'active' in item && item.active ? 'page' : undefined}
                >
                  <span className="db-nav__icon">
                    <item.icon size={16} stroke={2.25} aria-hidden />
                  </span>
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="db-sidebar__footer">
        <button type="button" className="db-user">
          <span className="db-user__avatar">KM</span>
          <span className="db-user__meta">
            <span className="db-user__name">Kynes</span>
            <span className="db-user__email">kynes@dune.ops</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
