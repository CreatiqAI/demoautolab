import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useChatBot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<{
    type: string;
    name: string;
  } | null>(null);

  // Fetch customer type on first open
  const initCustomerInfo = useCallback(async () => {
    if (customerInfo) return;

    if (user) {
      try {
        const { data } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setCustomerInfo({
            type: (data as any).customer_type || 'normal',
            name: (data as any).full_name || (data as any).name || 'Customer',
          });
          return;
        }
      } catch {
        // Fall through to default
      }
    }

    setCustomerInfo({ type: 'normal', name: 'Guest' });
  }, [user, customerInfo]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Build conversation history for context (last 10 messages)
        const history = [...messages, userMessage]
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const { data, error } = await supabase.functions.invoke(
          'product-chat',
          {
            body: {
              messages: history,
              customerType: customerInfo?.type || 'normal',
              customerName: customerInfo?.name || 'Customer',
            },
          }
        );

        if (error) throw error;

        const reply = data?.reply || 'Sorry, I could not process your request.';

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'Sorry, something went wrong. Please try again or check out our Catalog page for products.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, customerInfo]
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        initCustomerInfo();
        // Add welcome message on first open
        if (messages.length === 0) {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content:
                "Hi! I'm AutoLab's product assistant. I can help you find the right car accessories.\n\nWhat car do you drive?",
              timestamp: new Date(),
            },
          ]);
        }
      }
      return next;
    });
  }, [initCustomerInfo, messages.length]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    toggleOpen,
    clearChat,
  };
}
