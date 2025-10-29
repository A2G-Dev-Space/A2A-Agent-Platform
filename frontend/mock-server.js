import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'mock-secret-key';

// Mock users
const MOCK_USERS = {
  dev1: {
    loginid: 'syngha.han',
    username: '한승하',
    mail: 'syngha.han@company.com',
    deptname: 'AI Platform Team',
    deptname_en: 'AI Platform Team',
    role: 'ADMIN'
  },
  dev2: {
    loginid: 'byungju.lee',
    username: '이병주',
    mail: 'byungju.lee@company.com',
    deptname: 'AI Platform Team',
    deptname_en: 'AI Platform Team',
    role: 'ADMIN'
  }
};

// Mock agents
let agents = [
  {
    id: 1,
    name: 'Code Assistant',
    description: 'AI agent for code generation and review',
    framework: 'Langchain',
    status: 'PRODUCTION',
    is_public: true,
    owner_id: 'syngha.han',
    a2a_endpoint: 'http://localhost:8100/agent',
    capabilities: {
      skills: ['code_generation', 'code_review', 'debugging'],
      languages: ['python', 'javascript', 'typescript']
    },
    department: 'AI Platform Team',
    health_status: 'healthy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Data Analyzer',
    description: 'Agent for data analysis and visualization',
    framework: 'Custom',
    status: 'PRODUCTION',
    is_public: true,
    owner_id: 'byungju.lee',
    a2a_endpoint: 'http://localhost:8100/agent',
    capabilities: {
      skills: ['data_analysis', 'visualization', 'reporting'],
      tools: ['pandas', 'matplotlib', 'seaborn']
    },
    department: 'AI Platform Team',
    health_status: 'healthy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Test Development Agent',
    description: 'Agent for development testing',
    framework: 'Langchain',
    status: 'DEVELOPMENT',
    is_public: false,
    owner_id: 'syngha.han',
    a2a_endpoint: 'http://localhost:8100/agent',
    capabilities: {
      skills: ['testing', 'development'],
      languages: ['python']
    },
    department: 'AI Platform Team',
    health_status: 'healthy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mock-api' });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const sso_login_url = `http://localhost:9050/mock-sso?redirect_uri=${encodeURIComponent(req.body.redirect_uri)}`;
  res.json({ sso_login_url });
});

app.post('/api/auth/callback', (req, res) => {
  const { id_token } = req.body;

  // Generate access token
  const user = MOCK_USERS.dev1; // Default to dev1
  const access_token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
  const refresh_token = jwt.sign({ sub: user.loginid }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    access_token,
    refresh_token,
    token_type: 'Bearer',
    expires_in: 3600,
    user
  });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json(payload);
  } catch (error) {
    res.status(401).json({ detail: 'Invalid token' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const { refresh_token } = req.body;

  try {
    const payload = jwt.verify(refresh_token, JWT_SECRET);
    const user = MOCK_USERS.dev1;
    const access_token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch (error) {
    res.status(401).json({ detail: 'Invalid refresh token' });
  }
});

// Agent endpoints
app.get('/api/agents', (req, res) => {
  res.json({ agents: agents, total: agents.length });
});

app.post('/api/agents', (req, res) => {
  const newAgent = {
    id: Date.now(),
    ...req.body,
    owner_id: 'syngha.han',
    a2a_endpoint: 'http://localhost:8100/agent',
    department: 'AI Platform Team',
    health_status: 'healthy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  agents.push(newAgent);
  res.status(201).json(newAgent);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);

  if (!agent) {
    return res.status(404).json({ detail: 'Agent not found' });
  }

  res.json(agent);
});

app.put('/api/agents/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ detail: 'Agent not found' });
  }

  agents[index] = {
    ...agents[index],
    ...req.body,
    updated_at: new Date().toISOString()
  };

  res.json(agents[index]);
});

app.delete('/api/agents/:id', (req, res) => {
  agents = agents.filter(a => a.id !== req.params.id);
  res.status(204).send();
});

// Top-K recommendations
app.post('/api/agents/search/top-k', (req, res) => {
  const { query, k = 5 } = req.body;

  // Simple mock implementation - return random agents
  const results = agents.slice(0, k).map(agent => ({
    agent,
    similarity_score: Math.random(),
    match_reason: `Agent matches query "${query}" based on capabilities`
  }));

  res.json(results);
});

// Mock SSO login page
app.get('/mock-sso', (req, res) => {
  const { redirect_uri } = req.query;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock SSO Login</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
        }
        h1 {
          color: #333;
          margin: 0 0 20px 0;
        }
        .user-card {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .user-card:hover {
          background: #e9ecef;
          border-color: #667eea;
          transform: translateY(-1px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Mock SSO Login</h1>
        <p>Select a user to login:</p>
        <div class="user-card" onclick="login('dev1')">
          <strong>한승하 (syngha.han)</strong><br>
          AI Platform Team - ADMIN
        </div>
        <div class="user-card" onclick="login('dev2')">
          <strong>이병주 (byungju.lee)</strong><br>
          AI Platform Team - ADMIN
        </div>
      </div>

      <script>
        function login(userId) {
          const token = 'mock-id-token-' + userId;
          window.location.href = '${redirect_uri}?id_token=' + token;
        }
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

// Admin endpoints
app.get('/api/admin/users', (req, res) => {
  const users = Object.values(MOCK_USERS).map(u => ({
    ...u,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString()
  }));
  res.json(users);
});

app.put('/api/admin/users/:username/role', (req, res) => {
  res.json({ message: 'Role updated successfully' });
});

// LLM config endpoints
app.get('/api/admin/llm-configs', (req, res) => {
  res.json([
    {
      id: '1',
      provider: 'OpenAI',
      model: 'gpt-4',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]);
});

app.post('/api/admin/llm-configs', (req, res) => {
  res.status(201).json({
    id: String(Date.now()),
    ...req.body,
    created_at: new Date().toISOString()
  });
});

const PORT = 9050;
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  - GET  /api/health');
  console.log('  - POST /api/auth/login');
  console.log('  - POST /api/auth/callback');
  console.log('  - GET  /api/auth/me');
  console.log('  - GET  /api/agents');
  console.log('  - POST /api/agents');
  console.log('  - GET  /mock-sso (SSO login page)');
});