import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Plus, Paperclip, X } from 'lucide-react';
import TraceCapturePanel from '@/components/workbench/TraceCapturePanel';
import ChatMessage from '@/components/common/ChatMessage';
import Button from '@/components/common/Button';
import { chatService } from '@/api/chatService';
import { agentService } from '@/api/agentService';
import { useTraceWebSocket } from '@/hooks/useTraceWebSocket';
import { ChatSession, ChatMessage as ChatMessageType, Agent } from '@/types';
import { formatRelativeTime } from '@/utils/helpers';

export default function WorkbenchPlayground() {
  const { id: agentId } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket for trace logs
  const { logs, isConnected, clearLogs } = useTraceWebSocket(
    currentSession?.trace_id || null,
    !!currentSession
  );

  useEffect(() => {
    if (agentId) {
      fetchAgent();
      fetchSessions();
    }
  }, [agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAgent = async () => {
    try {
      const agents = await agentService.getAgents();
      const foundAgent = agents.find((a) => a.agent_id === agentId);
      setAgent(foundAgent || null);
    } catch (error) {
      console.error('Failed to fetch agent:', error);
    }
  };

  const fetchSessions = async () => {
    if (!agentId) return;
    try {
      const data = await chatService.getSessions(agentId);
      setSessions(data);
      if (data.length > 0 && !currentSession) {
        loadSession(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const loadSession = async (session: ChatSession) => {
    setCurrentSession(session);
    try {
      const sessionData = await chatService.getSession(session.session_id);
      setMessages(sessionData.messages || []);
      clearLogs();
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const createNewSession = async () => {
    if (!agentId) return;
    try {
      const newSession = await chatService.createSession(agentId);
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setMessages([]);
      clearLogs();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentSession || isLoading) return;

    const userMessage: ChatMessageType = {
      message_id: `temp-${Date.now()}`,
      session_id: currentSession.session_id,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      let uploadedFileUrl = null;
      if (file) {
        uploadedFileUrl = await chatService.uploadFile(file);
        setFile(null);
      }

      const response = await chatService.sendMessage(
        currentSession.session_id,
        input,
        uploadedFileUrl
      );

      const assistantMessage: ChatMessageType = {
        message_id: response.message_id || `msg-${Date.now()}`,
        session_id: currentSession.session_id,
        role: 'assistant',
        content: response.content || '',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Playground Sidebar - Sessions */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Button
            onClick={createNewSession}
            className="w-full"
            variant="primary"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />새 대화
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {agent && (
            <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                {agent.agent_name}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {agent.framework}
              </div>
            </div>
          )}

          {sessions.map((session) => (
            <div
              key={session.session_id}
              onClick={() => loadSession(session)}
              className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                currentSession?.session_id === session.session_id
                  ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                Session {session.session_id.slice(0, 8)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatRelativeTime(session.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trace Capture Panel */}
      <TraceCapturePanel
        traceId={currentSession?.trace_id || null}
        logs={logs}
        isConnected={isConnected}
        onClearLogs={clearLogs}
      />

      {/* Chat Playground */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="text-gray-500 dark:text-gray-400">
                <p className="text-lg mb-2">대화를 시작하세요</p>
                <p className="text-sm">
                  에이전트에게 질문하거나 작업을 요청할 수 있습니다
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <ChatMessage
                  key={message.message_id}
                  role={message.role}
                  content={message.content}
                  isStreaming={
                    isStreaming && idx === messages.length - 1 && message.role === 'assistant'
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
          {file && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {file.name}
              </span>
              <button
                onClick={() => setFile(null)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="파일 첨부"
            >
              <Paperclip className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600"
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              rows={3}
              disabled={!currentSession || isLoading}
            />

            <Button
              onClick={handleSendMessage}
              loading={isLoading}
              disabled={!input.trim() || !currentSession}
              className="self-end"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
