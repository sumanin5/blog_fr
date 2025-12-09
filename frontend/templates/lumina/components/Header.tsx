import React from 'react';
import { PenTool, Search, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { useTheme } from './ThemeContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
        <div className="mr-4 hidden md:flex cursor-pointer" onClick={() => navigate('/')}>
          <div className="mr-6 flex items-center space-x-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
               <PenTool className="h-5 w-5 text-primary animate-pulse-slow" />
            </div>
            <span className="hidden font-bold sm:inline-block tracking-tight font-mono">LUMINA_OS</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
             <Link 
              className={`transition-colors hover:text-primary ${location.pathname === '/' ? 'text-foreground font-bold' : 'text-foreground/60'}`} 
              to="/"
            >
              /HOME
            </Link>
            <Link 
              className={`transition-colors hover:text-primary ${isActive('/blog') ? 'text-foreground font-bold' : 'text-foreground/60'}`} 
              to="/blog"
            >
              /BLOG
            </Link>
            <a className="transition-colors hover:text-primary text-foreground/60" href="#">/ABOUT</a>
          </nav>
        </div>
        
        {/* Mobile Logo */}
        <div className="flex md:hidden cursor-pointer" onClick={() => navigate('/')}>
             <PenTool className="h-6 w-6 mr-2 text-primary" />
             <span className="font-bold font-mono">LUMINA</span>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none hidden sm:block">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="search" 
                placeholder="Search database..." 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-64"
              />
            </div>
          </div>
          <nav className="flex items-center gap-1">
             <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
             </Button>
             
             <div className="mx-2 h-4 w-px bg-border/50" />

             <Link to="/login">
               <Button 
                  variant={location.pathname === '/login' ? 'default' : 'ghost'} 
                  size="sm"
               >
                  Sign In
               </Button>
             </Link>
             <Link to="/register">
               <Button 
                  variant="tech" 
                  size="sm"
               >
                  Register
               </Button>
             </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};