'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useProject } from './ProjectContext';
import { logger } from '../lib/logger';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  // Interactive prompt data
  promptData?:
    | {
        type: 'scene-analysis';
        sceneId: string;
        sceneName: string;
        musicPrompt: string;
        detailedAnalysis: any;
        rawAnalyses?: Array<{ timestamp: number; raw: string; lighting: string; mood: string; shot_type: string; camera_angle: string; }>;
      }
    | {
        type: 'sound-effects';
        scenes: Array<{
          sceneId: string;
          sceneName: string;
          suggestions: Array<{
            id: string;
            name: string;
            description: string;
          }>;
        }>;
      };
}

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  addPromptMessage: (promptData: ChatMessage['promptData']) => void;
  loadChatHistory: () => Promise<void>;
  clearChat: () => void;
  setActionHandler: (handler: (action: string, data: any) => Promise<void>) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { currentProject } = useProject();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const actionHandlerRef = useRef<((action: string, data: any) => Promise<void>) | null>(null);

  const setActionHandler = useCallback((handler: (action: string, data: any) => Promise<void>) => {
    logger.info('Registering action handler in ChatContext');
    actionHandlerRef.current = handler;
  }, []);

  // Load chat history when project changes
  const loadChatHistory = useCallback(async () => {
    try {
      const projectId = currentProject?.id;
      const url = projectId
        ? `/api/chat?projectId=${projectId}`
        : '/api/chat';

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      logger.error('Failed to load chat history', error);
    }
  }, [currentProject]);

  // Auto-load chat history when project changes
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Send a message to the AI
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          projectId: currentProject?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('Chat API response', {
          hasAction: !!data.action,
          action: data.action,
          hasActionData: !!data.actionData,
          actionData: data.actionData,
          hasActionHandler: !!actionHandlerRef.current,
          actionHandlerType: typeof actionHandlerRef.current
        });

        // Check if the response contains an action to perform
        if (data.action && actionHandlerRef.current && typeof actionHandlerRef.current === 'function') {
          logger.info('Detected action from AI', { action: data.action, actionData: data.actionData });
          await actionHandlerRef.current(data.action, data.actionData);
        } else {
          if (data.action && !actionHandlerRef.current) {
            logger.warn('Action detected but no action handler registered', { action: data.action });
          }
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      logger.error('Error sending message', error);

      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Add an interactive prompt message (e.g., for scene analysis)
  const addPromptMessage = useCallback((promptData: ChatMessage['promptData']) => {
    if (!promptData) return;

    const promptMessage: ChatMessage = {
      id: `prompt-${Date.now()}`,
      role: 'assistant',
      content: '', // Content will be rendered by PromptInteraction component
      created_at: new Date().toISOString(),
      promptData
    };

    setMessages(prev => [...prev, promptMessage]);
  }, []);

  return (
    <ChatContext.Provider value={{
      messages,
      isLoading,
      sendMessage,
      addPromptMessage,
      loadChatHistory,
      clearChat,
      setActionHandler,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
