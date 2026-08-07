import { NavLink, Outlet } from 'react-router';

import { cn } from '@/lib/utils';

const NAV_LINK_CLASS =
  'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors';

export default function App() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <nav className="border-border/60 border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-1 p-4 md:px-8">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(NAV_LINK_CLASS, isActive && 'bg-muted text-foreground font-medium')
            }
          >
            Playground
          </NavLink>
          <NavLink
            to="/showcase"
            className={({ isActive }) =>
              cn(NAV_LINK_CLASS, isActive && 'bg-muted text-foreground font-medium')
            }
          >
            Showcase
          </NavLink>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
