# Markdown Rendering Test Examples

This document contains various markdown examples to test the MessageContent component in the chat interface.

## Basic Text Formatting

**Bold text** and *italic text* can be used for emphasis.

You can also use ~~strikethrough~~ text.

Inline `code` looks like this.

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4

## Lists

### Unordered List
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item
   1. Nested 3.1
   2. Nested 3.2

## Links

Visit [OpenAI](https://openai.com) for more information.

Check out [React Documentation](https://react.dev).

Auto-link: https://github.com

## Code Blocks

### Python
```python
def fibonacci(n):
    """Calculate fibonacci number recursively."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
for i in range(10):
    print(f"fib({i}) = {fibonacci(i)}")
```

### JavaScript
```javascript
// React component example
const ChatMessage = ({ content, role }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="message">
      <MessageContent content={content} />
    </div>
  );
};
```

### TypeScript
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

function greetUser(user: User): string {
  return `Hello, ${user.name}! You are logged in as ${user.role}.`;
}

const currentUser: User = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin'
};

console.log(greetUser(currentUser));
```

### SQL
```sql
-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email) VALUES
  ('alice', 'alice@example.com'),
  ('bob', 'bob@example.com');

-- Query active users
SELECT * FROM users
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### Bash
```bash
#!/bin/bash

# Deploy script
echo "Starting deployment..."

# Build frontend
cd frontend
npm install
npm run build

# Start services
docker-compose up -d

echo "Deployment complete!"
```

## Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Markdown Rendering | ✅ Done | High |
| Code Highlighting | ✅ Done | High |
| URL Auto-linking | ✅ Done | Medium |
| Image Support | ⏳ Pending | Low |
| LaTeX Math | ⏳ Pending | Low |

### Complex Table

| Language | Typing | Compilation | Use Case |
|----------|--------|-------------|----------|
| Python | Dynamic | Interpreted | Data Science, AI/ML, Web |
| TypeScript | Static | Transpiled | Frontend, Full-stack |
| Rust | Static | Compiled | Systems, Performance-critical |
| Go | Static | Compiled | Backend, Cloud Services |

## Blockquotes

> This is a blockquote.
>
> It can span multiple lines and paragraphs.
>
> > Nested blockquotes are also supported.

> **Important Note:**
> Make sure to test all markdown features thoroughly before deploying to production.

## Mixed Content Example

Here's a complete example combining various elements:

### Task: Implement User Authentication

**Requirements:**
1. User registration with email validation
2. Secure password hashing using bcrypt
3. JWT token generation
4. Role-based access control (RBAC)

**Implementation:**

```python
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

**Testing Checklist:**
- [x] Unit tests for password hashing
- [x] Integration tests for login flow
- [ ] Load testing for token generation
- [ ] Security audit

**Resources:**
- [JWT.io](https://jwt.io) - JWT debugger
- [OWASP Auth Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## Horizontal Rules

Above and below this text are horizontal rules.

---

## Inline HTML (if enabled)

<div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
  This is a custom HTML block (if rehype-raw is enabled).
</div>

## Emoji Support

Emojis should work too! 🎉 ✨ 🚀 💡 ⚡ 🔥

## GitHub Flavored Markdown (GFM)

### Task Lists
- [x] Implement markdown rendering
- [x] Add code highlighting
- [x] Style tables and lists
- [ ] Add LaTeX support
- [ ] Add mermaid diagram support

### Autolinks
Visit https://github.com and www.example.com

### Strikethrough
~~This text is crossed out~~

## Edge Cases

### Very Long Code Block
```python
# This is a very long line of code that should trigger horizontal scrolling in the code block to ensure proper handling of overflow content
def very_long_function_name_that_exceeds_normal_width(parameter1, parameter2, parameter3, parameter4, parameter5):
    return f"Result: {parameter1}, {parameter2}, {parameter3}, {parameter4}, {parameter5}"
```

### Empty Code Block
```

```

### Mixed Languages
You can install packages using `npm install` or `pip install` depending on your language.

The `async/await` pattern in JavaScript is similar to Python's `asyncio`.

## Real-World Example: API Response

Here's how you might format an API response in chat:

**Question:** How do I create a new user via the API?

**Answer:**

To create a new user, send a POST request to `/api/users/` with the following payload:

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "user"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8001/api/users/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "secure_password"
  }'
```

**Expected Response:**
```json
{
  "id": 123,
  "username": "johndoe",
  "email": "john@example.com",
  "role": "user",
  "created_at": "2024-01-15T10:30:00Z"
}
```

For more information, see the [API Documentation](https://docs.example.com/api).

---

## Performance Note

> **Note:** All markdown is rendered client-side using react-markdown with remark-gfm and rehype-highlight plugins. Code blocks use highlight.js for syntax highlighting with language auto-detection.
