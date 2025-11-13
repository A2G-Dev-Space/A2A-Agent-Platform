# Advanced Markdown Features - Examples

This document showcases the advanced features of the MessageContent component including LaTeX math, Mermaid diagrams, and image rendering.

---

## 📐 LaTeX Math Rendering

### Inline Math

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

Einstein's famous equation: $E = mc^2$

The Pythagorean theorem: $a^2 + b^2 = c^2$

### Display Math (Block)

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

### Complex Equations

**Schrödinger Equation:**

$$
i\hbar\frac{\partial}{\partial t}\Psi(\mathbf{r},t) = \left[-\frac{\hbar^2}{2m}\nabla^2 + V(\mathbf{r},t)\right]\Psi(\mathbf{r},t)
$$

**Maxwell's Equations:**

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\epsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\mathbf{J} + \mu_0\epsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

### Matrices

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
\begin{bmatrix}
x \\
y
\end{bmatrix}
=
\begin{bmatrix}
ax + by \\
cx + dy
\end{bmatrix}
$$

### Statistical Formulas

**Normal Distribution:**

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}
$$

**Bayes' Theorem:**

$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$

---

## 📊 Mermaid Diagrams

### Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix bugs]
    E --> B
    C --> F[Deploy]
    F --> G[End]
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API Gateway
    participant Auth Service
    participant Database

    User->>Frontend: Login Request
    Frontend->>API Gateway: POST /api/auth/login
    API Gateway->>Auth Service: Verify Credentials
    Auth Service->>Database: Query User
    Database-->>Auth Service: User Data
    Auth Service-->>API Gateway: JWT Token
    API Gateway-->>Frontend: Token Response
    Frontend-->>User: Redirect to Dashboard
```

### Class Diagram

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String email
        +String role
        +login()
        +logout()
    }

    class Agent {
        +String id
        +String name
        +String framework
        +String status
        +deploy()
        +test()
    }

    class ChatSession {
        +String sessionId
        +String userId
        +String agentId
        +Array messages
        +sendMessage()
        +getHistory()
    }

    User "1" --> "*" Agent : owns
    User "1" --> "*" ChatSession : participates
    Agent "1" --> "*" ChatSession : serves
```

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Success : Complete
    Processing --> Error : Fail
    Error --> Retry : Retry
    Retry --> Processing
    Retry --> Failed : Max Retries
    Success --> [*]
    Failed --> [*]
```

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ CHAT_SESSION : creates
    USER ||--o{ AGENT : owns
    AGENT ||--o{ CHAT_SESSION : serves
    CHAT_SESSION ||--o{ MESSAGE : contains

    USER {
        string id PK
        string username
        string email
        string role
        datetime created_at
    }

    AGENT {
        string id PK
        string name
        string framework
        string status
        string owner_id FK
    }

    CHAT_SESSION {
        string id PK
        string user_id FK
        string agent_id FK
        string trace_id
        datetime created_at
    }

    MESSAGE {
        string id PK
        string session_id FK
        string role
        text content
        datetime timestamp
    }
```

### Gantt Chart

```mermaid
gantt
    title A2A Platform Development Roadmap
    dateFormat YYYY-MM-DD
    section Phase 1
    Markdown Rendering      :done, 2024-01-01, 7d
    Code Highlighting       :done, 2024-01-05, 5d
    LaTeX Support          :done, 2024-01-08, 3d
    section Phase 2
    Mermaid Diagrams       :active, 2024-01-10, 5d
    Image Support          :active, 2024-01-12, 3d
    Multi-user Chat        :2024-01-15, 10d
    section Phase 3
    Statistics Dashboard   :2024-01-20, 7d
    Advanced Analytics     :2024-01-25, 10d
```

### Pie Chart

```mermaid
pie title Agent Framework Distribution
    "Google ADK" : 45
    "Agno OS" : 30
    "LangChain" : 15
    "Custom" : 10
```

### Git Graph

```mermaid
gitGraph
    commit id: "Initial commit"
    commit id: "Add frontend structure"
    branch feature/markdown
    checkout feature/markdown
    commit id: "Add markdown rendering"
    commit id: "Add code highlighting"
    checkout main
    merge feature/markdown
    branch feature/latex
    checkout feature/latex
    commit id: "Add LaTeX support"
    commit id: "Add Mermaid diagrams"
    checkout main
    merge feature/latex
    commit id: "Release v1.0"
```

---

## 🖼️ Image Rendering

### Basic Image

