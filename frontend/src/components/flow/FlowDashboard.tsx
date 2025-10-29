import React from 'react'

const DraggableNode = ({ icon, label }) => (
  <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-border-light dark:border-border-dark cursor-grab hover:bg-black/5 dark:hover:bg-white/5">
    <span className="material-symbols-outlined text-lg">{icon}</span>
    <p className="text-xs text-center">{label}</p>
  </div>
)

const NodePanel = () => (
  <div className="w-72 flex-shrink-0 flex flex-col gap-4 bg-panel-light dark:bg-panel-dark rounded-xl border border-border-light dark:border-border-dark p-4">
    <input
      className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm focus:ring-accent-dark focus:border-accent-dark"
      placeholder="Search nodes..."
      type="text"
    />
    <div className="flex flex-col gap-4 overflow-y-auto pr-2">
      <div>
        <h3 className="text-xs font-semibold uppercase text-text-light-secondary dark:text-text-dark-secondary mb-2">Triggers</h3>
        <div className="grid grid-cols-2 gap-2">
          <DraggableNode icon="api" label="API Call" />
          <DraggableNode icon="play_arrow" label="Manual Start" />
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase text-text-light-secondary dark:text-text-dark-secondary mb-2">Agents</h3>
        <div className="grid grid-cols-2 gap-2">
          <DraggableNode icon="travel_explore" label="Research" />
          <DraggableNode icon="analytics" label="Data Analyst" />
          <DraggableNode icon="draw" label="Writer Agent" />
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase text-text-light-secondary dark:text-text-dark-secondary mb-2">Logic</h3>
        <div className="grid grid-cols-2 gap-2">
          <DraggableNode icon="call_split" label="Conditional" />
          <DraggableNode icon="account_tree" label="Parallel" />
        </div>
      </div>
    </div>
  </div>
)

const CanvasPanel = () => (
  <div className="flex-1 flex flex-col relative bg-panel-light dark:bg-panel-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
    <div className="absolute top-0 left-0 right-0 z-10 p-3">
      <div className="flex justify-between gap-2 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm p-2 rounded-lg border border-border-light dark:border-border-dark w-fit mx-auto">
        <div className="flex gap-1">
          <button className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><span className="material-symbols-outlined text-xl">zoom_in</span></button>
          <button className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><span className="material-symbols-outlined text-xl">zoom_out</span></button>
          <button className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><span className="material-symbols-outlined text-xl">fit_screen</span></button>
          <button className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><span className="material-symbols-outlined text-xl">download</span></button>
        </div>
        <div className="w-px bg-border-light dark:bg-border-dark mx-2"></div>
        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 bg-accent-dark text-slate-900 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4">
          <span className="material-symbols-outlined text-lg">play_arrow</span>
          <span className="truncate">Run Flow</span>
        </button>
      </div>
    </div>
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-border-light dark:border-border-dark px-6 py-14">
        <div className="flex max-w-[480px] flex-col items-center gap-2">
          <p className="text-lg font-bold leading-tight tracking-[-0.015em] max-w-[480px] text-center">Start Building Your Flow</p>
          <p className="text-sm font-normal leading-normal max-w-[480px] text-center text-text-light-secondary dark:text-text-dark-secondary">Drag a node from the left panel onto this canvas to begin creating your multi-agent workflow.</p>
        </div>
        <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-[#2d2938] text-sm font-bold leading-normal tracking-[0.015em]">
          <span className="truncate">Add a Trigger</span>
        </button>
      </div>
    </div>
  </div>
)

const ConfigPanel = () => (
  <div className="w-80 flex-shrink-0 flex flex-col gap-4 bg-panel-light dark:bg-panel-dark rounded-xl border border-border-light dark:border-border-dark p-4">
    <h3 className="text-base font-bold">Configuration</h3>
    <div className="flex flex-col items-center justify-center h-full text-center">
      <span className="material-symbols-outlined text-5xl text-text-light-secondary dark:text-text-dark-secondary">touch_app</span>
      <p className="text-sm mt-2 text-text-light-secondary dark:text-text-dark-secondary">Select a node to configure its properties.</p>
    </div>
  </div>
)


export const FlowDashboard: React.FC = () => {
  return (
    <div className="flex flex-col p-6 flex-1 bg-background-light dark:bg-background-dark">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-bold leading-tight tracking-[-0.033em]">Customer Support Workflow</p>
          <p className="text-base font-normal leading-normal text-text-light-secondary dark:text-text-dark-secondary">Automate the process of handling incoming customer support tickets.</p>
        </div>
        <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-[#2d2938] text-sm font-bold leading-normal tracking-[0.015em]">
          <span className="truncate">Save Flow</span>
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <NodePanel />
        <CanvasPanel />
        <ConfigPanel />
      </div>
    </div>
  )
}