import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

function escapeHtml(string) {
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMessage(text) {
  if (!text) return '';
  let formatted = text;

  // Render markdown bold **bold**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>');
  
  // Render markdown italics *italics*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Render multi-line code blocks: ```sql ... ```
  formatted = formatted.replace(/```(sql|json|javascript|python)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
    return `<pre class="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2 border border-slate-800 shadow-inner">${escapeHtml(code)}</pre>`;
  });

  // Render inline code `code`
  formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-mono text-xs border border-slate-200/50 dark:border-slate-700/50">$1</code>');

  // Parse lines to handle bullet lists
  const lines = formatted.split('\n');
  let inList = false;
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul class="space-y-1 my-1">');
        inList = true;
      }
      processedLines.push(`<li class="ml-4 list-disc text-slate-700 dark:text-slate-300">${line.trim().substring(2)}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('\n').replace(/\n/g, '<br/>');
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your AI Fleet Assistant. How can I help you today? You can ask me to list available vehicles, show driver safety rankings, check trip reports, or compute operational expenses.',
    },
  ]);

  const messagesEndRef = useRef(null);

  const suggestions = [
    'Show available vehicles',
    'Which vehicle has the highest odometer?',
    'Show driver safety scores',
    'List open maintenance logs',
    'Total fuel logs summary',
  ];

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [open, messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: 'user', text: query }]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await api('/assistant/chat', {
        method: 'POST',
        body: { question: query },
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: response.answer || 'I could not generate an answer.',
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `⚠️ **Error:** ${err.message || 'Could not reach the assistant. Make sure both Node.js and Python FastAPI backends are running.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 hover:shadow-indigo-500/30 transition-all duration-300 group focus:outline-none"
        title="AI Assistant"
      >
        {open ? (
          <span className="text-xl font-bold font-sans">✕</span>
        ) : (
          <span className="text-2xl group-hover:animate-pulse">💬</span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[500px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <div>
                <h3 className="font-semibold text-sm tracking-wide">TransitOps Assistant</h3>
                <p className="text-[10px] text-blue-200 font-medium">Smart AI Operations</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white rounded p-1 transition"
            >
              ✕
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/40 dark:border-slate-700/40'
                  }`}
                >
                  {m.sender === 'bot' ? (
                    <div
                      className="space-y-1 font-sans text-xs sm:text-sm break-words"
                      dangerouslySetInnerHTML={{ __html: formatMessage(m.text) }}
                    />
                  ) : (
                    <p className="whitespace-pre-line text-xs sm:text-sm break-words">{m.text}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-bl-none flex items-center gap-1.5 border border-slate-200/40 dark:border-slate-700/40 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action suggestions */}
          {messages.length === 1 && (
            <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100/80 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/20 transition-all duration-200 active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Form input */}
          <form
            onSubmit={onSubmit}
            className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50/90 dark:bg-slate-900/90"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fleet status..."
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition active:scale-95 focus:outline-none"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