![Sample Image](https://via.placeholder.com/600x400/607AFB/ffffff?text=Click+to+Zoom)

*Click on the image to zoom in!*

### Multiple Images

![Image 1](https://via.placeholder.com/400x300/EA2831/ffffff?text=Image+1)
![Image 2](https://via.placeholder.com/400x300/359EFF/ffffff?text=Image+2)
![Image 3](https://via.placeholder.com/400x300/FAC638/ffffff?text=Image+3)

### Image with Description

Here's an architectural diagram of our system:

![A2A Platform Architecture](https://via.placeholder.com/800x500/607AFB/ffffff?text=Architecture+Diagram)

The image above shows the microservices architecture with API Gateway, various services, and database layers.

---

## 🎯 Combined Examples

### Machine Learning Example

**Problem:** Predict house prices using linear regression.

**Formula:**

The prediction is given by:

$$
\hat{y} = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \cdots + \beta_n x_n
$$

Where:
- $\hat{y}$ is the predicted price
- $\beta_0$ is the intercept
- $\beta_i$ are the coefficients
- $x_i$ are the features

**Workflow:**

```mermaid
flowchart LR
    A[Collect Data] --> B[Preprocess]
    B --> C[Feature Engineering]
    C --> D[Train Model]
    D --> E{Evaluate}
    E -->|Good| F[Deploy]
    E -->|Poor| G[Tune Parameters]
    G --> D
```

**Implementation:**

```python
import numpy as np
from sklearn.linear_model import LinearRegression

# Generate sample data
X = np.random.rand(100, 5)
y = 3*X[:, 0] + 2*X[:, 1] - X[:, 2] + np.random.randn(100) * 0.1

# Train model
model = LinearRegression()
model.fit(X, y)

# Prediction
print(f"R² score: {model.score(X, y):.4f}")
```

---

### API Documentation Example

**Endpoint:** `POST /api/v1/agents/`

**Request Body:**

```json
{
  "name": "MathAgent",
  "framework": "ADK",
  "description": "Solves mathematical problems",
  "a2a_endpoint": "https://example.com/agent"
}
```

**Flow Diagram:**

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant AgentService
    participant Database

    Client->>Gateway: POST /api/v1/agents/
    Gateway->>AgentService: Forward Request
    AgentService->>Database: Save Agent
    Database-->>AgentService: Agent ID
    AgentService-->>Gateway: Response
    Gateway-->>Client: 201 Created
```

**Response:**

```json
{
  "id": 123,
  "name": "MathAgent",
  "framework": "ADK",
  "status": "DEVELOPMENT",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Data Structure Example

**Binary Search Tree Implementation:**

```mermaid
graph TD
    50((50)) --> 30((30))
    50 --> 70((70))
    30 --> 20((20))
    30 --> 40((40))
    70 --> 60((60))
    70 --> 80((80))
```

**Complexity Analysis:**

| Operation | Average Case | Worst Case |
|-----------|-------------|------------|
| Search | $O(\log n)$ | $O(n)$ |
| Insert | $O(\log n)$ | $O(n)$ |
| Delete | $O(\log n)$ | $O(n)$ |

**Code:**

```python
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def search(root, target):
    """
    Search for target in BST.
    Time: O(log n) average, O(n) worst
    """
    if not root or root.val == target:
        return root

    if target < root.val:
        return search(root.left, target)
    else:
        return search(root.right, target)
```

---

### Physics Simulation Example

**Projectile Motion:**

The trajectory of a projectile is described by:

$$
\begin{aligned}
x(t) &= v_0 \cos(\theta) \cdot t \\
y(t) &= v_0 \sin(\theta) \cdot t - \frac{1}{2}gt^2
\end{aligned}
$$

**Visualization:**

![Projectile Motion](https://via.placeholder.com/600x400/607AFB/ffffff?text=Projectile+Trajectory)

**State Machine:**

```mermaid
stateDiagram-v2
    [*] --> Launch
    Launch --> Rising : t < t_peak
    Rising --> Peak : v_y = 0
    Peak --> Falling : t > t_peak
    Falling --> Landing : y = 0
    Landing --> [*]
```

---

## 🧪 Testing Examples

### Test Coverage Report

```mermaid
pie title Test Coverage by Module
    "MessageContent" : 95
    "ChatPlayground" : 87
    "API Services" : 92
    "Auth System" : 88
    "Utils" : 78
```

### CI/CD Pipeline

```mermaid
flowchart LR
    A[Push Code] --> B[Run Tests]
    B --> C{Tests Pass?}
    C -->|Yes| D[Build]
    C -->|No| E[Notify Developer]
    D --> F[Deploy to Staging]
    F --> G{Manual Approval}
    G -->|Approved| H[Deploy to Production]
    G -->|Rejected| I[Rollback]
    E --> A
```

---

## 💡 Tips for Using Advanced Features

### LaTeX Math
- Use `$...$` for inline math
- Use `$$...$$` for display math (block)
- Requires `remark-math` and `rehype-katex` plugins

### Mermaid Diagrams
- Use triple backticks with `mermaid` language identifier
- Supports: flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, pie charts, and more
- Requires `mermaid` package

### Images
- Standard markdown syntax: `![alt text](url)`
- Click to zoom functionality with `react-medium-image-zoom`
- Responsive and lazy-loaded

---

## 🚀 Performance Notes

- **LaTeX**: Rendered client-side using KaTeX (fast)
- **Mermaid**: Rendered on-demand (slight delay for complex diagrams)
- **Images**: Lazy-loaded, zoom overlay only created on click
- **Overall**: Optimized for typical chat message sizes

---

## 🔗 Resources

- [KaTeX Supported Functions](https://katex.org/docs/supported.html)
- [Mermaid Documentation](https://mermaid.js.org/)
- [LaTeX Math Symbols](https://www.cmor-faculty.rice.edu/~heinken/latex/symbols.pdf)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
