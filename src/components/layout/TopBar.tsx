import { Link, NavLink } from 'react-router-dom';

const navLinkBase =
  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors border border-transparent';

const activeClasses = 'bg-slate-800 text-amber-400 border-slate-600';
const inactiveClasses =
  'text-slate-200 hover:text-amber-300 hover:bg-slate-800/60 border-slate-700/40';

export function TopBar() {
  return (
    <header className="app-surface app-border border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/catalogue" className="flex items-baseline gap-2">
          <span className="font-mono text-xs tracking-[0.25em] uppercase text-slate-400">
            RPOS
          </span>
          <span className="text-sm font-semibold text-slate-100">
            {import.meta.env.VITE_APP_NAME ?? 'Refinery PO System'}
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-xs font-medium">
          <NavLink
            to="/catalogue"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            Catalogue
          </NavLink>
          <NavLink
            to="/po/draft"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            Draft
          </NavLink>
          <NavLink
            to="/po"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            Purchase Orders
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default TopBar;

