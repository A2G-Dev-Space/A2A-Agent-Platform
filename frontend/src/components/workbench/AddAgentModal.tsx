import React, { useState } from 'react'
import { X, Info } from 'lucide-react'
import { AgentFramework, type Agent } from '@/types'
import { useAgentStore } from '@/stores/agentStore'
import toast from 'react-hot-toast'

interface AddAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (agent: Agent) => void
}

export const AddAgentModal: React.FC<AddAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createAgent, isLoading } = useAgentStore()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    framework: AgentFramework.AGNO,
    a2a_endpoint: '',
    skill_kr: '',
    skill_en: '',
    logo_url: '',
    card_color: '#E9D5FF',
    is_public: false,
    visibility: 'PRIVATE' as 'ALL' | 'TEAM' | 'PRIVATE',
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.description) {
      toast.error('Name and description are required')
      return
    }

    try {
      const skills = [
        ...formData.skill_kr.split(',').filter(s => s.trim()),
        ...formData.skill_en.split(',').filter(s => s.trim())
      ].map(s => s.trim())

      const agentData: Partial<Agent> = {
        name: formData.name,
        title: formData.name,
        description: formData.description,
        framework: formData.framework,
        a2a_endpoint: formData.a2a_endpoint || `http://localhost:8080/${formData.name.toLowerCase()}`,
        capabilities: {
          skills,
        },
        logo_url: formData.logo_url || undefined,
        card_color: formData.card_color,
        is_public: formData.visibility === 'ALL',
        department: formData.visibility === 'TEAM' ? 'current_team' : undefined,
        status: 'DEVELOPMENT' as any,
        health_status: 'unknown' as any,
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

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, card_color: e.target.value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-bold">Create New Agent</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              placeholder="Customer Support Agent"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              maxLength={500}
              placeholder="An agent that handles customer inquiries and provides support..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={4}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500
            </p>
          </div>

          {/* Framework */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Framework <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.framework}
              onChange={(e) => setFormData({ ...formData, framework: e.target.value as AgentFramework })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={AgentFramework.AGNO}>Agno</option>
              <option value={AgentFramework.ADK}>ADK</option>
              <option value={AgentFramework.LANGCHAIN}>Langchain</option>
              <option value={AgentFramework.CUSTOM}>Custom</option>
            </select>
            <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
              <Info size={12} className="mt-0.5" />
              Choose the framework your agent is built with
            </p>
          </div>

          {/* A2A Endpoint */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              A2A Endpoint URL
            </label>
            <input
              type="url"
              placeholder="http://localhost:8080/agent"
              value={formData.a2a_endpoint}
              onChange={(e) => setFormData({ ...formData, a2a_endpoint: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Skills (Korean)
              </label>
              <input
                type="text"
                placeholder="고객지원, 챗봇, 상담"
                value={formData.skill_kr}
                onChange={(e) => setFormData({ ...formData, skill_kr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Skills (English)
              </label>
              <input
                type="text"
                placeholder="support, chatbot, consultation"
                value={formData.skill_en}
                onChange={(e) => setFormData({ ...formData, skill_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Logo URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/logo.png"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Card Color */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Card Color
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={formData.card_color}
                onChange={handleColorChange}
                className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={formData.card_color}
                onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm"
                placeholder="#E9D5FF"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Visibility <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="ALL"
                  checked={formData.visibility === 'ALL'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <span className="font-medium">Public</span>
                  <p className="text-xs text-gray-500">Visible to all users</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="TEAM"
                  checked={formData.visibility === 'TEAM'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <span className="font-medium">Team</span>
                  <p className="text-xs text-gray-500">Visible to your team only</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="PRIVATE"
                  checked={formData.visibility === 'PRIVATE'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <span className="font-medium">Private (Default)</span>
                  <p className="text-xs text-gray-500">Visible to you only</p>
                </div>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <span className="loading-spinner" />}
            Create Agent
          </button>
        </div>
      </div>
    </div>
  )
}