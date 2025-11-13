# Chat Markdown Rendering Feature

## Overview

The chat interface now supports **full Markdown rendering** with syntax-highlighted code blocks, making conversations with AI agents much more readable and informative.

## Features

### ✅ Implemented

1. **Markdown Rendering**
   - Full GitHub Flavored Markdown (GFM) support
   - Headings (H1-H6)
   - Bold, italic, strikethrough
   - Lists (ordered, unordered, nested)
   - Blockquotes
   - Horizontal rules
   - Inline HTML (via rehype-raw)

2. **LaTeX Math Rendering** ✨ NEW
   - Inline math: `$equation$`
   - Display math (block): `$$equation$$`
   - Full KaTeX support
   - Matrices, integrals, summations
   - Greek letters, operators
   - Dark mode optimized

3. **Mermaid Diagrams** ✨ NEW
   - Flowcharts
   - Sequence diagrams
   - Class diagrams
   - State diagrams
   - Entity-relationship diagrams
   - Gantt charts
   - Pie charts
   - Git graphs
   - Dark mode support

4. **Image Rendering** ✨ NEW
   - Click-to-zoom functionality
   - Responsive sizing
   - Lazy loading
   - Lightbox overlay
   - Mobile-friendly

5. **Code Highlighting**
   - Syntax highlighting for 100+ programming languages
   - Language badge display
   - Copy-to-clipboard button for code blocks
   - Responsive overflow handling
   - Dark mode optimized

6. **Enhanced Links**
   - Auto-linking of URLs
   - Opens in new tab with `rel="noopener noreferrer"`
   - Custom styling for better visibility

7. **Tables**
   - Responsive table rendering
   - Sticky headers (optional)
   - Dark mode support
   - Overflow scrolling for wide tables

8. **Special Formatting**
   - Task lists (checkboxes)
   - Inline code with custom styling
   - Emoji support
   - Line breaks preserved

## Technical Implementation

### Dependencies

```json
{
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.0",
  "remark-breaks": "^4.0.0",
  "remark-math": "^6.0.0",
  "rehype-highlight": "^7.0.0",
  "rehype-raw": "^7.0.0",
  "rehype-katex": "^7.0.0",
  "mermaid": "^11.4.1",
  "react-medium-image-zoom": "^5.2.14",
  "katex": "^0.16.0"
}
```

### Component Structure

```
frontend/src/components/chat/
└── MessageContent.tsx    # Main markdown rendering component
```

### Usage

```tsx
import { MessageContent } from '@/components/chat/MessageContent';

// In your component
<MessageContent
  content={message.content}
  contentType="markdown"  // or "text" for plain text
/>
```

### Supported Languages

Code highlighting supports all languages supported by highlight.js, including:

- JavaScript/TypeScript
- Python
- Java/Kotlin
- C/C++/C#
- Go/Rust
- Ruby/PHP
- SQL/NoSQL
- Bash/Shell
- HTML/CSS
- JSON/YAML
- And 100+ more...

## Styling

### Light Mode
- Clean, readable design
- Syntax highlighting with GitHub theme
- Subtle borders and backgrounds

### Dark Mode
- Optimized for dark backgrounds
- High contrast code highlighting
- Reduced eye strain

### Custom CSS Classes

The component uses Tailwind's `prose` utility with custom overrides:

```css
.prose {
  /* Custom color variables */
  --tw-prose-body: var(--color-text-light-primary);
  --tw-prose-headings: var(--color-text-light-primary);
  --tw-prose-links: #3b82f6;
  --tw-prose-code: #ec4899;
}
```

## Code Block Features

### Copy Button

Every code block includes a copy button in the top-right corner:

```typescript
// Copies this entire code block
const example = "Hello, World!";
console.log(example);
```

### Language Detection

The language is automatically detected from the code fence:

````markdown
```python
def hello():
    print("Hello!")
```
````

### No Language Specified

If no language is specified, it displays as "code":

````markdown
```
This is plain code
```
````

## Examples

### Basic Markdown

**Input:**
```markdown
# Heading
**Bold text** and *italic text*.

- List item 1
- List item 2
```

**Output:**
> Renders as formatted markdown with proper styling

### Code Block

**Input:**
````markdown
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```
````

**Output:**
> Syntax-highlighted Python code with copy button

### Table

**Input:**
```markdown
| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| Code | ✅ |
```

**Output:**
> Formatted table with borders and styling

## Testing

See `MARKDOWN_TEST_EXAMPLES.md` for comprehensive test cases covering:

- All markdown syntax elements
- Multiple programming languages
- Edge cases
- Real-world examples

## Performance Considerations

- Markdown parsing is done client-side
- Code highlighting uses highlight.js (auto-detect mode)
- Component re-renders are minimized
- Large code blocks may cause slight delay (< 100ms typically)

## Future Enhancements

### Completed ✅
- [x] LaTeX/KaTeX math rendering
- [x] Mermaid diagram support
- [x] Image rendering with lightbox

### Planned Features

- [ ] Collapsible code blocks
- [ ] Line numbers for code blocks
- [ ] Diff highlighting for code
- [ ] File attachment preview
- [ ] Video embedding
- [ ] Audio playback
- [ ] 3D model rendering
- [ ] Custom React component injection

### Configuration Options

Current features are enabled by default. Future versions may include:

```tsx
<MessageContent
  content={content}
  options={{
    enableMath: true,          // ✅ Currently enabled
    enableDiagrams: true,       // ✅ Currently enabled
    enableImages: true,         // ✅ Currently enabled
    maxCodeHeight: 500,         // Future
    showLineNumbers: true,      // Future
    enableDiffHighlight: true,  // Future
    collapsibleCode: true       // Future
  }}
/>
```

## Advanced Examples

See `ADVANCED_MARKDOWN_EXAMPLES.md` for comprehensive examples including:

### LaTeX Math
- Inline and display equations
- Complex formulas (Schrödinger, Maxwell)
- Matrices and statistical formulas

### Mermaid Diagrams
- Flowcharts for processes
- Sequence diagrams for API calls
- Class diagrams for architecture
- State diagrams for workflows
- ER diagrams for databases
- Gantt charts for project planning

### Combined Examples
- Machine learning workflows
- API documentation with diagrams
- Data structures with visualizations
- Physics simulations

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Accessibility

- Proper semantic HTML
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly

## Contributing

To modify the markdown rendering:

1. Edit `MessageContent.tsx` for component logic
2. Edit `index.css` for styling
3. Test with examples in `MARKDOWN_TEST_EXAMPLES.md`

## Troubleshooting

### Code not highlighting

- Check that the language name is correct
- Verify highlight.js styles are loaded
- Check browser console for errors

### Styles not applying

- Ensure `index.css` is imported
- Check dark mode is toggled correctly
- Verify Tailwind prose classes are available

### Copy button not working

- Check clipboard permissions in browser
- Verify HTTPS context (required for clipboard API)
- Check browser compatibility

## Resources

- [react-markdown](https://github.com/remarkjs/react-markdown)
- [remark-gfm](https://github.com/remarkjs/remark-gfm)
- [highlight.js](https://highlightjs.org/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
