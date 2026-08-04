import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconX,
} from '@tabler/icons-react';

import { PixelMark } from './PixelMark';

const navMain = [
  { title: 'Dashboard', icon: IconDashboard, active: true },
  { title: 'Lifecycle', icon: IconListDetails },
  { title: 'Analytics', icon: IconChartBar },
  { title: 'Projects', icon: IconFolder },
  { title: 'Team', icon: IconUsers },
] as const;

const documents = [
  { title: 'Data Library', icon: IconDatabase },
  { title: 'Reports', icon: IconReport },
  { title: 'Word Assistant', icon: IconFolder },
] as const;

const secondary = [
  { title: 'Settings', icon: IconSettings },
  { title: 'Get Help', icon: IconHelp },
  { title: 'Search', icon: IconSearch },
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
        <a href="#" className="db-brand" onClick={(e) => e.preventDefault()}>
          <PixelMark />
          <span className="db-brand__name">dune Inc.</span>
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
          <button type="button" className="db-quick">
            Quick Create
          </button>
          <ul className="db-nav">
            {navMain.map((item) => (
              <li key={item.title}>
                <button
                  type="button"
                  className={`db-nav__item${'active' in item && item.active ? ' is-active' : ''}`}
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

        <div className="db-nav-group">
          <p className="db-nav-group__label">Documents</p>
          <ul className="db-nav">
            {documents.map((item) => (
              <li key={item.title}>
                <button type="button" className="db-nav__item">
                  <span className="db-nav__icon">
                    <item.icon size={16} stroke={2.25} aria-hidden />
                  </span>
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="db-nav-group db-nav-group--foot">
          <ul className="db-nav">
            {secondary.map((item) => (
              <li key={item.title}>
                <button type="button" className="db-nav__item">
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
