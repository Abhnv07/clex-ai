import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

// Dashboard nav points to the Clex AI marketing site (ai.clex.in), not
// clex.in (the file-transfer product). The dashboard itself ships next to
// the API at api.ai.clex.in/dashboard, so these are external links to the
// public site.
const navItems = [
  { href: 'https://ai.clex.in/', label: 'Platform' },
  { href: 'https://ai.clex.in/models.html', label: 'Models' },
  { href: 'https://ai.clex.in/docs.html', label: 'Docs' },
  { href: 'https://ai.clex.in/playground.html', label: 'Playground' },
  { href: 'https://ai.clex.in/pricing.html', label: 'Pricing' },
  { href: 'https://ai.clex.in/support.html', label: 'Support' },
];

export default function SiteHeader() {
  const location = useLocation();
  const { loading, user, signOutUser } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      id="main-header"
      className={[
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-[#02050f]/80 border-b border-white/10 py-4 backdrop-blur-md'
          : 'py-6',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 md:px-12 lg:px-20">
        <a href="https://ai.clex.in/" className="flex items-center gap-1.5 no-underline">
          <span className="text-xl font-bold tracking-widest text-white">CLEX</span>
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9a96e] shadow-[0_0_10px_rgba(201,169,110,0.8)]" />
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400 sm:flex">
              <div className="spinner" />
              <span>Checking session</span>
            </div>
          ) : user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c9a96e]" />
                <span>{user.email || 'Signed in'}</span>
              </div>
              <Link
                to="/"
                className={`text-sm font-medium transition-colors no-underline ${
                  location.pathname === '/' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                Sign Out
              </button>
              <a
                href="https://ai.clex.in/docs.html#getting-started"
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white no-underline transition-all hover:bg-white hover:text-black"
              >
                API Docs
              </a>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-medium text-gray-400 transition-colors no-underline hover:text-white sm:block"
              >
                Sign In
              </Link>
              <a
                href="https://ai.clex.in/docs.html#getting-started"
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white no-underline transition-all hover:bg-white hover:text-black"
              >
                Get Started
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
