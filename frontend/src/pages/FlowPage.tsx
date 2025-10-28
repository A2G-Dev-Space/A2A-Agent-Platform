import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Send, X } from 'lucide-react';
import ChatMessage from '@/components/common/ChatMessage';
import Button from '@/components/common/Button';
import { agentService } from '@/api/agentService';
import { chatService } from '@/api/chatService';
import { Agent, ChatSession, ChatMessage as ChatMessageType } from '@/types';

export default function FlowPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setShowMessages(true);
      scrollToBottom();
    }
  }, [messages]);

  const fetchAgents = async () => {
    try {
      const data = await agentService.getAgents();
      // Show both own agents and public agents
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const toggleAgentSelection = (agent: Agent) => {
    if (selectedAgents.find((a) => a.agent_id === agent.agent_id)) {
      setSelectedAgents(selectedAgents.filter((a) => a.agent_id !== agent.agent_id));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  const createFlowSession = async () => {
    if (selectedAgents.length === 0) {
      alert('최소 1개의 에이전트를 선택해주세요.');
      return;
    }

    try {
      // Use the first selected agent for the session (could be enhanced to support multi-agent)
      const newSession = await chatService.createSession(selectedAgents[0].agent_id);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('세션 생성에 실패했습니다.');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Create session if not exists
    if (!currentSession && selectedAgents.length > 0) {
      await createFlowSession();
      if (!currentSession) return;
    }

    if (!currentSession) {
      alert('에이전트를 선택하고 대화를 시작해주세요.');
      return;
    }

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
      const response = await chatService.sendMessage(currentSession.session_id, input);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentSession(null);
    setShowMessages(false);
    setInput('');
  };

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-br from-teal-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {!showMessages ? (
        // Landing View
        <div className="flex items-center justify-center flex-1 p-6">
          <div className="max-w-3xl w-full">
            {/* Logo/Title */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-teal-700 dark:text-teal-300 mb-3">
                Agent Flow
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                여러 에이전트를 조합하여 복잡한 작업을 수행하세요
              </p>
            </div>

            {/* Agent Selection Dropdown */}
            <div className="mb-6">
              <button
                onClick={() => setShowAgentSelector(!showAgentSelector)}
                className="w-full px-6 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors bg-white dark:bg-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {selectedAgents.length === 0
                    ? 'Select Agents'
                    : `${selectedAgents.length} Agent(s) Selected`}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${showAgentSelector ? 'rotate-180' : ''}`}
                />
              </button>

              {showAgentSelector && (
                <div className="mt-2 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 max-h-64 overflow-y-auto custom-scrollbar">
                  {agents.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      사용 가능한 에이전트가 없습니다
                    </p>
                  ) : (
                    agents.map((agent) => (
                      <label
                        key={agent.agent_id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedAgents.find((a) => a.agent_id === agent.agent_id)}
                          onChange={() => toggleAgentSelection(agent)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {agent.agent_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {agent.framework} • {agent.visibility}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}

              {selectedAgents.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAgents.map((agent) => (
                    <div
                      key={agent.agent_id}
                      className="flex items-center gap-2 px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-sm"
                    >
                      <span>{agent.agent_name}</span>
                      <button
                        onClick={() => toggleAgentSelection(agent)}
                        className="hover:bg-teal-200 dark:hover:bg-teal-800 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border-2 border-gray-300 dark:border-gray-700 rounded-2xl p-6 pr-16 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-teal-500 dark:focus:border-teal-500 outline-none resize-none shadow-lg"
                placeholder="What would you like to do?"
                rows={6}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute bottom-6 right-6 w-12 h-12 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 rounded-full flex items-center justify-center text-white transition-colors shadow-lg disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Chat View
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-teal-700 dark:text-teal-300">
                  Agent Flow
                </h2>
                <div className="flex gap-2 mt-1">
                  {selectedAgents.map((agent) => (
                    <span
                      key={agent.agent_id}
                      className="text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded"
                    >
                      {agent.agent_name}
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleNewConversation}>
                New Conversation
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
            <div className="max-w-4xl mx-auto">
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
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="max-w-4xl mx-auto relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-4 pr-14 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 resize-none"
                placeholder="Continue the conversation... (Shift+Enter for new line)"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute bottom-4 right-4 w-8 h-8 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 rounded-full flex items-center justify-center text-white transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
