import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Input, Textarea, Button } from '@/components/ui';
import { type Agent, AgentFramework, AgentStatus, HealthStatus } from '@/types';
import { agentService } from '@/services/agentService';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: Agent | null;  // Optional agent for edit mode
}

const agentSchema = z.object({
  name: z.string().min(3, 'Agent name must be at least 3 characters').max(50, 'Agent name must be less than 50 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  framework: z.nativeEnum(AgentFramework, { required_error: 'Framework selection is required' }),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format X.Y.Z (e.g., 1.0.0)').optional().or(z.literal('')),
  documentationUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  color: z.string(),
  capabilities: z.array(z.string()).min(1, 'Select at least one capability'),
});

type AgentFormData = z.infer<typeof agentSchema>;

const colorSwatches = [
  '#DBEAFE', // blue
  '#D1FAE5', // green
  '#FEF3C7', // amber
  '#FEE2E2', // red
  '#F3E8FF', // purple
  '#E5E7EB', // gray
  '#E0F2FE', // sky
  '#FCE7F3', // pink
];

const capabilities = [
  'Chat',
  'Code Generation',
  'Data Analysis',
  'File Processing',
  'Image Generation',
  'Web Search',
  'API Integration',
  'Task Automation',
];

const AddAgentModal: React.FC<AddAgentModalProps> = ({ isOpen, onClose, agent }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!agent;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: agent?.name || '',
      description: agent?.description || '',
      version: agent?.capabilities?.version || '1.0.0',
      documentationUrl: '',
      logoUrl: agent?.logo_url || '',
      color: agent?.card_color || colorSwatches[4], // purple default
      capabilities: agent?.capabilities?.skills || [],
    },
  });

  // Reset form when modal opens/closes or agent changes
  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: agent?.name || '',
        description: agent?.description || '',
        version: agent?.capabilities?.version || '1.0.0',
        documentationUrl: '',
        logoUrl: agent?.logo_url || '',
        color: agent?.card_color || colorSwatches[4],
        capabilities: agent?.capabilities?.skills || [],
      });
    }
  }, [isOpen, agent, reset]);

  const selectedColor = watch('color');
  const selectedCapabilities = watch('capabilities');
  const [customCapability, setCustomCapability] = useState('');

  const onSubmit = async (data: AgentFormData) => {
    console.log('Form data:', data);
    try {
      if (isEditMode && agent) {
        // Update existing agent
        await agentService.updateAgent(agent.id, {
          name: data.name,
          description: data.description,
          framework: data.framework,
          capabilities: {
            skills: data.capabilities,
            version: data.version || '1.0.0',
            description: data.description,
          },
          card_color: data.color,
          logo_url: data.logoUrl || undefined,
        });
      } else {
        // Create new agent
        await agentService.createAgent({
          name: data.name,
          description: data.description,
          framework: data.framework,
          // a2a_endpoint will be added later via Chat&Debug connection
          capabilities: {
            skills: data.capabilities,
            version: data.version || '1.0.0',
            description: data.description,
          },
          card_color: data.color,
          logo_url: data.logoUrl || undefined,
          status: AgentStatus.DEVELOPMENT,
          visibility: 'private', // Default to private for new agents
          is_public: false,
          health_status: HealthStatus.UNKNOWN,
        });
      }

      // Invalidate and refetch the agents list
      queryClient.invalidateQueries({ queryKey: ['developmentAgents'] });

      // Close modal
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} agent:`, error);
      // TODO: Show error toast notification
    }
  };

  const toggleCapability = (capability: string) => {
    const current = selectedCapabilities || [];
    if (current.includes(capability)) {
      setValue(
        'capabilities',
        current.filter((c) => c !== capability)
      );
    } else {
      setValue('capabilities', [...current, capability]);
    }
  };

  const addCustomCapability = () => {
    if (customCapability.trim()) {
      const current = selectedCapabilities || [];
      if (!current.includes(customCapability.trim())) {
        setValue('capabilities', [...current, customCapability.trim()]);
        setCustomCapability('');
      }
    }
  };

  const removeCapability = (capability: string) => {
    const current = selectedCapabilities || [];
    setValue(
      'capabilities',
      current.filter((c) => c !== capability)
    );
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      title={isEditMode ? 'Edit Agent' : t('createAgent.title', 'Create New Agent')}
      description={isEditMode ? 'Update your agent details below.' : t('createAgent.subtitle', 'Fill in the details below to set up your new agent.')}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body className="space-y-6">
          {/* Logo & Color + Name & Description Section */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-6 items-start">
            {/* Left: Name & Description */}
            <div className="space-y-6">
              <Input
                label={t('createAgent.nameLabel', 'Name')}
                placeholder={t('createAgent.namePlaceholder', 'Enter a unique name for your agent')}
                error={errors.name?.message}
                {...register('name')}
              />
              <Textarea
                label={t('createAgent.descriptionLabel', 'Description')}
                placeholder={t('createAgent.descriptionPlaceholder', 'Provide a brief description of what this agent does')}
                error={errors.description?.message}
                {...register('description')}
              />
            </div>

            {/* Right: Color Picker */}
            <div className="flex flex-col gap-4 items-center">
              <p className="text-base font-medium w-full md:text-center">Card Color</p>
              <div className="flex flex-row md:flex-col gap-4">
                {/* Color Picker */}
                <div>
                  <div className="grid grid-cols-4 gap-2">
                    {colorSwatches.map((color) => (
                      <label key={color} className="cursor-pointer">
                        <input
                          type="radio"
                          className="sr-only peer"
                          value={color}
                          {...register('color')}
                        />
                        <div
                          className={`w-8 h-8 rounded-full ring-2 transition-all ${
                            selectedColor === color
                              ? 'ring-workbench-primary'
                              : 'ring-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo URL */}
          <Input
            label={
              <span>
                {t('createAgent.logoUrlLabel', 'Logo URL')}{' '}
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">(Optional)</span>
              </span>
            }
            placeholder="https://example.com/logo.png"
            type="url"
            error={errors.logoUrl?.message}
            {...register('logoUrl')}
          />

          {/* Version */}
          <Input
            label={
              <span>
                {t('createAgent.versionLabel', 'Version')}{' '}
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">(Optional, defaults to 1.0.0)</span>
              </span>
            }
            placeholder="1.0.0"
            error={errors.version?.message}
            {...register('version')}
          />

          {/* Documentation URL */}
          <Input
            label={
              <span>
                {t('createAgent.documentationUrlLabel', 'Documentation URL')}{' '}
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">(Optional)</span>
              </span>
            }
            placeholder="https://docs.example.com/agent"
            type="url"
            error={errors.documentationUrl?.message}
            {...register('documentationUrl')}
          />

          {/* Framework */}
          <div className="flex flex-col">
            <label className="text-base font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              {t('createAgent.frameworkLabel', 'Framework')}
            </label>
            <select
              className={`w-full rounded-lg px-4 py-3 text-base bg-panel-light dark:bg-panel-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary border transition-colors ${
                errors.framework
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/50'
                  : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/50'
              } focus:outline-none`}
              {...register('framework')}
            >
              <option value="">Select a framework</option>
              {Object.values(AgentFramework).map((fw) => (
                <option key={fw} value={fw}>
                  {fw}
                </option>
              ))}
            </select>
            {errors.framework && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {errors.framework.message}
              </p>
            )}
          </div>

          {/* Capabilities */}
          <div className="flex flex-col gap-4">
            <label className="text-base font-medium text-text-light-primary dark:text-text-dark-primary">
              {t('createAgent.capabilitiesLabel', 'Capabilities')}
            </label>

            {/* Predefined Capabilities */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {capabilities.map((capability) => (
                <label
                  key={capability}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCapabilities?.includes(capability)}
                    onChange={() => toggleCapability(capability)}
                    className="rounded border-border-light dark:border-border-dark text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                    {capability}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Capabilities */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                Add Custom Capability
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCapability}
                  onChange={(e) => setCustomCapability(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomCapability();
                    }
                  }}
                  placeholder="Enter custom capability"
                  className="flex-1 rounded-lg px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary border border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={addCustomCapability}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Display custom capabilities as tags */}
              {selectedCapabilities && selectedCapabilities.filter(cap => !capabilities.includes(cap)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCapabilities
                    .filter(cap => !capabilities.includes(cap))
                    .map((capability) => (
                      <span
                        key={capability}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                      >
                        {capability}
                        <button
                          type="button"
                          onClick={() => removeCapability(capability)}
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {errors.capabilities && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {errors.capabilities.message}
              </p>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer className="flex items-center justify-end gap-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditMode ? 'Update Agent' : t('createAgent.createButton', 'Create Agent')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default AddAgentModal;
