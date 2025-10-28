import { useState } from 'react';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import Button from '@/components/common/Button';
import { AgentFramework } from '@/types';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentFormData) => Promise<void>;
}

export interface AgentFormData {
  name: string;
  description: string;
  framework: AgentFramework;
  agno_base_url?: string;
  agno_agent_id?: string;
  a2a_endpoint?: string;
  custom_endpoint?: string;
  skill_kr?: string;
  skill_en?: string;
}

export default function AddAgentModal({ isOpen, onClose, onSubmit }: AddAgentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    framework: 'Agno',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        framework: 'Agno',
      });
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 에이전트 만들기" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label="에이전트 이름"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="예: Customer Support Agent"
        />

        {/* Description */}
        <Textarea
          label="설명"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          rows={3}
          placeholder="이 에이전트가 무엇을 하는지 설명해주세요"
        />

        {/* Framework */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            프레임워크 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.framework}
            onChange={(e) => setFormData({ ...formData, framework: e.target.value as AgentFramework })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="Agno">Agno</option>
            <option value="ADK">ADK (Agent Development Kit)</option>
            <option value="Langchain">Langchain</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        {/* Framework-specific fields */}
        {formData.framework === 'Agno' && (
          <>
            <Input
              label="Agno Base URL"
              value={formData.agno_base_url || ''}
              onChange={(e) => setFormData({ ...formData, agno_base_url: e.target.value })}
              placeholder="http://localhost:9080"
              required
            />
            <Input
              label="Agno Agent ID"
              value={formData.agno_agent_id || ''}
              onChange={(e) => setFormData({ ...formData, agno_agent_id: e.target.value })}
              placeholder="customer-support-agent"
              required
            />
          </>
        )}

        {(formData.framework === 'ADK' || formData.framework === 'Langchain') && (
          <Input
            label="A2A Endpoint"
            value={formData.a2a_endpoint || ''}
            onChange={(e) => setFormData({ ...formData, a2a_endpoint: e.target.value })}
            placeholder="https://agent.example.com/.well-known/agent-card.json"
            required
          />
        )}

        {formData.framework === 'Custom' && (
          <Input
            label="Custom Endpoint"
            value={formData.custom_endpoint || ''}
            onChange={(e) => setFormData({ ...formData, custom_endpoint: e.target.value })}
            placeholder="https://my-agent.example.com/api"
            required
          />
        )}

        {/* Skills */}
        <Input
          label="스킬 (한글)"
          value={formData.skill_kr || ''}
          onChange={(e) => setFormData({ ...formData, skill_kr: e.target.value })}
          placeholder="고객지원, 챗봇, Q&A (쉼표로 구분)"
        />

        <Input
          label="스킬 (영문)"
          value={formData.skill_en || ''}
          onChange={(e) => setFormData({ ...formData, skill_en: e.target.value })}
          placeholder="customer support, chatbot, q&a (comma separated)"
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
            생성
          </Button>
        </div>
      </form>
    </Modal>
  );
}
