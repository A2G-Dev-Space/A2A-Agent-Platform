import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Copy, Check } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

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

const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
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
  // Plain text rendering
  if (contentType === 'text') {
    return (
      <p className={`whitespace-pre-wrap break-words ${className}`}>
        {content}
      </p>
    );
  }

  // Markdown rendering
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Code blocks with syntax highlighting and copy button
          code: CodeBlock,

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
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
