import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Wrench, Building, Zap, Settings } from 'lucide-react'
import { AppMode } from '@/types'
import { useAppStore } from '@/stores/appStore'
import clsx from 'clsx'

interface SidebarButtonProps {
  icon: React.ReactNode
  label: string
  active: boolean
  color: 'purple' | 'sky' | 'teal' | 'gray'
  onClick: () => void
}

const SidebarButton: React.FC<SidebarButtonProps> = ({
  icon,
  label,
  active,
  color,
  onClick,
}) => {
  const bgColorMap = {
    purple: active ? 'bg-purple-200 dark:bg-purple-800' : 'bg-transparent',
    sky: active ? 'bg-sky-200 dark:bg-sky-800' : 'bg-transparent',
    teal: active ? 'bg-teal-200 dark:bg-teal-800' : 'bg-transparent',
    gray: active ? 'bg-gray-200 dark:bg-gray-700' : 'bg-transparent',
  }

  const textColorMap = {
    purple: 'text-purple-700 dark:text-purple-300',
    sky: 'text-sky-700 dark:text-sky-300',
    teal: 'text-teal-700 dark:text-teal-300',
    gray: 'text-gray-700 dark:text-gray-300',
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-12 h-12 rounded-lg flex items-center justify-center',
        'transition-all duration-200 group relative',
        bgColorMap[color],
        'hover:bg-gray-200 dark:hover:bg-gray-700',
        active && textColorMap[color]
      )}
      title={label}
      aria-label={label}
    >
      <span className="text-xl">{icon}</span>
      {/* Tooltip */}
      <span className={clsx(
        'absolute left-14 px-2 py-1 text-xs font-medium',
        'bg-gray-900 text-white rounded whitespace-nowrap',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
        'pointer-events-none z-50'
      )}>
        {label}
      </span>
    </button>
  )
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, setMode } = useAppStore()

  const currentPath = location.pathname
  const isSettings = currentPath.startsWith('/settings')

  const handleModeChange = (newMode: AppMode, path: string) => {
    setMode(newMode)
    navigate(path)
  }

  return (
    <aside className="w-16 h-screen flex flex-col bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Mode buttons */}
      <div className="flex flex-col gap-2 p-2">
        <SidebarButton
          icon={<Wrench size={24} />}
          label="Workbench"
          active={mode === AppMode.WORKBENCH && !isSettings}
          color="purple"
          onClick={() => handleModeChange(AppMode.WORKBENCH, '/workbench')}
        />
        <SidebarButton
          icon={<Building size={24} />}
          label="Hub"
          active={mode === AppMode.HUB && !isSettings}
          color="sky"
          onClick={() => handleModeChange(AppMode.HUB, '/hub')}
        />
        <SidebarButton
          icon={<Zap size={24} />}
          label="Flow"
          active={mode === AppMode.FLOW && !isSettings}
          color="teal"
          onClick={() => handleModeChange(AppMode.FLOW, '/flow')}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings button */}
      <div className="flex flex-col gap-2 p-2 border-t border-gray-200 dark:border-gray-800">
        <SidebarButton
          icon={<Settings size={24} />}
          label="Settings"
          active={isSettings}
          color="gray"
          onClick={() => navigate('/settings/general')}
        />
      </div>
    </aside>
  )
}