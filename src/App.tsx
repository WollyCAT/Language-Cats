import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cat, Settings, Check, Copy, Wand2, RefreshCw, X, Sparkles, MessageCircle } from "lucide-react";
import { cn } from "./lib/utils";

interface GrammarError {
  id: string;
  originalText: string;
  suggestedChange: string;
  reason: string;
  accepted?: boolean;
}

type Tab = "grammar" | "tone";
type Tone = "Formal" | "Casual" | "Harsh" | "Friendly";
type Provider = "google" | "openai" | "anthropic";
type Language = "English" | "Japanese" | "Chinese (Traditional)";

const MODELS: Record<Provider, string[]> = {
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("grammar");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<Provider>("google");
  const [model, setModel] = useState<string>(MODELS["google"][0]);
  const [language, setLanguage] = useState<Language>("English");

  useEffect(() => {
    setModel(MODELS[provider][0]);
  }, [provider]);

  // Grammar State
  const [grammarInput, setGrammarInput] = useState("");
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const [hasCheckedGrammar, setHasCheckedGrammar] = useState(false);

  // Tone State
  const [toneInput, setToneInput] = useState("");
  const [selectedTone, setSelectedTone] = useState<Tone>("Friendly");
  const [isRevisingTone, setIsRevisingTone] = useState(false);
  const [toneOutput, setToneOutput] = useState("");

  const handleGrammarCheck = async () => {
    if (!grammarInput.trim()) return;
    setIsCheckingGrammar(true);
    setGrammarErrors([]);
    setHasCheckedGrammar(false);

    try {
      const res = await fetch("/api/check-grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: grammarInput,
          provider,
          model,
          apiKey,
          language,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to check grammar");
      }

      const data = await res.json();
      const errors = (data.errors || []).map((e: any) => ({
        ...e,
        id: Math.random().toString(36).substr(2, 9),
        accepted: false,
      }));
      setGrammarErrors(errors);
      setHasCheckedGrammar(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  const handleToneRevision = async () => {
    if (!toneInput.trim()) return;
    setIsRevisingTone(true);
    setToneOutput("");

    try {
      const res = await fetch("/api/revise-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: toneInput,
          provider,
          model,
          apiKey,
          language,
          tone: selectedTone,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to revise tone");
      }

      const data = await res.json();
      setToneOutput(data.revisedText);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsRevisingTone(false);
    }
  };

  const acceptError = (id: string) => {
    setGrammarErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, accepted: true } : e))
    );
  };

  const copyRevisedGrammar = () => {
    // Generate text with accepted changes
    const finalChunks = buildChunks(grammarInput, grammarErrors);
    const text = finalChunks
      .map((c) => {
        if (c.type === "error" && c.error) {
          return c.error.accepted ? c.error.suggestedChange : c.error.originalText;
        }
        return c.value;
      })
      .join("");
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const copyToneOutput = () => {
    navigator.clipboard.writeText(toneOutput);
    alert("Copied to clipboard!");
  };

  const chunks = useMemo(() => {
    if (!hasCheckedGrammar) return [];
    return buildChunks(grammarInput, grammarErrors);
  }, [grammarInput, grammarErrors, hasCheckedGrammar]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-rose-500/30">
      {/* Header */}
      <header className="border-b border-neutral-800/60 bg-neutral-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Cat className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Language Cats
              <Sparkles className="w-4 h-4 text-orange-400" />
            </h1>
          </div>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Settings Dropdown */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-b border-neutral-800 bg-neutral-900 shadow-2xl"
          >
            <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400 block">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white"
                >
                  <option>English</option>
                  <option>Japanese</option>
                  <option>Chinese (Traditional)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400 block">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as Provider)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white"
                >
                  <option value="google">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400 block">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white"
                >
                  {MODELS[provider].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400 block flex items-center justify-between">
                  API Key
                  {provider === "google" && (
                    <span className="text-xs text-orange-400">Optional if set in Env</span>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter ${provider} API Key`}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-neutral-900 rounded-xl mb-8 w-fit border border-neutral-800/60 shadow-inner">
          <button
            onClick={() => setActiveTab("grammar")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative z-10",
              activeTab === "grammar"
                ? "text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            )}
          >
            {activeTab === "grammar" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-neutral-800 rounded-lg -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Wand2 className="w-4 h-4" />
            Grammar Check
          </button>
          <button
            onClick={() => setActiveTab("tone")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative z-10",
              activeTab === "tone"
                ? "text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            )}
          >
            {activeTab === "tone" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-neutral-800 rounded-lg -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <MessageCircle className="w-4 h-4" />
            Tone Revision
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "grammar" ? (
            <motion.div
              key="grammar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Area */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium tracking-tight text-neutral-300">
                      Original Text
                    </label>
                  </div>
                  <textarea
                    value={grammarInput}
                    onChange={(e) => {
                      setGrammarInput(e.target.value);
                      if (hasCheckedGrammar) setHasCheckedGrammar(false);
                    }}
                    placeholder="Type or paste your text here..."
                    className="w-full h-80 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all placeholder:text-neutral-600 leading-relaxed"
                  />
                  <button
                    onClick={handleGrammarCheck}
                    disabled={isCheckingGrammar || !grammarInput.trim()}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {isCheckingGrammar ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Cat className="w-5 h-5" />
                    )}
                    Meow Check
                  </button>
                </div>

                {/* Output Area */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium tracking-tight text-neutral-300">
                      Review & Fix
                    </label>
                    {hasCheckedGrammar && (
                      <button
                        onClick={copyRevisedGrammar}
                        className="text-xs font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Revised
                      </button>
                    )}
                  </div>
                  
                  <div className="w-full h-80 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-sm md:text-base overflow-y-auto leading-relaxed relative">
                    {!hasCheckedGrammar ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
                        <Cat className="w-12 h-12 mb-3 opacity-20" />
                        <p>Waiting to check your text...</p>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {chunks.map((chunk, i) => {
                          if (chunk.type === "string") {
                            return <span key={i}>{chunk.value}</span>;
                          }
                          const err = chunk.error!;
                          if (err.accepted) {
                            return (
                              <motion.span
                                initial={{ backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}
                                animate={{ backgroundColor: "transparent", color: "#4ade80" }}
                                key={i}
                                className="font-medium"
                              >
                                {err.suggestedChange}
                              </motion.span>
                            );
                          }
                          return (
                            <span
                              key={i}
                              className="bg-red-500/20 text-red-200 border-b-2 border-red-500 cursor-pointer hover:bg-red-500/30 transition-colors px-0.5 rounded-sm"
                            >
                              {err.originalText}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Details List */}
              {hasCheckedGrammar && grammarErrors.filter((e) => !e.accepted).length > 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold tracking-tight text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    Suggested Fixes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {grammarErrors
                        .filter((e) => !e.accepted)
                        .map((err) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={err.id}
                            className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="line-through text-red-400 font-medium text-sm">
                                  {err.originalText}
                                </span>
                                <span className="text-neutral-500">→</span>
                                <span className="text-green-400 font-medium text-sm border-b border-green-400/30 pb-0.5">
                                  {err.suggestedChange}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 leading-relaxed">
                                {err.reason}
                              </p>
                            </div>
                            <div className="flex justify-end mt-auto">
                              <button
                                onClick={() => acceptError(err.id)}
                                className="text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Accept
                              </button>
                            </div>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
              {hasCheckedGrammar && grammarErrors.filter((e) => !e.accepted).length === 0 && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <Cat className="w-8 h-8 mb-2" />
                  <p className="font-medium text-sm">All perfect! Your text is meow-nificent.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Area */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium tracking-tight text-neutral-300">
                      Text to Revise
                    </label>
                  </div>
                  <textarea
                    value={toneInput}
                    onChange={(e) => setToneInput(e.target.value)}
                    placeholder="Type the text you want to rewrite..."
                    className="w-full h-64 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all placeholder:text-neutral-600 leading-relaxed"
                  />

                  {/* Tone Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {(["Formal", "Casual", "Harsh", "Friendly"] as Tone[]).map(
                      (tone) => (
                        <button
                          key={tone}
                          onClick={() => setSelectedTone(tone)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-sm font-medium transition-all duration-200",
                            selectedTone === tone
                              ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-900/20"
                              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                          )}
                        >
                          {tone}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={handleToneRevision}
                    disabled={isRevisingTone || !toneInput.trim()}
                    className="w-full mt-2 bg-orange-600 hover:bg-orange-500 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {isRevisingTone ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Wand2 className="w-5 h-5" />
                    )}
                    Revise Tone
                  </button>
                </div>

                {/* Output Area */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium tracking-tight text-neutral-300">
                      Revised Result
                    </label>
                    {toneOutput && (
                      <button
                        onClick={copyToneOutput}
                        className="text-xs font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Revised
                      </button>
                    )}
                  </div>
                  <div className="w-full h-full min-h-64 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-sm md:text-base overflow-y-auto leading-relaxed relative">
                    {!toneOutput && !isRevisingTone ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
                        <Cat className="w-12 h-12 mb-3 opacity-20" />
                        <p>Select a tone and hit revise!</p>
                      </div>
                    ) : isRevisingTone ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-400">
                        <RefreshCw className="w-8 h-8 mb-3 animate-spin opacity-50" />
                        <p className="text-sm animate-pulse">Polishing text...</p>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-neutral-200">
                        {toneOutput}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Helper function to segment the text based on the found errors
function buildChunks(text: string, errors: GrammarError[]) {
  type Chunk = { type: "string" | "error"; value: string; error?: GrammarError };
  let chunks: Chunk[] = [{ type: "string", value: text }];

  errors.forEach((error) => {
    let found = false;
    chunks = chunks.flatMap((chunk) => {
      if (found || chunk.type === "error" || !error.originalText) {
        return [chunk];
      }
      const index = chunk.value.indexOf(error.originalText);
      if (index !== -1) {
        found = true;
        const before = chunk.value.slice(0, index);
        const after = chunk.value.slice(index + error.originalText.length);
        const result: Chunk[] = [];
        if (before) result.push({ type: "string", value: before });
        result.push({ type: "error", value: error.originalText, error });
        if (after) result.push({ type: "string", value: after });
        return result;
      }
      return [chunk];
    });
  });

  return chunks;
}

