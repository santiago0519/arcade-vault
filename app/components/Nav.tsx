'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useState } from 'react';
interface NavItem {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', isActive: (p) => p === '/' },
  {
    href: '/juegos',
    label: 'Biblioteca',
    isActive: (p) => p === '/juegos' || p.startsWith('/juegos/'),
  },
  { href: '/salon', label: 'Salón de la Fama', isActive: (p) => p.startsWith('/salon') },
  { href: '/acerca-de', label: 'Acerca de', isActive: (p) => p.startsWith('/acerca-de') },
];
const AUTH_ITEM: NavItem = {
  href: '/acceso',
  label: 'Iniciar Sesión',
  isActive: (p) => p.startsWith('/acceso'),
};
interface NavLinksProps {
  withAuth?: boolean;
  onNavigate?: () => void;
}
function LinkList({ pathname, withAuth, onNavigate }: NavLinksProps & { pathname: string | null }) {
  const items = withAuth ? [...NAV_ITEMS, AUTH_ITEM] : NAV_ITEMS;
  return items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className={pathname !== null && item.isActive(pathname) ? 'active' : ''}
      onClick={onNavigate}
    >
      {item.label}
    </Link>
  ));
}
function ActiveLinkList(props: NavLinksProps) {
  const pathname = usePathname();
  return <LinkList {...props} pathname={pathname} />;
}
// usePathname() se suspende al prerenderizar rutas con params desconocidos
// (p. ej. /juegos/[id] sin generateStaticParams). Solo los enlaces esperan;
// el fallback son los mismos enlaces sin estado activo.
function NavLinks(props: NavLinksProps) {
  return (
    <Suspense fallback={<LinkList {...props} pathname={null} />}>
      <ActiveLinkList {...props} />
    </Suspense>
  );
}
export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <NavLinks />
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        <Link href="/acceso" className="btn auth-btn">
          Iniciar Sesión
        </Link>
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div className={'av-mobile-backdrop' + (open ? ' open' : '')} onClick={close}></div>
      <aside className={'av-mobile-panel' + (open ? ' open' : '')}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <NavLinks withAuth onNavigate={close} />
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.16em' }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
