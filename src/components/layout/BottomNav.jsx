import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, ScanLine, ShoppingBag, User } from 'lucide-react';

const NAV = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/clubs', icon: Trophy, label: 'Clubs' },
  { path: '/scan', icon: ScanLine, label: 'Scan', accent: true },
  { path: '/buy', icon: ShoppingBag, label: 'Buy' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-cin-dark border-t border-cin-border flex items-start pt-2.5 z-40">
      {NAV.map((item) => {
        const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
        const Icon = item.icon;
        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer">
            {item.accent ? (
              <div className="w-12 h-12 rounded-full bg-cin-cyan flex items-center justify-center -mt-5 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                <Icon className="w-5 h-5 text-cin-black" strokeWidth={2.5} />
              </div>
            ) : (
              <Icon className={`w-5 h-5 transition-colors ${active ? 'text-cin-cyan' : 'text-cin-muted'}`} strokeWidth={active ? 2.2 : 1.8} />
            )}
            <span className={`text-[10px] font-display font-semibold tracking-[0.04em] uppercase ${active ? 'text-cin-cyan' : 'text-cin-muted'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
