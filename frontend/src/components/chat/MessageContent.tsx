import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { Copy, Check } from 'lucide-react';
import Zoom from 'react-medium-image-zoom';
import mermaid from 'mermaid';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import 'react-medium-image-zoom/dist/styles.css';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#607AFB',
    primaryTextColor: '#fff',
    primaryBorderColor: '#7C0000',
    lineColor: '#F8B229',
    secondaryColor: '#006100',
    tertiaryColor: '#fff'
  }
});

interface MessageContentProps {
  content: string;
  contentType?: 'text' | 'markdown';
  className?: string;
}

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError('');
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(t('chat.diagramRenderError'));
      }
    };

    renderDiagram();
  }, [chart, t]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">
          <strong>{t('chat.diagramError')}</strong> {error}
        </p>
        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-4 flex justify-center items-center p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Mermaid diagrams
  if (language === 'mermaid') {
    return <MermaidDiagram chart={code} />;
  }

  if (inline) {
    return (
      <code
        className="px-1.5 py-0.5 mx-0.5 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4">
      {/* Language badge and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 text-gray-200 rounded-t-lg border-b border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-wide">
          {language || t('chat.code')}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          aria-label={t('chat.copyCode')}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>{t('chat.copied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{t('chat.copy')}</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="!mt-0 !rounded-t-none overflow-x-auto bg-gray-900 dark:bg-black">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  contentType = 'markdown',
  className = '',
}) => {
  const { t } = useTranslation();

  // Plain text rendering
  if (contentType === 'text') {
    return (
      <p className={`whitespace-pre-wrap break-words ${className}`}>
        {content}
      </p>
    );
  }

  // Preprocess content to prevent mathematical expressions from being parsed as lists
  const preprocessContent = (text: string): string => {
    let processed = text;

    // Wrap \boxed{...} with $ delimiters if not already wrapped
    // This ensures LaTeX \boxed command is properly rendered
    processed = processed.replace(/(?<!\$)\\boxed\{([^}]+)\}(?!\$)/g, '$\\boxed{$1}$');

    // Split by lines and process each line
    const lines = processed.split('\n');
    const processedLines = lines.map(line => {
      const trimmedLine = line.trim();

      // Check if line looks like a simple math expression starting with + or *
      // Pattern: starts with optional spaces, then + or *, then spaces and numbers/operators
      const mathExpressionPattern = /^(\s*)[+*]\s*[\d\s+\-*/=().,%]+$/;

      if (mathExpressionPattern.test(trimmedLine)) {
        // Escape the list marker by adding a backslash
        return line.replace(/^(\s*)([+*])(\s)/, '$1\\$2$3');
      }

      return line;
    });

    return processedLines.join('\n');
  };

  const processedContent = preprocessContent(content);

  // Markdown rendering with LaTeX and Mermaid support
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeRaw,
          [rehypeKatex, {
            strict: false,
            macros: {
              "\\boxed": "\\fbox{$#1$}"
            }
          }]
        ]}
        components={{
          // Code blocks with syntax highlighting, copy button, and Mermaid support
          code: CodeBlock,

          // Images with zoom functionality
          img: ({ src, alt, ...props }) => (
            <Zoom>
              <img
                src={src}
                alt={alt || t('chat.image')}
                className="max-w-full h-auto rounded-lg my-4 cursor-zoom-in"
                loading="lazy"
                {...props}
              />
            </Zoom>
          ),

          // Links - open in new tab
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors"
              {...props}
            >
              {children}
            </a>
          ),

          // Tables with better styling
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700" {...props}>
                {children}
              </table>
            </div>
          ),

          thead: ({ children, ...props }) => (
            <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
              {children}
            </thead>
          ),

          th: ({ children, ...props }) => (
            <th
              className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
              {...props}
            >
              {children}
            </th>
          ),

          td: ({ children, ...props }) => (
            <td
              className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700"
              {...props}
            >
              {children}
            </td>
          ),

          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),

          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2" {...props}>
              {children}
            </ul>
          ),

          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-2" {...props}>
              {children}
            </ol>
          ),

          // List items - special handling for mathematical expressions
          li: ({ children, ...props }) => {
            // Check if content is just a simple mathematical expression
            const textContent = typeof children === 'string' ? children :
                               (Array.isArray(children) ? children.join('') : String(children));

            // Pattern: starts with number/space and contains only math operators and numbers
            const isMathExpression = /^[\d\s+\-*/=().,%]+$/.test(textContent.trim());

            if (isMathExpression) {
              // Render without list marker for math expressions
              return (
                <li className="list-none" {...props}>
                  {children}
                </li>
              );
            }

            return <li {...props}>{children}</li>;
          },

          // Headings
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </h1>
          ),

          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </h2>
          ),

          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children, ...props }) => (
            <p className="my-2 leading-relaxed text-gray-800 dark:text-gray-200" {...props}>
              {children}
            </p>
          ),

          // Horizontal rule
          hr: ({ ...props }) => (
            <hr className="my-4 border-t border-gray-300 dark:border-gray-700" {...props} />
          ),

          // Strong/Bold
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </strong>
          ),

          // Emphasis/Italic
          em: ({ children, ...props }) => (
            <em className="italic text-gray-800 dark:text-gray-200" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
