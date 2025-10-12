import { useState, useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { RealtimeEventType } from '@sraz-sw/fullstack-shared';
import { initializeRealtimeProvider } from '@/lib/realtime';

// Initialize the realtime provider (will use Socket.IO locally, Pusher on Vercel)
// This will automatically pick the right provider based on the environment
initializeRealtimeProvider();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export function RealtimeDemo() {
  const userEmail = 'demo@example.com'; // This would normally come from auth context
  
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: string;
    timestamp: number;
  }>>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Connect to the realtime provider
  const { isConnected, lastEvent } = useRealtime({
    channel: userEmail,
    events: [RealtimeEventType.MESSAGE_UPDATE, RealtimeEventType.CONVERSATION_UPDATE],
    autoConnect: true,
  });

  // Handle incoming realtime events
  useEffect(() => {
    if (lastEvent) {
      const { type, data } = lastEvent;
      
      switch (type) {
        case RealtimeEventType.MESSAGE_UPDATE:
          // Add the new message to our state
          setMessages(prev => [...prev, {
            id: data.id || `msg-${Date.now()}`,
            text: data.text,
            sender: data.sender,
            timestamp: data.timestamp || Date.now(),
          }]);
          break;
        
        case RealtimeEventType.CONVERSATION_UPDATE:
          console.log('Conversation updated:', data);
          break;
          
        default:
          break;
      }
    }
  }, [lastEvent]);

  // Send a message to the server
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    
    try {
      // Send the message to the Express API
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          text: newMessage,
          conversationId: '123', // This would be a real conversation ID
          senderEmail: userEmail,
          receiverEmail: 'other@example.com', // This would be a real recipient
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // For demo purposes, we'll add the message locally as well
      // In a real app, this would come back through the realtime provider
      const newMsg = {
        id: `local-${Date.now()}`,
        text: newMessage,
        sender: userEmail,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Check the console for details.');
    } finally {
      setSending(false);
    }
  };

  // Simulate receiving a message using the server's API
  const simulateIncomingMessage = async () => {
    try {
      // Send a POST request to the server to trigger a message to this user
      await fetch(`${API_URL}/messages/simulate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          recipientEmail: userEmail,
          text: 'This is a simulated message from the server!',
          sender: 'server@example.com'
        }),
      });
      
      // Note: The actual message will come through the realtime connection
      // We don't need to manually add it to the messages array
    } catch (error) {
      console.error('Failed to simulate message:', error);
      
      // Fallback for demo: add a message locally if the server request fails
      const demoMessage = {
        id: `demo-${Date.now()}`,
        text: 'This is a simulated local message (server request failed)!',
        sender: 'other@example.com',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, demoMessage]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto p-4 bg-gray-100 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Realtime Chat Demo</h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 bg-white rounded p-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Send a message to start chatting!
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`p-2 rounded-lg max-w-[80%] ${
                  msg.sender === userEmail 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p>{msg.text}</p>
                <span className="text-xs opacity-75">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
      
      <div className="mt-4">
        <button
          onClick={simulateIncomingMessage}
          className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Simulate Server Message
        </button>
      </div>
    </div>
  );
} 