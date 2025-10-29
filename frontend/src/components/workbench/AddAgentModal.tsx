import React, { useState } from 'react'
import { AgentFramework, type Agent } from '@/types'
import { useAgentStore } from '@/stores/agentStore'
import toast from 'react-hot-toast'

interface AddAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (agent: Agent) => void
}

export const AddAgentModal: React.FC<AddAgentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createAgent, isLoading } = useAgentStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [framework, setFramework] = useState<AgentFramework | ''>('')
  const [color, setColor] = useState('rgb(34, 197, 94)')

  if (!isOpen) return null

  const isFormValid = name && description && framework;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      toast.error('Please fill in all required fields.')
      return
    }

    try {
      const agentData: Partial<Agent> = {
        name,
        title: name,
        description,
        framework: framework as AgentFramework,
        card_color: color,
        status: 'DEVELOPMENT' as any,
        visibility: 'private' as any,
      }
      const newAgent = await createAgent(agentData)
      toast.success('Agent created successfully!')
      onSuccess?.(newAgent)
      onClose()
    } catch (error) {
      console.error('Failed to create agent:', error)
      toast.error('Failed to create agent')
    }
  }

  const cardColors = [
    "rgb(239, 68, 68)", "rgb(249, 115, 22)", "rgb(234, 179, 8)", "rgb(34, 197, 94)",
    "rgb(59, 130, 246)", "rgb(99, 102, 241)", "rgb(139, 92, 246)", "rgb(217, 70, 239)"
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-display">
      <div className="relative w-full max-w-2xl transform rounded-xl bg-background-light dark:bg-[#1f1c26] text-gray-800 dark:text-white shadow-2xl transition-all">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#433c53]">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">Create New Agent</h2>
            <p className="text-sm text-gray-500 dark:text-[#a59db8]">Fill in the details below to set up your new agent.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 dark:text-[#a59db8] hover:bg-gray-100 dark:hover:bg-[#433c53]" type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <label className="flex flex-col">
              <p className="text-base font-medium leading-normal pb-2">Agent Name</p>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg bg-white dark:bg-[#131118] text-gray-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#433c53] h-12 placeholder:text-gray-400 dark:placeholder:text-[#a59db8] px-4 text-base font-normal leading-normal"
                placeholder="Enter a unique name for your agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="flex flex-col">
              <p className="text-base font-medium leading-normal pb-2">Description</p>
              <textarea
                className="form-input flex w-full min-w-0 flex-1 resize-y overflow-hidden rounded-lg bg-white dark:bg-[#131118] text-gray-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#433c53] min-h-28 placeholder:text-gray-400 dark:placeholder:text-[#a59db8] p-4 text-base font-normal leading-normal"
                placeholder="Provide a brief description of what this agent does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </label>
            <label className="flex flex-col">
              <p className="text-base font-medium leading-normal pb-2">Framework</p>
              <select
                className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg bg-white dark:bg-[#131118] text-gray-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#433c53] h-12 px-4 text-base font-normal leading-normal"
                value={framework}
                onChange={(e) => setFramework(e.target.value as AgentFramework | '')}
              >
                <option disabled value="">Select a framework</option>
                <option value={AgentFramework.AGNO}>Agno</option>
                <option value={AgentFramework.LANGCHAIN}>LangChain</option>
                <option value={AgentFramework.AUTOGEN}>AutoGen</option>
              </select>
            </label>
            <div>
              <p className="text-base font-medium leading-normal pb-2">Card Color</p>
              <div className="flex flex-wrap gap-3 pt-1">
                {cardColors.map(c => (
                  <label key={c} className="relative size-9 cursor-pointer rounded-full border-2 border-transparent ring-2 ring-gray-200 dark:ring-[#433c53] ring-offset-2 ring-offset-background-light dark:ring-offset-[#1f1c26] has-[:checked]:ring-primary" style={{ backgroundColor: c }}>
                    <input
                      type="radio"
                      name="card-color"
                      className="invisible absolute"
                      checked={color === c}
                      onChange={() => setColor(c)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-[#433c53]">
            <button onClick={onClose} type="button" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-white/10">
              Cancel
            </button>
            <button type="submit" disabled={!isFormValid || isLoading} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50">
              {isLoading ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}