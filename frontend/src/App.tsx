import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import WorkbenchDashboard from './pages/WorkbenchDashboard';
import WorkbenchPlayground from './pages/WorkbenchPlayground';
import HubDashboard from './pages/HubDashboard';
import HubPlayground from './pages/HubPlayground';
import FlowPage from './pages/FlowPage';
import SettingsLayout from './pages/settings/SettingsLayout';
import GeneralSettings from './pages/settings/GeneralSettings';
import ApiKeysSettings from './pages/settings/ApiKeysSettings';
import UsersManagement from './pages/settings/UsersManagement';
import LLMUsageStats from './pages/settings/LLMUsageStats';
import AgentUsageStats from './pages/settings/AgentUsageStats';
import LLMModelsManagement from './pages/settings/LLMModelsManagement';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Default redirect to workbench */}
        <Route index element={<Navigate to="/workbench" replace />} />

        {/* Workbench Mode */}
        <Route path="workbench" element={<WorkbenchDashboard />} />
        <Route path="workbench/:id" element={<WorkbenchPlayground />} />

        {/* Hub Mode */}
        <Route path="hub" element={<HubDashboard />} />
        <Route path="hub/:id" element={<HubPlayground />} />

        {/* Flow Mode */}
        <Route path="flow" element={<FlowPage />} />

        {/* Settings */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/general" replace />} />
          <Route path="general" element={<GeneralSettings />} />
          <Route path="api-keys" element={<ApiKeysSettings />} />
          <Route path="admin/users" element={<UsersManagement />} />
          <Route path="admin/llm-usage" element={<LLMUsageStats />} />
          <Route path="admin/agent-usage" element={<AgentUsageStats />} />
          <Route path="admin/llm-models" element={<LLMModelsManagement />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
