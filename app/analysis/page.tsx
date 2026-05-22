"use client";

import { useEffect, useState, useRef } from "react";
import { Sparkles, MessageSquare, History, LogOut, Loader2, ShieldCheck, Globe, Search, Brain, Zap, Send, Activity, ListChecks, FileSpreadsheet, FileText as FileDocx, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/app/actions/auth";
import { analyzePage, getSharedMemory, askBrowsey } from "@/app/actions/ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { exportToExcel, exportToDocx } from "@/lib/export";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function AnalysisPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [smartSearch, setSmartSearch] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const [hoveredLink, setHoveredLink] = useState<{ url: string, text: string } | null>(null);
  const [linkAnalysis, setLinkAnalysis] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [sharedMemory, setSharedMemory] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Small delay to ensure DOM has rendered the new content
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleInput = async (directQuery?: string | any) => {
    const query = typeof directQuery === 'string' ? directQuery : searchQuery;
    if (!query || !query.trim()) return;
    
    const userMessage = query.trim();
    setSearchQuery("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    const res = await askBrowsey(userMessage, content || "");
    
    if (res.success) {
      let aiResponse = res.answer!;
      
      // Check for JSON commands in various formats the AI might use
      const jsonMatch = aiResponse.match(/```json\s*\n?([\s\S]*?)\n?\s*```/) 
        || aiResponse.match(/\{"action"\s*:\s*"[^"]+"/);
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const command = JSON.parse(jsonStr);
          window.parent.postMessage({ type: 'execute-action', payload: command }, '*');
          
          // Clean the JSON from the displayed response
          const cleanResponse = aiResponse
            .replace(/```json\s*\n?[\s\S]*?\n?\s*```/g, '')
            .trim();
          
          const shortUrl = (command.url || 'processing...').length > 60 
            ? (command.url || '').substring(0, 60) + '...' 
            : (command.url || 'processing...');
          aiResponse = cleanResponse 
            ? cleanResponse + `\n\n✅ *Executing: ${command.action} → ${shortUrl}*`
            : `✅ *Executing: ${command.action} → ${shortUrl}*`;
        } catch (e) { /* JSON parse failed, show response as-is */ }
      }

      setMessages(prev => [...prev, { role: "ai", content: aiResponse }]);
    } else {
      setMessages(prev => [...prev, { role: "ai", content: "I encountered an error. Please check your connection." }]);
    }
    setIsTyping(false);
  };

  // Store handleInput in a ref so the event listener always has the latest version
  const handleInputRef = useRef(handleInput);
  handleInputRef.current = handleInput;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "link-hover") {
        setHoveredLink({ url: event.data.url, text: event.data.text });
        setLoadingLink(true);
        analyzePage(event.data.url, `Link Text: ${event.data.text}`)
          .then(res => {
            if (res.success) setLinkAnalysis(res.analysis!);
          })
          .finally(() => setLoadingLink(false));
      }

      if (event.data?.type === "page-content") {
        setContent(event.data.content);
        // If analysis was based on partial URL data or is empty
        if (!analysis || analysis.includes("unavailable")) {
          setLoading(true);
          analyzePage(event.data.url, event.data.content)
            .then(res => {
              if (res.success) {
                setAnalysis(res.analysis!);
                sessionStorage.setItem(`analysis-${event.data.url}`, res.analysis!);
              }
            })
            .finally(() => setLoading(false));
        }
      }
      if (event.data?.type === "direct-query") {
        // Call handleInput directly with the query — no state timing issues
        handleInputRef.current(event.data.query);
      }

    };

    window.addEventListener("message", handleMessage);

    getSharedMemory().then(res => {
      if (res.success) setSharedMemory(res.memory!);
    });

    const params = new URLSearchParams(window.location.search);
    const pageUrl = params.get("url");
    const pageContent = params.get("content");
    
    setUrl(pageUrl);
    setContent(pageContent);

    if (pageUrl) {
      // CACHING LOGIC: Check if we already analyzed this URL in this session
      const cached = sessionStorage.getItem(`analysis-${pageUrl}`);
      if (cached) {
        setAnalysis(cached);
        setLoading(false);
      } else {
        setLoading(true);
        analyzePage(pageUrl, pageContent || "")
          .then(res => {
            if (res.success) {
              setAnalysis(res.analysis!);
              sessionStorage.setItem(`analysis-${pageUrl}`, res.analysis!);
            } else {
              setAnalysis("Analysis currently unavailable.");
            }
          })
          .finally(() => setLoading(false));
      }
    }

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-bg text-text selection:bg-brand-violet/30">
      {/* Premium Header */}
      <header className="flex items-center justify-between border-b border-border/50 p-3 bg-surface-1/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
             <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight leading-none text-white">BROWSEY</span>
            <span className="text-[8px] font-bold text-brand-glow uppercase tracking-widest">Gemma 3 Neural</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
           <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-surface-2" title="Reset Chat" onClick={() => setMessages([])}>
             <History className="h-4 w-4 text-text-muted" />
           </Button>
           <div className="mx-1 h-3 w-px bg-border/40" />
           <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10" onClick={() => signOut()}>
             <LogOut className="h-4 w-4" />
           </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-10">
        {/* Link Insight (Hover Mode) */}
        {hoveredLink && (
          <div className="animate-in slide-in-from-top-3 rounded-2xl border border-brand-violet/40 bg-surface-2/80 backdrop-blur-sm p-4 shadow-glow-sm relative">
            <button onClick={() => setHoveredLink(null)} className="absolute right-3 top-3 text-xs text-text-muted hover:text-white transition-colors">Close</button>
            <div className="flex items-center gap-2 mb-3">
               <div className="h-6 w-6 rounded-lg bg-brand-glow/20 flex items-center justify-center">
                 <Zap className="h-3.5 w-3.5 text-brand-glow" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-brand-glow">Link Intelligence</span>
            </div>
            <p className="text-xs font-bold text-white mb-2 leading-snug">{hoveredLink.text}</p>
            <div className="text-[11px] text-text-subtle leading-relaxed border-l-2 border-brand-glow/30 pl-3">
              {loadingLink ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="animate-pulse">Analyzing destination...</span>
                </div>
              ) : linkAnalysis}
            </div>
          </div>
        )}

        {/* Page Context Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
           <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-border/50 text-[10px] font-bold text-text-muted">
             <Globe className="h-3 w-3 text-brand-glow" /> {url?.split('/')[2] || "Scanning..."}
           </div>
           <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-border/50 text-[10px] font-bold text-success">
             <Activity className="h-3 w-3" /> Live Connection
           </div>
        </div>

        {/* Initial Analysis Section - MORE BEAUTIFUL */}
        {analysis && messages.length === 0 && (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-brand-violet" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Core Synthesis</h3>
                </div>
                <span className="text-[9px] font-bold text-brand-glow bg-brand-glow/10 px-2 py-0.5 rounded-full">Gemma v3</span>
             </div>
             <div className="relative group">
                <div className="absolute -inset-0.5 bg-brand-gradient rounded-2xl opacity-10 group-hover:opacity-20 transition duration-500 blur"></div>
                <div className="relative rounded-2xl border border-border/50 bg-surface-1 p-5 shadow-2xl overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-brand-gradient opacity-80"></div>
                   {loading ? (
                     <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="relative">
                          <Loader2 className="h-10 w-10 animate-spin text-brand-violet" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-brand-glow animate-ping" />
                          </div>
                        </div>
                        <p className="text-[11px] text-brand-violet font-black uppercase tracking-widest animate-pulse text-center">
                          Deciphering Page Context...
                        </p>
                     </div>
                   ) : (
                     <div className="text-[13px] leading-[1.7] text-text-subtle font-medium max-w-none [&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>h1]:text-white [&>h1]:font-bold [&>h2]:text-white [&>h2]:font-bold [&>h3]:text-white [&>h3]:font-bold [&>a]:text-brand-glow [&>strong]:text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] min-w-0 relative ${
                msg.role === "user" 
                  ? "bg-brand-violet text-white rounded-2xl rounded-tr-sm p-4 shadow-glow" 
                  : "bg-surface-2 border border-border-soft text-text rounded-2xl rounded-tl-sm p-4"
              }`} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {msg.content.includes("🔍 [") ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Suggested Search</p>
                    <a href={msg.content.split(": ")[1]} target="_blank" className="flex items-center gap-2 text-brand-glow font-bold hover:underline">
                      View Deep Dive Results <Zap className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed min-w-0 [&>p]:mb-2 last:[&>p]:mb-0 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:mb-2 [&>li]:mb-1 [&>a]:text-brand-glow [&>strong]:font-bold [&>strong]:text-current [&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1 [&_code]:bg-black/20 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:bg-black/30 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-2 [&_pre]:text-xs [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:bg-white/5 [&_th]:text-xs [&_th]:font-bold [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
                {/* Download buttons for AI messages */}
                {msg.role === "ai" && !msg.content.includes("🔍 [") && msg.content.length > 50 && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                    <button
                      onClick={() => exportToExcel(msg.content, `browsey-${Date.now()}`)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      <FileSpreadsheet className="h-3 w-3" /> Excel
                    </button>
                    <button
                      onClick={() => exportToDocx(msg.content, `browsey-${Date.now()}`)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      <FileDocx className="h-3 w-3" /> Word
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start pl-2">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-violet animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-brand-violet animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-brand-violet animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Shared Memory Section - BETTER UI */}
        {sharedMemory.length > 0 && messages.length === 0 && (
          <div className="space-y-4 pt-6 border-t border-border/40">
            <div className="flex items-center gap-2 px-1">
              <Brain className="h-4 w-4 text-brand-pink" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Collective Intelligence</h3>
            </div>
            <div className="grid gap-2.5">
              {sharedMemory.map((m, i) => (
                <div key={i} className="group p-3 rounded-2xl border border-border/30 bg-surface-2/40 hover:bg-surface-2/60 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black text-brand-pink uppercase tracking-widest">{m.created_at ? new Date(m.created_at).toLocaleTimeString() : 'Recent'}</p>
                    <div className="h-1 w-1 rounded-full bg-brand-pink group-hover:scale-150 transition-transform"></div>
                  </div>
                  <p className="text-[11px] font-bold text-white line-clamp-1 mb-0.5">{m.prompt}</p>
                  <p className="text-[10px] text-text-muted line-clamp-2 leading-tight italic">"{m.response}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Bar - GLASSMORPHISM */}
      <footer className="p-4 bg-surface-1/90 backdrop-blur-xl border-t border-border/50 shrink-0">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSmartSearch(!smartSearch)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 ${smartSearch ? 'bg-brand-violet shadow-[0_0_10px_rgba(124,58,237,0.5)]' : 'bg-surface-3'}`}
            >
              <span className={`h-4 w-4 rounded-full bg-white transition-transform duration-300 ${smartSearch ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Smart Mode</span>
          </div>
          {smartSearch && <span className="flex items-center gap-1 text-[9px] font-black text-brand-glow animate-pulse uppercase tracking-widest">Neural Link Engaged</span>}
        </div>
        
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle">
              <MessageSquare className="h-4 w-4" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInput()}
              placeholder="Ask anything about this page..."
              className="w-full bg-surface-2/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/50 transition-all placeholder:text-text-subtle/60"
            />
          </div>
          <button 
            id="send-btn"
            onClick={handleInput}
            className="h-12 w-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow-sm hover:shadow-glow hover:scale-105 active:scale-95 transition-all duration-200 group"
          >
            <Send className="h-5 w-5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-4 text-[9px] font-bold text-text-muted/40 uppercase tracking-widest">
           <span>Esc: Close</span>
           <span>Alt+B: Toggle</span>
           <span>Enter: Chat</span>
        </div>
      </footer>
    </div>
  );
}
