import React from 'react';
import { Settings, MapPin, ShieldAlert, Moon, Sun } from 'lucide-react';

const Navbar = ({ lastSync, isDark, setIsDark }) => {
  return (
    <nav className="bg-bg-surface/95 backdrop-blur-md border-b border-border-subtle sticky top-0 z-50 transition-colors">
      <div className="px-6 py-4 flex items-center justify-between max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <ShieldAlert className="text-orange-500 w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-text-main leading-none">HEATOUTT</h1>
            <span className="text-[10px] font-medium tracking-widest text-text-muted uppercase mt-1">Civic Monitoring</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-8">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-bg-element border border-border-subtle">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-text-main">LIVE</span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-text-muted">
            <MapPin className="w-4 h-4 text-text-muted" />
            Bhubaneswar
          </div>
          
          <div className="text-xs font-mono text-text-muted hidden md:block">
            SYNC: {lastSync ? lastSync.toLocaleTimeString() : 'JUST NOW'}
          </div>
          
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-md text-text-muted hover:text-text-main hover:bg-bg-element transition-all"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className="p-2 rounded-md text-text-muted hover:text-text-main hover:bg-bg-element transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
