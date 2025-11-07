import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Textarea, Button } from '@/components/ui';
import { AgentFramework, AgentStatus, HealthStatus } from '@/types';
import { agentService } from '@/services/agentService';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const agentSchema = z.object({
  name: z.string().min(3, 'Agent name must be at least 3 characters').max(50, 'Agent name must be less than 50 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  framework: z.nativeEnum(AgentFramework, { required_error: 'Framework selection is required' }),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format X.Y.Z (e.g., 1.0.0)'),
  documentationUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  logo: z.instanceof(File).optional(),
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

const AddAgentModal: React.FC<AddAgentModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      description: '',
      url: '',
      version: '',
      documentationUrl: '',
      color: colorSwatches[4], // purple default
      capabilities: [],
    },
  });

  const selectedColor = watch('color');
  const selectedCapabilities = watch('capabilities');

  const onSubmit = async (data: AgentFormData) => {
    console.log('Form data:', data);
    try {
      // Call the agent service to create the agent
      await agentService.createAgent({
        name: data.name,
        description: data.description,
        framework: data.framework,
        a2a_endpoint: data.url || undefined, // Optional - can be added later via Chat&Debug
        capabilities: {
          skills: data.capabilities,
          version: data.version,
          description: data.description,
        },
        card_color: data.color,
        logo_url: data.logo ? URL.createObjectURL(data.logo) : undefined,
        status: AgentStatus.DEVELOPMENT,
        visibility: 'private', // Default to private for new agents
        is_public: false,
        health_status: HealthStatus.UNKNOWN,
      });

      // Close modal on success
      onClose();

      // Refresh agent list (React Query will handle this automatically)
      window.location.reload(); // Temporary solution - should use query invalidation
    } catch (error) {
      console.error('Failed to create agent:', error);
      // TODO: Show error toast notification
    }
  };

  const handleLogoUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setValue('logo', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
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

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      title={t('createAgent.title', 'Create New Agent')}
      description={t('createAgent.subtitle', 'Fill in the details below to set up your new agent.')}
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

            {/* Right: Logo & Color */}
            <div className="flex flex-col gap-4 items-center">
              <p className="text-base font-medium w-full md:text-center">Logo & Color</p>
              <div className="flex flex-row md:flex-col gap-4">
                {/* Logo Upload */}
                <div className="shrink-0">
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer group block"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div
                      className={`relative w-24 h-24 rounded-xl border-2 border-dashed ${
                        isDragging
                          ? 'border-primary bg-primary/10'
                          : 'border-border-light dark:border-border-dark'
                      } bg-panel-light dark:bg-panel-dark flex items-center justify-center text-text-light-secondary dark:text-text-dark-secondary group-hover:border-primary group-hover:text-primary transition-colors overflow-hidden`}
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <span className="material-symbols-outlined text-3xl">upload_file</span>
                          <p className="text-xs mt-1">Upload</p>
                        </div>
                      )}
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                </div>

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

          {/* URL & Version */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label={t('createAgent.urlLabel', 'URL')}
              placeholder="https://example.com/agent"
              type="url"
              error={errors.url?.message}
              {...register('url')}
            />
            <Input
              label={t('createAgent.versionLabel', 'Version')}
              placeholder="e.g., 1.0.0"
              error={errors.version?.message}
              {...register('version')}
            />
          </div>

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
          <div className="flex flex-col">
            <label className="text-base font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              {t('createAgent.capabilitiesLabel', 'Capabilities')}
            </label>
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
            {errors.capabilities && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
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
            {t('createAgent.createButton', 'Create Agent')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default AddAgentModal;
