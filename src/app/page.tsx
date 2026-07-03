"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MessageSquare, Users, Server, Globe, Terminal,
  Menu, X, LogOut, Send, Settings, Zap
} from "lucide-react";

interface ChatMessage {
  time: string;
  player: string;
  message: string;
}

const STORAGE_KEY = "mc-rcon-config";

function loadConfig() {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function saveConfig(c: { host: string; port: string; password: string }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch {}
}

type Tab = "chat" | "players" | "server" | "world" | "console";

function Section({ title, number, children }: { title: string; number?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--white)",
      border: "1px solid var(--navy)",
      padding: "clamp(2rem, 3vw, 3rem)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        {number && (
          <span style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.625rem",
            letterSpacing: "0.1em",
            color: "var(--red)",
            border: "1px solid var(--red)",
            padding: "3px 8px",
            textTransform: "uppercase",
          }}>{number}</span>
        )}
        <h3 style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          fontFamily: "var(--font-mono), monospace",
          color: "var(--navy)",
        }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "0.75rem",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "0.5rem",
        color: "var(--navy)",
        fontFamily: "var(--font-mono), monospace",
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  fontSize: "0.9375rem",
  outline: "none",
  background: "var(--cream)",
  border: "1px solid var(--navy)",
  color: "var(--black)",
  fontFamily: "var(--font-sans), sans-serif",
};

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.625rem 1.25rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  fontFamily: "var(--font-mono), monospace",
  border: "1px solid var(--navy)",
  cursor: "pointer",
  transition: "all 0.15s",
};

