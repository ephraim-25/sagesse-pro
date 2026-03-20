import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TaskMessage {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    nom: string;
    prenom: string;
    photo_url: string | null;
  };
}

export function useTaskMessages(taskId: string | null) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch last 50 messages
  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('task_messages')
      .select(`*, sender:profiles!task_messages_sender_id_fkey(id, nom, prenom, photo_url)`)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) {
      setMessages(data as TaskMessage[]);
    }
    setLoading(false);
  }, [taskId]);

  // Mark unread messages as read
  const markAsRead = useCallback(async () => {
    if (!taskId || !profile?.id) return;

    const unread = messages.filter(m => !m.read && m.sender_id !== profile.id);
    if (unread.length === 0) return;

    await supabase
      .from('task_messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('task_id', taskId)
      .neq('sender_id', profile.id)
      .eq('read', false);

    setMessages(prev =>
      prev.map(m =>
        !m.read && m.sender_id !== profile.id
          ? { ...m, read: true, read_at: new Date().toISOString() }
          : m
      )
    );
  }, [taskId, profile?.id, messages]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!taskId || !profile?.id || !content.trim()) return;

    const { error } = await supabase.from('task_messages').insert({
      task_id: taskId,
      sender_id: profile.id,
      content: content.trim(),
    });

    if (error) throw error;
  }, [taskId, profile?.id]);

  // Broadcast typing indicator
  const sendTyping = useCallback(() => {
    if (!channelRef.current || !profile) return;
    channelRef.current.track({
      user_id: profile.id,
      user_name: `${profile.prenom} ${profile.nom}`,
      typing: true,
    });
  }, [profile]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current || !profile) return;
    channelRef.current.track({
      user_id: profile.id,
      user_name: `${profile.prenom} ${profile.nom}`,
      typing: false,
    });
  }, [profile]);

  // Subscribe to realtime
  useEffect(() => {
    if (!taskId || !profile?.id) return;

    fetchMessages();

    const channel = supabase.channel(`task-chat:${taskId}`, {
      config: { presence: { key: profile.id } },
    });

    // Listen for new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'task_messages',
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => {
        // Fetch with sender info
        supabase
          .from('task_messages')
          .select(`*, sender:profiles!task_messages_sender_id_fkey(id, nom, prenom, photo_url)`)
          .eq('id', (payload.new as any).id)
          .single()
          .then(({ data }) => {
            if (data) {
              setMessages(prev => {
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, data as TaskMessage];
              });
            }
          });
      }
    );

    // Listen for read status updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'task_messages',
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => {
        const updated = payload.new as any;
        setMessages(prev =>
          prev.map(m => (m.id === updated.id ? { ...m, read: updated.read, read_at: updated.read_at } : m))
        );
      }
    );

    // Presence for typing
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      let typingName: string | null = null;

      for (const key of Object.keys(state)) {
        if (key === profile.id) continue;
        const presences = state[key] as any[];
        if (presences?.[0]?.typing) {
          typingName = presences[0].user_name;
          break;
        }
      }
      setTypingUser(typingName);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingName) {
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 4000);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [taskId, profile?.id, fetchMessages]);

  return {
    messages,
    loading,
    typingUser,
    sendMessage,
    sendTyping,
    stopTyping,
    markAsRead,
    refetch: fetchMessages,
  };
}

// Hook to get unread message counts per task
export function useUnreadTaskMessages() {
  const { profile } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const fetchUnread = useCallback(async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('task_messages')
      .select('task_id')
      .neq('sender_id', profile.id)
      .eq('read', false);

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((m: any) => {
        counts[m.task_id] = (counts[m.task_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  // Listen for new messages globally
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('task-messages-unread')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_messages' },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, fetchUnread]);

  return unreadCounts;
}
