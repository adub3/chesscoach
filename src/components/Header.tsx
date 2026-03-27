import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ScrambleText } from './ScrambleText';

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/diagnostics', label: 'Diagnostics' },
    { path: '/puzzles', label: 'Puzzles' },
    { path: '/about', label: 'About' },
  ];

  return (
    <header className="w-full z-50 bg-white flex flex-col md:flex-row items-center justify-center px-8 md:px-16 py-4 md:py-6 relative">
      <nav className="flex items-center gap-8 md:gap-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center justify-center py-4 text-xs md:text-sm uppercase tracking-widest font-bold whitespace-nowrap text-black`}
            >
              <span className="relative">
                <ScrambleText text={item.label} />
                <span className={`absolute left-0 -bottom-1 w-full h-[1px] bg-black transition-transform origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