function Btn({ color = "navy", onClick, disabled, children, style = {} }: {
  color?: string; onClick?: () => void; disabled?: boolean;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  const colors: Record<string, React.CSSProperties> = {
    navy: { background: "var(--navy)", color: "var(--cream)" },
    red: { background: "var(--red)", color: "var(--cream)", borderColor: "var(--red)" },
    outline: { background: "transparent", color: "var(--navy)" },
    cream: { background: "var(--cream)", color: "var(--navy)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...btnBase, ...colors[color], ...style, opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

function ResultBox({ value }: { value: string }) {
  return (
    <div style={{
      background: "var(--cream)",
      border: "1px solid var(--navy)",
      padding: "1.25rem",
      marginTop: "1rem",
    }}>
      <pre style={{
        fontSize: "0.875rem",
        color: "var(--black)",
        whiteSpace: "pre-wrap",
        fontFamily: "var(--font-mono), monospace",
        lineHeight: 1.8,
      }}>{value}</pre>
    </div>
  );
}

export default function Home() {
  const saved = loadConfig();
  const [tab, setTab] = useState<Tab>("chat");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [host, setHost] = useState(saved?.host ?? "");
  const [port, setPort] = useState(saved?.port ?? "25575");
  const [password, setPassword] = useState(saved?.password ?? "");
  const [showSettings, setShowSettings] = useState(!saved);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [playerName, setPlayerName] = useState("");
  const [playerReason, setPlayerReason] = useState("");
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);

  const [gamemodeTarget, setGamemodeTarget] = useState("");
  const [gamemodeMode, setGamemodeMode] = useState("creative");
  const [giveTarget, setGiveTarget] = useState("");
  const [giveItem, setGiveItem] = useState("");
  const [giveAmount, setGiveAmount] = useState("");
  const [effectTarget, setEffectTarget] = useState("");
  const [effectType, setEffectType] = useState("speed");
  const [effectDuration, setEffectDuration] = useState("30");
  const [tpTarget, setTpTarget] = useState("");
  const [tpDestination, setTpDestination] = useState("");
  const [weatherType, setWeatherType] = useState("clear");
  const [weatherDuration, setWeatherDuration] = useState("");
  const [timeValue, setTimeValue] = useState("day");
  const [difficultyLevel, setDifficultyLevel] = useState("normal");

  const [rawCommand, setRawCommand] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  const [wlPlayer, setWlPlayer] = useState("");
  const [result, setResult] = useState("");

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [chatMessages]);

  const api = useCallback(async (action: string, params: Record<string, string> = {}) => {
    const res = await fetch("/api/rcon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    return res.json();
  }, []);

  const fetchChat = useCallback(async () => {
    try {
      const d = await api("chatlog");
      if (d.success && d.messages) setChatMessages(d.messages);
    } catch {}
  }, [api]);

  useEffect(() => {
    if (!connected) return;
    const iv = setInterval(() => { void fetchChat(); }, 3000);
    const t = setTimeout(() => { void fetchChat(); }, 100);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [connected, fetchChat]);

  const run = async (action: string, params: Record<string, string> = {}) => {
    setLoading(true);
    const d = await api(action, params);
    setLoading(false);
    if (d.success) {
      setResult(d.response || "Done");
      if (d.response && action === "list") {
        const m = d.response.match(/online players \((\d+)\):\s*(.*)/i);
        if (m) setOnlinePlayers(m[2].split(", ").filter(Boolean));
      }
    } else {
      setResult(`Error: ${d.error}`);
    }
  };

  const handleConnect = async () => {
    setLoading(true); setStatus("Connecting...");
    const d = await api("connect", { host, port, password });
    if (d.success) {
      setConnected(true); setStatus(d.message); setShowSettings(false);
      saveConfig({ host, port, password });
    } else { setStatus(`Error: ${d.error}`); }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    await api("disconnect");
    setConnected(false); setStatus("Disconnected");
  };

  const handleSay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    setLoading(true);
    const d = await api("say", { message: messageInput });
    if (d.success) { setMessageInput(""); fetchChat(); }
    setLoading(false);
  };

  const handleRaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawCommand.trim()) return;
    setLoading(true);
    const d = await api("raw", { command: rawCommand });
    setLoading(false);
    setConsoleOutput((prev) => [
      ...prev,
      `$ ${rawCommand}`,
      d.success ? (d.response || "(no response)") : `Error: ${d.error}`,
    ]);
    setRawCommand("");
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare size={14} /> },
    { id: "players", label: "Players", icon: <Users size={14} /> },
    { id: "server", label: "Server", icon: <Server size={14} /> },
    { id: "world", label: "World", icon: <Globe size={14} /> },
    { id: "console", label: "Console", icon: <Terminal size={14} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--cream)", borderBottom: "1px solid var(--navy)",
        height: "4rem", display: "flex", alignItems: "center",
      }}>
        <div style={{
          maxWidth: "1200px", width: "100%", margin: "0 auto",
          padding: "0 clamp(2rem, 8vw, 8rem)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            {/* Logo */}
            <div style={{
              width: "2rem", height: "2rem", background: "var(--red)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 900, fontSize: "0.75rem",
            }}>M</div>
            {/* Brand */}
            <span style={{
              fontWeight: 900, fontSize: "0.875rem", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--navy)",
            }}>MC RCON</span>
            {/* Status dot */}
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: connected ? "#27ae60" : "var(--red)",
            }} />
          </div>

          {/* Desktop tabs */}
          <div style={{ display: "flex", gap: "0.25rem" }} className="hidden md:flex">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.5rem 1rem", fontSize: "0.75rem", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.15em",
                  fontFamily: "var(--font-mono), monospace",
                  background: tab === t.id ? "var(--navy)" : "transparent",
                  color: tab === t.id ? "var(--cream)" : "var(--navy)",
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} className="hidden md:flex">
            <button onClick={() => setShowSettings(!showSettings)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5rem 1rem", fontSize: "0.75rem",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.15em",
                background: "transparent", border: "none", color: "var(--navy)",
                cursor: "pointer",
              }}>
              <Settings size={14} />
              {showSettings ? "Hide" : "Config"}
            </button>
            <button onClick={connected ? handleDisconnect : handleConnect} disabled={loading}
              style={{
                ...btnBase,
                background: connected ? "var(--red)" : "var(--navy)",
                color: "var(--cream)",
                borderColor: connected ? "var(--red)" : "var(--navy)",
                opacity: loading ? 0.5 : 1,
              }}>
              {loading ? "..." : connected ? <><LogOut size={14} /> Disconnect</> : <><Zap size={14} /> Connect</>}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden"
            style={{
              background: "none", border: "none", color: "var(--navy)", cursor: "pointer",
            }}>
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      {mobileMenu && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 40, background: "var(--cream)",
          padding: "clamp(2rem, 8vw, 8rem)", paddingTop: "6rem",
          display: "flex", flexDirection: "column", gap: "1.5rem",
        }} className="md:hidden">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setMobileMenu(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "0.75rem 0", fontSize: "1.25rem", fontWeight: 700,
                background: "none", border: "none", color: tab === t.id ? "var(--red)" : "var(--navy)",
                cursor: "pointer", textAlign: "left", width: "100%",
                borderBottom: "1px solid var(--grey-light)",
              }}>
              {t.icon}
              {t.label}
            </button>
          ))}
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button onClick={() => { setShowSettings(!showSettings); setMobileMenu(false); }}
              style={{ ...btnBase, width: "100%", justifyContent: "center" }}>
              <Settings size={14} /> Config
            </button>
            <button onClick={() => { if (connected) { handleDisconnect(); } else { handleConnect(); } setMobileMenu(false); }}
              style={{
                ...btnBase, width: "100%", justifyContent: "center",
                background: connected ? "var(--red)" : "var(--navy)", color: "var(--cream)",
                borderColor: connected ? "var(--red)" : "var(--navy)",
              }}>
              {connected ? <><LogOut size={14} /> Disconnect</> : <><Zap size={14} /> Connect</>}
            </button>
          </div>
        </div>
      )}

      {/* ── SETTINGS PANEL ── */}
      {showSettings && (
        <div style={{
          marginTop: "4rem", background: "var(--cream-dark)",
          borderBottom: "1px solid var(--navy)",
          padding: "clamp(1.5rem, 3vw, 2rem) clamp(2rem, 8vw, 8rem)",
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <span style={{
              fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.15em", fontFamily: "var(--font-mono), monospace",
              color: "var(--red)", display: "block", marginBottom: "1rem",
            }}>Server Configuration</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "end" }}>
              <Field label="Server IP">
                <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
                  style={inputStyle} placeholder="node1234.falixnodes.net" />
              </Field>
              <Field label="Port">
                <input type="text" value={port} onChange={(e) => setPort(e.target.value)}
                  style={{ ...inputStyle, width: "6rem" }} />
              </Field>
              <Field label="RCON Password">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle} placeholder="Enter password" />
              </Field>
            </div>
            <p style={{
              fontSize: "0.8125rem", color: "var(--grey)", marginTop: "0.75rem",
              fontFamily: "var(--font-mono), monospace",
            }}>
              FalixNodes: Config Files &gt; server.properties
            </p>
            {status && !connected && (
              <p style={{ fontSize: "0.8125rem", color: "var(--red)", marginTop: "0.5rem" }}>{status}</p>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{
        flex: 1, marginTop: showSettings ? "0" : "4rem",
        padding: "clamp(3rem, 6vw, 5rem) clamp(2rem, 8vw, 8rem)",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

          {/* ── CHAT ── */}
          {tab === "chat" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <span style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem",
                  letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)",
                  padding: "3px 8px", textTransform: "uppercase",
                }}>01</span>
                <h2 style={{
                  fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900,
                  letterSpacing: "-0.02em", color: "var(--navy)",
                }}>Chat</h2>
              </div>
              <div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} />

              <div style={{
                background: "var(--white)", border: "1px solid var(--navy)",
                padding: "clamp(2rem, 3vw, 3rem)", marginBottom: "1.5rem",
                maxHeight: "50vh", overflowY: "auto",
              }}>
                {chatMessages.length === 0 ? (
                  <p style={{ color: "var(--grey)", fontSize: "0.9375rem", textAlign: "center", padding: "3rem 0" }}>
                    {connected ? "No messages yet." : "Connect to your server first."}
                  </p>
                ) : chatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", fontSize: "0.9375rem", lineHeight: 1.8 }}>
                    <span style={{ color: "var(--grey)", fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", minWidth: "70px" }}>{m.time}</span>
                    <span style={{
                      fontWeight: 700, color: m.player === "Server" ? "var(--red)" : "var(--navy)",
                    }}>&lt;{m.player}&gt;</span>
                    <span style={{ color: "var(--black)" }}>{m.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSay} style={{ display: "flex", gap: "0.75rem" }}>
                <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                  disabled={!connected || loading} style={{ ...inputStyle, flex: 1 }}
                  placeholder={connected ? "Type a message..." : "Connect first"} />
                <button type="submit" disabled={!connected || loading}
                  style={{ ...btnBase, background: "var(--navy)", color: "var(--cream)", opacity: (!connected || loading) ? 0.4 : 1 }}>
                  <Send size={14} /> Send
                </button>
              </form>
            </div>
          )}

          {/* ── PLAYERS ── */}
          {tab === "players" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                  <span style={{
                    fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem",
                    letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)",
                    padding: "3px 8px", textTransform: "uppercase",
                  }}>02</span>
                  <h2 style={{
                    fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900,
                    letterSpacing: "-0.02em", color: "var(--navy)",
                  }}>Players</h2>
                </div>
                <div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} />
              </div>

              <Section title="Online Players" number="A">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--grey)" }}>
                    {onlinePlayers.length} player{onlinePlayers.length !== 1 ? "s" : ""} found
                  </span>
                  <Btn color="outline" onClick={() => run("list")} disabled={!connected} style={{ padding: "0.5rem 1rem" }}>
                    Refresh
                  </Btn>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {onlinePlayers.length > 0 ? onlinePlayers.map((p) => (
                    <button key={p} onClick={() => setPlayerName(p)}
                      style={{
                        padding: "0.5rem 1rem", background: "var(--cream)",
                        border: "1px solid var(--navy)", fontSize: "0.875rem",
                        fontWeight: 700, color: "var(--navy)", cursor: "pointer",
                        fontFamily: "var(--font-mono), monospace", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--navy)"; e.currentTarget.style.color = "var(--cream)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--cream)"; e.currentTarget.style.color = "var(--navy)"; }}>
                      {p}
                    </button>
                  )) : (
                    <span style={{ color: "var(--grey)", fontSize: "0.875rem" }}>Click Refresh to load</span>
                  )}
                </div>
              </Section>

              <Section title="Player Actions" number="B">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <Field label="Player Name">
                    <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                      style={inputStyle} placeholder="Enter player name" />
                  </Field>
                  <Field label="Reason (optional)">
                    <input type="text" value={playerReason} onChange={(e) => setPlayerReason(e.target.value)}
                      style={inputStyle} placeholder="Kick/ban reason" />
                  </Field>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <Btn color="cream" onClick={() => run("kick", { player: playerName, reason: playerReason })} disabled={!playerName}>
                    Kick
                  </Btn>
                  <Btn color="red" onClick={() => run("ban", { player: playerName, reason: playerReason })} disabled={!playerName}>
                    Ban
                  </Btn>
                  <Btn color="outline" onClick={() => run("unban", { player: playerName })} disabled={!playerName}>
                    Unban
                  </Btn>
                  <Btn color="navy" onClick={() => run("op", { player: playerName })} disabled={!playerName}>
                    OP
                  </Btn>
                  <Btn color="outline" onClick={() => run("deop", { player: playerName })} disabled={!playerName}>
                    Deop
                  </Btn>
                </div>
              </Section>

              <Section title="Whitelist" number="C">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "end", marginBottom: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Player">
                      <input type="text" value={wlPlayer} onChange={(e) => setWlPlayer(e.target.value)}
                        style={inputStyle} placeholder="Player name" />
                    </Field>
                  </div>
                  <Btn color="navy" onClick={() => run("whitelist_add", { player: wlPlayer })} disabled={!wlPlayer}>Add</Btn>
                  <Btn color="red" onClick={() => run("whitelist_remove", { player: wlPlayer })} disabled={!wlPlayer}>Remove</Btn>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Btn color="outline" onClick={() => run("whitelist_list")}>List</Btn>
                  <Btn color="outline" onClick={() => run("whitelist_on")}>Enable</Btn>
                  <Btn color="outline" onClick={() => run("whitelist_off")}>Disable</Btn>
                </div>
              </Section>

              {result && <ResultBox value={result} />}
            </div>
          )}

          {/* ── SERVER ── */}
          {tab === "server" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                  <span style={{
                    fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem",
                    letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)",
                    padding: "3px 8px", textTransform: "uppercase",
                  }}>03</span>
                  <h2 style={{
                    fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900,
                    letterSpacing: "-0.02em", color: "var(--navy)",
                  }}>Server</h2>
                </div>
                <div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} />
              </div>

              <Section title="Information" number="A">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <Btn color="outline" onClick={() => run("list")}>Player List</Btn>
                  <Btn color="outline" onClick={() => run("tps")}>TPS</Btn>
                  <Btn color="outline" onClick={() => run("raw", { command: "motd" })}>MOTD</Btn>
                  <Btn color="outline" onClick={() => run("raw", { command: "seed" })}>Seed</Btn>
                  <Btn color="outline" onClick={() => run("raw", { command: "difficulty" })}>Difficulty</Btn>
                  <Btn color="outline" onClick={() => run("raw", { command: "gamerule" })}>Game Rules</Btn>
                </div>
              </Section>

              <Section title="Difficulty" number="B">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {["peaceful", "easy", "normal", "hard"].map((d) => (
                    <Btn key={d}
                      color={d === difficultyLevel ? "navy" : "outline"}
                      onClick={() => { setDifficultyLevel(d); run("difficulty", { level: d }); }}>
                      {d}
                    </Btn>
                  ))}
                </div>
              </Section>

              <Section title="Danger Zone" number="C">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <Btn color="outline" onClick={() => run("save")}>Save All</Btn>
                  <Btn color="outline" onClick={() => run("reload")}>Reload</Btn>
                  <Btn color="cream" onClick={() => { if (confirm("Restart the server?")) run("restart"); }}
                    style={{ borderColor: "var(--red)", color: "var(--red)" }}>Restart</Btn>
                  <Btn color="red" onClick={() => { if (confirm("Stop the server?")) run("stop"); }}>Stop</Btn>
                </div>
              </Section>

              {result && <ResultBox value={result} />}
            </div>
          )}

          {/* ── WORLD ── */}
          {tab === "world" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                  <span style={{
                    fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem",
                    letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)",
                    padding: "3px 8px", textTransform: "uppercase",
                  }}>04</span>
                  <h2 style={{
                    fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900,
                    letterSpacing: "-0.02em", color: "var(--navy)",
                  }}>World</h2>
                </div>
                <div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} />
              </div>

              <Section title="Time" number="A">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                  {["day", "noon", "sunset", "night", "midnight"].map((t) => (
                    <Btn key={t} color="outline" onClick={() => run("time", { value: t })}>{t}</Btn>
                  ))}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginLeft: "0.5rem" }}>
                    <input type="number" value={timeValue} onChange={(e) => setTimeValue(e.target.value)}
                      style={{ ...inputStyle, width: "6rem" }} />
                    <Btn color="navy" onClick={() => run("time", { value: timeValue })}>Set</Btn>
                  </div>
                </div>
              </Section>

              <Section title="Weather" number="B">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                  {["clear", "rain", "thunder"].map((w) => (
                    <Btn key={w} color={w === weatherType ? "navy" : "outline"}
                      onClick={() => { setWeatherType(w); run("weather", { type: w, duration: weatherDuration }); }}>
                      {w}
                    </Btn>
                  ))}
                  <input type="number" value={weatherDuration} onChange={(e) => setWeatherDuration(e.target.value)}
                    style={{ ...inputStyle, width: "6rem" }} placeholder="secs" />
                </div>
              </Section>

              <Section title="Gamemode" number="C">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Player">
                    <input type="text" value={gamemodeTarget} onChange={(e) => setGamemodeTarget(e.target.value)}
                      style={inputStyle} placeholder="Player name (empty = all)" />
                  </Field>
                  <Field label="Mode">
                    <select value={gamemodeMode} onChange={(e) => setGamemodeMode(e.target.value)} style={inputStyle}>
                      <option value="survival">Survival</option>
                      <option value="creative">Creative</option>
                      <option value="adventure">Adventure</option>
                      <option value="spectator">Spectator</option>
                    </select>
                  </Field>
                </div>
                <Btn color="navy" onClick={() => run("gamemode", { mode: gamemodeMode, player: gamemodeTarget })}>
                  Set Gamemode
                </Btn>
              </Section>

              <Section title="Give Items" number="D">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Player">
                    <input type="text" value={giveTarget} onChange={(e) => setGiveTarget(e.target.value)}
                      style={inputStyle} placeholder="Player" />
                  </Field>
                  <Field label="Item">
                    <input type="text" value={giveItem} onChange={(e) => setGiveItem(e.target.value)}
                      style={inputStyle} placeholder="e.g. diamond" />
                  </Field>
                  <Field label="Amount">
                    <input type="number" value={giveAmount} onChange={(e) => setGiveAmount(e.target.value)}
                      style={inputStyle} placeholder="1" />
                  </Field>
                </div>
                <Btn color="navy" onClick={() => run("give", { player: giveTarget, item: giveItem, amount: giveAmount })}>
                  Give
                </Btn>
              </Section>

              <Section title="Effects" number="E">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Player">
                    <input type="text" value={effectTarget} onChange={(e) => setEffectTarget(e.target.value)}
                      style={inputStyle} placeholder="Player" />
                  </Field>
                  <Field label="Effect">
                    <input type="text" value={effectType} onChange={(e) => setEffectType(e.target.value)}
                      style={inputStyle} placeholder="speed, strength..." />
                  </Field>
                  <Field label="Duration (sec)">
                    <input type="number" value={effectDuration} onChange={(e) => setEffectDuration(e.target.value)}
                      style={inputStyle} />
                  </Field>
                </div>
                <Btn color="navy" onClick={() => run("effect", { player: effectTarget, effect: effectType, seconds: effectDuration })}>
                  Give Effect
                </Btn>
              </Section>

              <Section title="Teleport" number="F">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Target">
                    <input type="text" value={tpTarget} onChange={(e) => setTpTarget(e.target.value)}
                      style={inputStyle} placeholder="Player" />
                  </Field>
                  <Field label="Destination">
                    <input type="text" value={tpDestination} onChange={(e) => setTpDestination(e.target.value)}
                      style={inputStyle} placeholder="Player or x y z" />
                  </Field>
                </div>
                <Btn color="navy" onClick={() => run("tp", { target: tpTarget, destination: tpDestination })}>
                  Teleport
                </Btn>
              </Section>

              {result && <ResultBox value={result} />}
            </div>
          )}

          {/* ── CONSOLE ── */}
          {tab === "console" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <span style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem",
                  letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)",
                  padding: "3px 8px", textTransform: "uppercase",
                }}>05</span>
                <h2 style={{
                  fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900,
                  letterSpacing: "-0.02em", color: "var(--navy)",
                }}>Console</h2>
              </div>
              <div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} />

              <div style={{
                background: "var(--navy)", border: "1px solid var(--navy)",
                padding: "clamp(2rem, 3vw, 3rem)", marginBottom: "1.5rem",
                minHeight: "50vh", maxHeight: "60vh", overflowY: "auto",
                fontFamily: "var(--font-mono), monospace",
              }}>
                {consoleOutput.length === 0 ? (
                  <span style={{ color: "var(--grey-light)", fontSize: "0.875rem" }}>
                    Type commands below. Responses appear here.
                  </span>
                ) : consoleOutput.map((line, i) => (
                  <div key={i} style={{
                    fontSize: "0.875rem", lineHeight: 1.8,
                    color: line.startsWith("$") ? "#6bcf7f" : "var(--cream)",
                  }}>{line}</div>
                ))}
              </div>

              <form onSubmit={handleRaw} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span style={{
                  color: "var(--red)", fontFamily: "var(--font-mono), monospace",
                  fontWeight: 900, fontSize: "1rem",
                }}>$</span>
                <input type="text" value={rawCommand} onChange={(e) => setRawCommand(e.target.value)}
                  disabled={!connected || loading} style={{ ...inputStyle, flex: 1, fontFamily: "var(--font-mono), monospace" }}
                  placeholder={connected ? "Enter RCON command..." : "Connect first"} />
                <button type="submit" disabled={!connected || loading}
                  style={{ ...btnBase, background: "var(--navy)", color: "var(--cream)", opacity: (!connected || loading) ? 0.4 : 1 }}>
                  Run
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid var(--navy)",
        padding: "clamp(2rem, 4vw, 3rem) clamp(2rem, 8vw, 8rem)",
        background: "var(--cream-dark)",
      }}>
        <div style={{
          maxWidth: "1200px", margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{
            fontSize: "0.75rem", color: "var(--grey)",
            fontFamily: "var(--font-mono), monospace",
          }}>MC RCON Dashboard</span>
          <span style={{
            fontSize: "0.75rem", color: "var(--grey)",
            fontFamily: "var(--font-mono), monospace",
          }}>Minecraft Server Management</span>
        </div>
      </footer>
    </div>
  );
}
