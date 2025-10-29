import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { AppMode, UserRole } from '@/types'
import clsx from 'clsx'

const NavLink = ({ to, icon, label, active, appMode, currentMode, setMode }) => {
  const navigate = useNavigate()
  const modeClass = {
    [AppMode.FLOW]: 'text-accent-dark dark:text-accent',
    [AppMode.HUB]: 'text-hub-accent-dark dark:text-hub-accent-light',
    [AppMode.WORKBENCH]: 'text-primary-dark dark:text-primary',
    [AppMode.STATISTICS]: 'text-primary dark:text-primary',
    [AppMode.SETTINGS]: 'text-text-light-secondary dark:text-text-dark-secondary',
  }
  const bgClass = {
    [AppMode.FLOW]: 'bg-accent/20 dark:bg-accent/10',
    [AppMode.HUB]: 'bg-hub-accent-light dark:bg-hub-accent/20',
    [AppMode.WORKBENCH]: 'bg-primary/20 dark:bg-primary/20',
    [AppMode.STATISTICS]: 'bg-primary/20 dark:bg-primary/30',
    [AppMode.SETTINGS]: 'bg-black/5 dark:bg-white/5',
  }

  const handleClick = () => {
    setMode(appMode)
    navigate(to)
  }

  return (
    <a
      href={to}
      onClick={(e) => { e.preventDefault(); handleClick(); }}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        active ? `${bgClass[appMode]} ${modeClass[appMode]}` : 'hover:bg-black/5 dark:hover:bg-white/5'
      )}
    >
      <span className={clsx("material-symbols-outlined", active ? modeClass[appMode] : 'text-text-light-secondary dark:text-text-dark-secondary')}>
        {icon}
      </span>
      <p className={clsx("text-sm font-medium leading-normal", active ? `font-bold ${modeClass[appMode]}` : '')}>
        {label}
      </p>
    </a>
  )
}

const FlowSidebar = ({ activePath }) => {
  const { mode, setMode } = useAppStore()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-center">
        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-10 bg-accent/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-accent-dark">hub</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-medium leading-normal">Flow Mode</h1>
          <p className="text-sm font-normal leading-normal text-text-light-secondary dark:text-text-dark-secondary">Agent Workflow Builder</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <NavLink to="/flow" icon="account_tree" label="Flows" active={activePath.startsWith('/flow')} appMode={AppMode.FLOW} currentMode={mode} setMode={setMode} />
        {/* Add other flow-related links here if needed */}
      </div>
    </div>
  )
}

const DefaultSidebar = ({ activePath }) => {
  const { user } = useAuthStore()
  const { mode, setMode } = useAppStore()

  const navItems = [
    { to: '/workbench', icon: 'code', label: 'Workbench', appMode: AppMode.WORKBENCH },
    { to: '/hub', icon: 'hub', label: 'Hub', appMode: AppMode.HUB },
    { to: '/flow', icon: 'timeline', label: 'Flow', appMode: AppMode.FLOW },
  ]

  if (user?.role === UserRole.ADMIN) {
    navItems.push({ to: '/statistics', icon: 'bar_chart', label: 'Statistics', appMode: AppMode.STATISTICS })
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCYAWRCFLeDKQEe8xsaQ-KCcSsiyuyFx1n1cg-LEjau4K7b0-vBkYNAbB0IxW_JjZAZAWIwCuHx_fx6vfVyCMN9SC8aLd9GK3c15Z_HTnSz2qOfubU25dlLcdjn7nmv7Z1hn1sESu5wZH0CYaZGcDU4iA3E5CH_mgAtw3PuSxcwZ9-E-V0SsZHHSD_bNrA7-ef8tYqR9rXWGdAcGsUpXXeiRHv22f0YzfeOWy8AsHvrOPGv3U4rrjkaBQOM5c0YtT1X4rJVF5-Z_K7N")` }}></div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold">A2G Platform</h1>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{user?.username}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {navItems.map(item => (
            <NavLink key={item.to} {...item} active={activePath.startsWith(item.to)} currentMode={mode} setMode={setMode} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <NavLink to="/settings" icon="settings" label="Settings" active={activePath.startsWith('/settings')} appMode={AppMode.SETTINGS} currentMode={mode} setMode={setMode} />
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">help</span>
            <p className="text-sm font-medium leading-normal">Help</p>
        </a>
      </div>
    </>
  )
}


export const Sidebar: React.FC = () => {
  const location = useLocation()
  const activePath = location.pathname

  const getSidebarContent = () => {
    if (activePath.startsWith('/flow')) {
      return <FlowSidebar activePath={activePath} />
    }
    // For Hub, Workbench, Statistics, Settings
    return <DefaultSidebar activePath={activePath} />
  }

  return (
    <aside className="flex h-full w-64 flex-col justify-between border-r border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark p-4 shrink-0">
      {getSidebarContent()}
    </aside>
  )
}