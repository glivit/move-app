'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MessageCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface MessageSearchResult {
  id: string;
  content: string;
  clientName: string;
  clientId: string;
  createdAt: string;
  senderName: string;
}

export function MessageSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // Search in messages with client info
      const { data: messages, error } = await supabase
        .from('messages')
        .select(
          `
          id,
          content,
          created_at,
          sender:profiles!messages_sender_id_fkey(id, full_name),
          recipient:profiles!messages_recipient_id_fkey(id, full_name)
        `
        )
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Fout bij zoeken in berichten:', error);
        return;
      }

      // Format results for display
      const formattedResults = (messages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        clientName: msg.recipient?.full_name || 'Onbekend',
        clientId: msg.recipient?.id || '',
        createdAt: msg.created_at,
        senderName: msg.sender?.full_name || 'Onbekend',
      }));

      setResults(formattedResults);
      setIsOpen(true);
    } catch (error) {
      console.error('Fout bij zoeken:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleResultClick = (result: MessageSearchResult) => {
    router.push(`/coach/conversations/${result.clientId}`);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Zoeken in berichten..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery && setIsOpen(true)}
          className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {isOpen && (searchQuery || results.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="inline-block animate-spin">
                <MessageCircle className="w-4 h-4" />
              </div>
              <p className="text-sm mt-2">Zoeken...</p>
            </div>
          ) : results.length === 0 && searchQuery ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Geen berichten gevonden</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {result.clientName}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                        {result.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(result.createdAt), {
                          addSuffix: true,
                          locale: nl,
                        })}
                      </div>
                    </div>
                    <MessageCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isOpen && !searchQuery && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-gray-500">
          <p className="text-sm">Type om berichten te zoeken</p>
        </div>
      )}
    </div>
  );
}
