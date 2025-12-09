import React, { useState, useRef, useEffect } from 'react';

interface SavedMessage {
  id: string;
  text: string;
  image?: string;
  timestamp: string;
}

interface SimpleChatProps {
  userId: string;
}

const SimpleChat: React.FC<SimpleChatProps> = ({ userId }) => {
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages from local storage
  useEffect(() => {
    const saved = localStorage.getItem(`life_tracker_saved_messages_${userId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load messages', e);
      }
    }
  }, [userId]);

  const saveMessages = (newMessages: SavedMessage[]) => {
    setMessages(newMessages);
    localStorage.setItem(`life_tracker_saved_messages_${userId}`, JSON.stringify(newMessages));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAttachedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const sendMessage = () => {
      if (!input.trim() && !attachedImage) return;

      const newMessage: SavedMessage = {
          id: crypto.randomUUID(),
          text: input,
          image: attachedImage || undefined,
          timestamp: new Date().toISOString()
      };

      const updatedMessages = [...messages, newMessage];
      saveMessages(updatedMessages);
      setInput('');
      setAttachedImage(null);
  };

  const deleteMessage = (id: string) => {
      if(window.confirm('Delete this message?')) {
          const updatedMessages = messages.filter(m => m.id !== id);
          saveMessages(updatedMessages);
      }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] max-w-4xl mx-auto rounded-3xl overflow-hidden glass-card border border-emerald-500/20 shadow-2xl relative animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/20 bg-emerald-950/50 backdrop-blur-md flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">☁️</span> My Personal Cloud
            </h2>
            <span className="text-xs text-emerald-400/60 uppercase tracking-wider font-bold">{messages.length} Items</span>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-emerald-500/30">
                    <span className="text-4xl mb-2">📁</span>
                    <p>No saved messages or files.</p>
                    <p className="text-sm">Use this space to save notes and uploads for yourself.</p>
                </div>
            )}
            
            {messages.map((msg) => (
                <div key={msg.id} className="group flex justify-end">
                    <div className="max-w-[85%] min-w-[200px] bg-black/40 border border-emerald-500/20 rounded-2xl rounded-tr-sm p-3 relative hover:bg-black/50 transition-colors">
                        {/* Timestamp */}
                        <div className="flex justify-between items-start mb-2 opacity-50 text-[10px] text-emerald-300 font-mono">
                            <span>{new Date(msg.timestamp).toLocaleString()}</span>
                            <button onClick={() => deleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all px-2">Delete</button>
                        </div>

                        {msg.image && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-emerald-500/20 bg-black/20">
                                <img src={msg.image} alt="Saved" className="w-full max-h-80 object-contain" />
                            </div>
                        )}
                        
                        {msg.text && (
                            <div className="text-emerald-50 whitespace-pre-wrap leading-relaxed text-sm">
                                {msg.text}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-emerald-950/80 border-t border-emerald-500/20 backdrop-blur-md">
            {attachedImage && (
                <div className="mb-2 relative inline-block group">
                    <img src={attachedImage} alt="Preview" className="h-20 rounded-lg border border-emerald-500/30 object-cover" />
                    <button 
                        onClick={() => setAttachedImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 z-10"
                    >
                        ×
                    </button>
                </div>
            )}
            <div className="flex gap-2 items-end">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl bg-black/30 border border-emerald-500/30 text-emerald-400 hover:text-white hover:bg-emerald-800/50 transition-colors"
                    title="Upload File/Image"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageSelect}
                />
                
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                        if(e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    placeholder="Type a note to save..."
                    className="flex-1 bg-black/30 border border-emerald-500/30 rounded-xl px-4 py-3 text-white placeholder-emerald-500/30 outline-none focus:border-emerald-400 resize-none max-h-32 custom-scrollbar"
                    rows={1}
                />
                
                <button 
                    onClick={sendMessage}
                    disabled={!input.trim() && !attachedImage}
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm"
                >
                    SAVE
                </button>
            </div>
        </div>
    </div>
  );
};

export default SimpleChat;