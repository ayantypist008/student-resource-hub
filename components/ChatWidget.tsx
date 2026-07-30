'use client';

import { useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['hi', 'hello', 'hey', 'salam', 'assalam'],
    answer: "Hey! I'm Ayan. Ask me about finding papers, subjects, or how the site works.",
  },
  {
    keywords: ['find', 'search', 'paper', 'download'],
    answer:
      'To find papers: go to the homepage, pick your level (SSC Part 1/2 or HSSC Part 1/2), then pick your subject. Papers are sorted by year with Paper 1, Paper 2, and the answer key together.',
  },
  {
    keywords: ['subject', 'subjects'],
    answer:
      'We currently cover Physics, Chemistry, Biology, Mathematics, Computer Science, English, Urdu, Islamiat, and Pakistan Studies.',
  },
  {
    keywords: ['login', 'log in', 'sign up', 'signup', 'account', 'password'],
    answer:
      "You can create an account from the Sign Up page, or log in if you already have one. Accounts aren't required just to view or download papers though.",
  },
  {
    keywords: ['admin', 'upload'],
    answer: 'Uploading is only available to site admins for now.',
  },
  {
    keywords: ['marking scheme', 'answer key', 'key', 'e-marking', 'emarking'],
    answer:
      'Marking schemes and e-marking notes are listed together with the matching past paper on each subject page, grouped by year.',
  },
  {
    keywords: ['who made', 'creator', 'owner', 'contact'],
    answer: 'This site was built by a student, for students!',
  },
];

function getReply(userText: string): string {
  const lower = userText.toLowerCase();

  for (const entry of FAQ) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry.answer;
    }
  }

  return "That's coming soon! I don't have an answer for that yet — try asking me about finding papers, subjects, or downloads.";
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi, I'm Ayan! Ask me anything about finding papers on this site." },
  ]);
  const [input, setInput] = useState('');

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const reply = getReply(text);

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: reply },
    ]);
    setInput('');
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      {open && (
        <div className="mb-3 w-80 h-96 bg-white border border-[#E4DCC8] rounded-lg shadow-xl flex flex-col overflow-hidden">
          <div className="bg-[#1B2A4A] text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold">Ayan</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-[#A02334] text-white ml-auto'
                    : 'bg-[#FAF6EE] text-[#1B2A4A]'
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>

          <div className="border-t border-[#E4DCC8] p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Ayan..."
              className="flex-1 border border-[#E4DCC8] rounded-md px-3 py-1.5 text-sm focus:outline-none"
            />
            <button
              onClick={sendMessage}
              className="bg-[#A02334] text-white px-3 py-1.5 rounded-md text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-[#1B2A4A] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[#243759] transition-colors"
        aria-label="Chat with Ayan"
      >
        💬
      </button>
    </div>
  );
}