import React, { useState } from 'react';
import {
  LayoutDashboard,
  Map,
  BarChart3,
  Bell,
  ShieldAlert,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  MapPin,
  Settings,
  Radio,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Live Map', icon: Map },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

const Sidebar = ({
  activeSection,
  onSectionChange,
  isDark,
  setIsDark,
  lastSync,
  alertCount = 0,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const handleNav = (id) => {
    onSectionChange(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-bg-surface/95 backdrop-blur-lg border-b border-border-subtle">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 -ml-2 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-element transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <ShieldAlert className="text-orange-500 w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-text-main">HEATOUTT</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-element border border-border-subtle">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-text-main">LIVE</span>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-element transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-[58] flex flex-col
          bg-bg-surface border-r border-border-subtle
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[68px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Brand header */}
        <div className={`flex items-center border-b border-border-subtle h-16 shrink-0 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 shrink-0">
              <ShieldAlert className="text-orange-500 w-[18px] h-[18px]" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[15px] font-bold tracking-tight text-text-main leading-none">HEATOUTT</span>
                <span className="text-[9px] font-semibold tracking-[0.18em] text-text-muted uppercase mt-0.5">Civic Monitoring</span>
              </div>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className={`shrink-0 border-b border-border-subtle ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-bold tracking-wider text-green-500">SYSTEM ONLINE</span>
              </div>
              <span className="text-[10px] font-mono text-text-muted">
                {lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className={`${collapsed ? 'px-2' : 'px-3'}`}>
            {!collapsed && (
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] px-2 mb-2 block">Navigation</span>
            )}
            <div className="flex flex-col gap-0.5 mt-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`
                      group relative flex items-center gap-3 rounded-lg transition-all duration-200 text-left
                      ${collapsed ? 'justify-center p-2.5 mx-auto w-11 h-11' : 'px-3 py-2.5'}
                      ${
                        isActive
                          ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm'
                          : 'text-text-muted hover:text-text-main hover:bg-bg-element border border-transparent'
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-orange-500' : ''}`} />
                    {!collapsed && (
                      <span className={`text-[13px] font-semibold ${isActive ? 'text-orange-500' : ''}`}>
                        {item.label}
                      </span>
                    )}
                    {item.id === 'alerts' && alertCount > 0 && (
                      <span
                        className={`
                          ${collapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px]' : 'ml-auto text-[10px] px-1.5 py-0.5 min-w-[20px]'}
                          bg-red-500 text-white font-bold rounded-full flex items-center justify-center leading-none
                        `}
                      >
                        {alertCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location info */}
          {!collapsed && (
            <div className="px-3 mt-6">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] px-2 mb-2 block">Location</span>
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-bg-element border border-border-subtle mt-1">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-text-main">Bhubaneswar</div>
                  <div className="text-[10px] text-text-muted">Odisha, India</div>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Bottom controls */}
        <div className="shrink-0 border-t border-border-subtle">
          {/* Theme toggle */}
          <div className={`${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`
                flex items-center gap-3 rounded-lg transition-all duration-200 w-full
                text-text-muted hover:text-text-main hover:bg-bg-element border border-transparent
                ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}
              `}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-[18px] h-[18px] shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
              {!collapsed && <span className="text-[13px] font-semibold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </div>

          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:block px-2 py-2 border-t border-border-subtle">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center gap-2 rounded-lg p-2.5 w-full text-text-muted hover:text-text-main hover:bg-bg-element transition-all duration-200"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!collapsed && <span className="text-[11px] font-medium">Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
