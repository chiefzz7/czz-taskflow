import { MessageSquare } from 'lucide-react';
export default function ChatPage() {
  return (
    <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
      <MessageSquare size={48} className="text-indigo-400 mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Enterprise Chat</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">Real-time chat with WebSocket support coming in Phase 2. Switch to an enterprise workspace to enable chat.</p>
    </div>
  );
}
