"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MessageSquare, Users, Server, Globe, Terminal,
  Menu, X, LogOut, Send, Settings, Zap, Trophy, Type,
  Play, Pause, RotateCcw, Wrench
} from "lucide-react";

interface ChatMessage { time: string; player: string; message: string; }
interface Team { name: string; displayName: string; color: string; players: string[]; }
interface CountdownInterval { label: string; seconds: number; sent: boolean; }

const STORAGE_KEY = "mc-rcon-config";
const MC_COLORS: Record<string, string> = {
  white: "#FFFFFF", yellow: "#FFFF55", gold: "#FFAA00", light_purple: "#FF55FF",
  blue: "#5555FF", green: "#55FF55", aqua: "#55FFFF", red: "#FF5555",
  light_gray: "#AAAAAA", gray: "#555555", dark_purple: "#AA00AA",
  dark_blue: "#0000AA", dark_aqua: "#00AAAA", dark_red: "#AA0000",
  dark_green: "#00AA00", black: "#000000", orange: "#FF8800", pink: "#FF88FF",
};

function loadConfig() {
  if (typeof window === "undefined") return null;
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveConfig(c: { host: string; port: string; password: string }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch {}
}

type Tab = "chat" | "players" | "server" | "world" | "titles" | "teams" | "tools" | "console";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.75rem 1rem", fontSize: "0.9375rem", outline: "none",
  background: "var(--cream)", border: "1px solid var(--navy)", color: "var(--black)",
  fontFamily: "var(--font-sans), sans-serif",
};
const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.5rem",
  padding: "0.625rem 1.25rem", fontSize: "0.75rem", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.15em",
  fontFamily: "var(--font-mono), monospace", border: "1px solid var(--navy)",
  cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
};

function Section({ title, number, children }: { title: string; number?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--navy)", padding: "clamp(2rem, 3vw, 3rem)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        {number && (
          <span style={{
            fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em",
            color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" as const,
          }}>{number}</span>
        )}
        <h3 style={{
          fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.15em", fontFamily: "var(--font-mono), monospace", color: "var(--navy)",
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
        display: "block", fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase" as const,
        letterSpacing: "0.1em", marginBottom: "0.5rem", color: "var(--navy)",
        fontFamily: "var(--font-mono), monospace",
      }}>{label}</label>
      {children}
    </div>
  );
}

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
    <div style={{ background: "var(--cream)", border: "1px solid var(--navy)", padding: "1.25rem", marginTop: "1rem" }}>
      <pre style={{ fontSize: "0.875rem", color: "var(--black)", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono), monospace", lineHeight: 1.8 }}>{value}</pre>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Players
  const [playerName, setPlayerName] = useState("");
  const [playerReason, setPlayerReason] = useState("");
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);

  // World
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

  // Titles
  const [titleText, setTitleText] = useState("");
  const [titleColor, setTitleColor] = useState("white");
  const [subtitleText, setSubtitleText] = useState("");
  const [subtitleColor, setSubtitleColor] = useState("white");
  const [titleFade, setTitleFade] = useState("10");
  const [titleStay, setTitleStay] = useState("40");
  const [titleFadeOut, setTitleFadeOut] = useState("10");
  const [titleTarget, setTitleTarget] = useState("@a");

  // Countdown
  const [countdownTotal, setCountdownTotal] = useState("20:00");
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [countdownRunning, setCountdownRunning] = useState(false);
  const [countdownIntervalsInput, setCountdownIntervalsInput] = useState("15:00, 10:00, 5:00, 3:00, 1:00, 0:10, 0:05, 0:03, 0:02, 0:01");
  const [countdownIntervals, setCountdownIntervals] = useState<CountdownInterval[]>([]);
  const [countdownPrefix, setCountdownPrefix] = useState("");
  const [countdownSuffix, setCountdownSuffix] = useState("");
  const [countdownFinishType, setCountdownFinishType] = useState<"none" | "say" | "command" | "stop" | "restart">("none");
  const [countdownFinishCmd, setCountdownFinishCmd] = useState("");
  const [countdownFinishTitle, setCountdownFinishTitle] = useState("GO!");
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamPlayer, setTeamPlayer] = useState("");
  const [teamDisplayName, setTeamDisplayName] = useState("");
  const [teamPrefix, setTeamPrefix] = useState("");
  const [teamSuffix, setTeamSuffix] = useState("");

  // Scoreboard
  const [sbObjective, setSbObjective] = useState("");
  const [sbCriteria, setSbCriteria] = useState("dummy");
  const [sbDisplayName, setSbDisplayName] = useState("");
  const [sbTarget, setSbTarget] = useState("");
  const [sbScore, setSbScore] = useState("0");
  const [sbSlot, setSbSlot] = useState("sidebar");

  // Boss Bar
  const [bbId, setBbId] = useState("");
  const [bbTitle, setBbTitle] = useState("");
  const [bbColor, setBbColor] = useState("purple");
  const [bbStyle, setBbStyle] = useState("notched_6");
  const [bbValue, setBbValue] = useState("0");
  const [bbMax, setBbMax] = useState("100");
  const [bbRange, setBbRange] = useState("0");
  const bbVisible = "true";

  // Tag
  const [tagName, setTagName] = useState("");
  const [tagTarget, setTagTarget] = useState("");

  // Recipe
  const [recipeTarget, setRecipeTarget] = useState("");
  const [recipeName, setRecipeName] = useState("*");

  // Attribute
  const [attrTarget, setAttrTarget] = useState("");
  const [attrName, setAttrName] = useState("generic.max_health");
  const [attrValue, setAttrValue] = useState("20");

  // Spread
  const [spreadPlayers, setSpreadPlayers] = useState("@a");
  const [spreadMin, setSpreadMin] = useState("10");
  const [spreadMax, setSpreadMax] = useState("30");

  // Sound / Particle
  const [soundName, setSoundName] = useState("entity.player.levelup");
  const [soundSource, setSoundSource] = useState("master");
  const [soundVolume, setSoundVolume] = useState("1");
  const [soundPitch, setSoundPitch] = useState("1");
  const [particleName, setParticleName] = useState("minecraft:happy_villager");
  const [particleX, setParticleX] = useState("~");
  const [particleY, setParticleY] = useState("~");
  const particleZ = "~";
  const [particleCount, setParticleCount] = useState("10");

  // Schedule
  const [schedCommand, setSchedCommand] = useState("");
  const [schedDelay, setSchedDelay] = useState("10s");
  const [schedType, setSchedType] = useState("append");
  const [schedMode, setSchedMode] = useState<"delay" | "at">("delay");
  const [schedTime, setSchedTime] = useState("");

  // Console
  const [rawCommand, setRawCommand] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  const [wlPlayer, setWlPlayer] = useState("");
  const [result, setResult] = useState("");

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [chatMessages]);

  const api = useCallback(async (action: string, params: Record<string, string> = {}) => {
    try {
      const res = await fetch("/api/rcon", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      return await res.json();
    } catch {
      return { success: false, error: "Network error — server may have crashed" };
    }
  }, []);

  const fetchChat = useCallback(async () => {
    try { const d = await api("chatlog"); if (d.success && d.messages) setChatMessages(d.messages); } catch {}
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
      const parts = [d.response || "Done"];
      if (d.debugCmd) parts.push(`CMD: ${d.debugCmd}`);
      if (d.debug) parts.push(`DEBUG: ${JSON.stringify(d.debug)}`);
      if (d.raw && d.raw !== d.response) parts.push(`RAW: ${d.raw}`);
      setResult(parts.join("\n"));
      if (d.response && action === "list") {
        const m = d.response.match(/online players \((\d+)\):\s*(.*)/i) || d.response.match(/There are \d+ .*? online:\s*(.*)/i);
        if (m) setOnlinePlayers(m[2]?.split(", ").filter(Boolean) || m[1]?.split(", ").filter(Boolean) || []);
      }
    } else { setResult(`Error: ${d.error}`); }
  };

  const handleConnect = async () => {
    setLoading(true); setStatus("Connecting...");
    const d = await api("connect", { host, port, password });
    if (d.success) { setConnected(true); setStatus(d.message); setShowSettings(false); saveConfig({ host, port, password }); }
    else { setStatus(`Error: ${d.error}`); }
    setLoading(false);
  };
  const handleDisconnect = async () => { await api("disconnect"); setConnected(false); setStatus("Disconnected"); };

  const handleSay = async (e: React.FormEvent) => {
    e.preventDefault(); if (!messageInput.trim()) return;
    setLoading(true); const d = await api("say", { message: messageInput });
    if (d.success) { setMessageInput(""); fetchChat(); } setLoading(false);
  };
  const handleRaw = async (e: React.FormEvent) => {
    e.preventDefault(); if (!rawCommand.trim()) return;
    setLoading(true); const d = await api("raw", { command: rawCommand }); setLoading(false);
    setConsoleOutput((p) => [...p, `$ ${rawCommand}`, d.success ? (d.response || "(no response)") : `Error: ${d.error}`]);
    setRawCommand("");
  };

  // ── Title send ──
  const sendTitle = async (type: "title" | "subtitle" | "actionbar") => {
    setLoading(true);
    if (type === "title") {
      await api("title", { player: titleTarget, text: titleText, color: titleColor, fade: titleFade, stay: titleStay, fadeOut: titleFadeOut });
      if (subtitleText) await api("subtitle", { player: titleTarget, text: subtitleText, color: subtitleColor });
    } else if (type === "subtitle") {
      await api("subtitle", { player: titleTarget, text: subtitleText, color: subtitleColor });
    } else {
      await api("title_actionbar", { player: titleTarget, text: titleText, color: titleColor });
    }
    setLoading(false);
  };

  // ── Countdown ──
  const parseCountdownInput = (val: string): number => {
    const parts = val.split(":");
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    return parseInt(val) || 0;
  };

  const parseIntervals = (): CountdownInterval[] => {
    return countdownIntervalsInput.split(",").map((s) => {
      const t = s.trim();
      const secs = parseCountdownInput(t);
      const m = Math.floor(secs / 60);
      const sec = secs % 60;
      const label = m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}`;
      return { label, seconds: secs, sent: false };
    }).filter((i) => i.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  };

  const startCountdown = () => {
    const total = parseCountdownInput(countdownTotal);
    if (total <= 0) return;
    setCountdownIntervals(parseIntervals());
    setCountdownRemaining(total);
    setCountdownRunning(true);
  };

  const resetCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdownRunning(false);
    setCountdownRemaining(0);
    setCountdownIntervals((prev) => prev.map((i) => ({ ...i, sent: false })));
  };

  useEffect(() => {
    if (!countdownRunning) { if (countdownRef.current) clearInterval(countdownRef.current); return; }
    countdownRef.current = setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setTimeout(() => setCountdownRunning(false), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdownRunning]);

  const countdownFinishedRef = useRef(false);

  useEffect(() => {
    if (countdownRemaining === 0 && !countdownRunning && countdownFinishedRef.current) return;
    if (countdownRemaining === 0 && !countdownRunning && !countdownFinishedRef.current) {
      countdownFinishedRef.current = true;
      const prefix = countdownPrefix ? `${countdownPrefix} ` : "";
      const suffix = countdownSuffix ? ` ${countdownSuffix}` : "";
      void api("title", { player: titleTarget, text: `${prefix}${countdownFinishTitle}${suffix}`, color: "green", fade: "5", stay: "60", fadeOut: "10" });
      if (countdownFinishType === "stop") {
        void api("stop");
        setTimeout(() => setResult("Countdown finished — stopping server"), 0);
      } else if (countdownFinishType === "restart") {
        void api("restart");
        setTimeout(() => setResult("Countdown finished — restarting server"), 0);
      } else if (countdownFinishType === "say" && countdownFinishCmd) {
        void api("say", { message: countdownFinishCmd });
        setTimeout(() => setResult(`Countdown finished — sent: ${countdownFinishCmd}`), 0);
      } else if (countdownFinishType === "command" && countdownFinishCmd) {
        void api("raw", { command: countdownFinishCmd });
        setTimeout(() => setResult(`Countdown finished — ran: ${countdownFinishCmd}`), 0);
      } else {
        setTimeout(() => setResult("Countdown finished"), 0);
      }
      return;
    }
    if (countdownRunning) {
      countdownFinishedRef.current = false;
    }
    countdownIntervals.forEach((interval) => {
      if (!interval.sent && countdownRemaining === interval.seconds) {
        setCountdownIntervals((prev) => prev.map((i) => i.seconds === interval.seconds ? { ...i, sent: true } : i));
        const prefix = countdownPrefix ? `${countdownPrefix} ` : "";
        const suffix = countdownSuffix ? ` ${countdownSuffix}` : "";
        const timeStr = interval.seconds <= 10 ? `${interval.seconds}` : formatTime(interval.seconds);
        void api("title", { player: titleTarget, text: `${prefix}${timeStr}${suffix}`, color: interval.seconds <= 10 ? "red" : "gold", fade: "5", stay: "30", fadeOut: "5" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownRemaining, countdownRunning]);

  // ── Teams ──
  const fetchTeams = async () => {
    setLoading(true);
    const d = await api("team_list");
    setLoading(false);
    if (d.success) {
      setTeams(d.teams || []);
      if (!d.teams || d.teams.length === 0) setResult("No teams found. Create one below.");
    } else {
      setResult(`Error: ${d.error}`);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare size={14} /> },
    { id: "players", label: "Players", icon: <Users size={14} /> },
    { id: "titles", label: "Titles", icon: <Type size={14} /> },
    { id: "teams", label: "Teams", icon: <Trophy size={14} /> },
    { id: "tools", label: "Tools", icon: <Wrench size={14} /> },
    { id: "server", label: "Server", icon: <Server size={14} /> },
    { id: "world", label: "World", icon: <Globe size={14} /> },
    { id: "console", label: "Console", icon: <Terminal size={14} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--cream)", borderBottom: "1px solid var(--navy)", height: "4rem", display: "flex", alignItems: "center",
      }}>
        <div style={{
          maxWidth: "1200px", width: "100%", margin: "0 auto",
          padding: "0 clamp(2rem, 8vw, 8rem)", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ width: "2rem", height: "2rem", background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "0.75rem" }}>M</div>
            <span style={{ fontWeight: 900, fontSize: "0.875rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--navy)" }}>MC RCON</span>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "#27ae60" : "var(--red)" }} />
          </div>
          <div style={{ display: "flex", gap: "0.25rem" }} className="hidden md:flex">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.7rem", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "var(--font-mono), monospace",
                  background: tab === t.id ? "var(--navy)" : "transparent", color: tab === t.id ? "var(--cream)" : "var(--navy)",
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} className="hidden md:flex">
            <button onClick={() => setShowSettings(!showSettings)}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.15em", background: "transparent", border: "none", color: "var(--navy)", cursor: "pointer" }}>
              <Settings size={14} />{showSettings ? "Hide" : "Config"}
            </button>
            <button onClick={connected ? handleDisconnect : handleConnect} disabled={loading}
              style={{ ...btnBase, background: connected ? "var(--red)" : "var(--navy)", color: "var(--cream)", borderColor: connected ? "var(--red)" : "var(--navy)", opacity: loading ? 0.5 : 1 }}>
              {loading ? "..." : connected ? <><LogOut size={14} /> Disconnect</> : <><Zap size={14} /> Connect</>}
            </button>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden" style={{ background: "none", border: "none", color: "var(--navy)", cursor: "pointer" }}>
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {mobileMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "var(--cream)", padding: "clamp(2rem, 8vw, 8rem)", paddingTop: "6rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} className="md:hidden">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setMobileMenu(false); }}
              style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 0", fontSize: "1.25rem", fontWeight: 700, background: "none", border: "none", color: tab === t.id ? "var(--red)" : "var(--navy)", cursor: "pointer", textAlign: "left", width: "100%", borderBottom: "1px solid var(--grey-light)" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      )}

      {showSettings && (
        <div style={{ marginTop: "4rem", background: "var(--cream-dark)", borderBottom: "1px solid var(--navy)", padding: "clamp(1.5rem, 3vw, 2rem) clamp(2rem, 8vw, 8rem)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <span style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "var(--font-mono), monospace", color: "var(--red)", display: "block", marginBottom: "1rem" }}>Server Configuration</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "end" }}>
              <Field label="Server IP"><input type="text" value={host} onChange={(e) => setHost(e.target.value)} style={inputStyle} placeholder="node1234.falixnodes.net" /></Field>
              <Field label="Port"><input type="text" value={port} onChange={(e) => setPort(e.target.value)} style={{ ...inputStyle, width: "6rem" }} /></Field>
              <Field label="RCON Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="Enter password" /></Field>
            </div>
            {status && !connected && <p style={{ fontSize: "0.8125rem", color: "var(--red)", marginTop: "0.5rem" }}>{status}</p>}
          </div>
        </div>
      )}

      <main style={{ flex: 1, marginTop: showSettings ? "0" : "4rem", padding: "clamp(3rem, 6vw, 5rem) clamp(2rem, 8vw, 8rem)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

          {/* ── CHAT ── */}
          {tab === "chat" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" }}>01</span>
                <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>Chat</h2>
              </div>
              <div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} />
              <div style={{ background: "var(--white)", border: "1px solid var(--navy)", padding: "clamp(2rem, 3vw, 3rem)", marginBottom: "1.5rem", maxHeight: "50vh", overflowY: "auto" }}>
                {chatMessages.length === 0 ? (
                  <p style={{ color: "var(--grey)", fontSize: "0.9375rem", textAlign: "center", padding: "3rem 0" }}>{connected ? "No messages yet." : "Connect to your server first."}</p>
                ) : chatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", fontSize: "0.9375rem", lineHeight: 1.8 }}>
                    <span style={{ color: "var(--grey)", fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", minWidth: "70px" }}>{m.time}</span>
                    <span style={{ fontWeight: 700, color: m.player === "Server" ? "var(--red)" : "var(--navy)" }}>&lt;{m.player}&gt;</span>
                    <span style={{ color: "var(--black)" }}>{m.message}</span>
                  </div>
                ))}<div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSay} style={{ display: "flex", gap: "0.75rem" }}>
                <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} disabled={!connected || loading} style={{ ...inputStyle, flex: 1 }} placeholder={connected ? "Type a message..." : "Connect first"} />
                <button type="submit" disabled={!connected || loading} style={{ ...btnBase, background: "var(--navy)", color: "var(--cream)", opacity: (!connected || loading) ? 0.4 : 1 }}><Send size={14} /> Send</button>
              </form>
            </div>
          )}

          {/* ── PLAYERS ── */}
          {tab === "players" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" }}>02</span><h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>Players</h2></div><div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} /></div>
              <Section title="Online Players" number="A">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--grey)" }}>{onlinePlayers.length} player{onlinePlayers.length !== 1 ? "s" : ""}</span>
                  <Btn color="outline" onClick={() => run("list")} disabled={!connected} style={{ padding: "0.5rem 1rem" }}>Refresh</Btn>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {onlinePlayers.length > 0 ? onlinePlayers.map((p) => (
                    <button key={p} onClick={() => setPlayerName(p)} style={{ padding: "0.5rem 1rem", background: "var(--cream)", border: "1px solid var(--navy)", fontSize: "0.875rem", fontWeight: 700, color: "var(--navy)", cursor: "pointer", fontFamily: "var(--font-mono), monospace" }}>{p}</button>
                  )) : <span style={{ color: "var(--grey)", fontSize: "0.875rem" }}>Click Refresh</span>}
                </div>
              </Section>
              <Section title="Player Actions" number="B">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <Field label="Player Name"><input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} style={inputStyle} placeholder="Player name" /></Field>
                  <Field label="Reason (optional)"><input type="text" value={playerReason} onChange={(e) => setPlayerReason(e.target.value)} style={inputStyle} placeholder="Kick/ban reason" /></Field>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <Btn color="cream" onClick={() => run("kick", { player: playerName, reason: playerReason })} disabled={!playerName}>Kick</Btn>
                  <Btn color="red" onClick={() => run("ban", { player: playerName, reason: playerReason })} disabled={!playerName}>Ban</Btn>
                  <Btn color="outline" onClick={() => run("unban", { player: playerName })} disabled={!playerName}>Unban</Btn>
                  <Btn color="navy" onClick={() => run("op", { player: playerName })} disabled={!playerName}>OP</Btn>
                  <Btn color="outline" onClick={() => run("deop", { player: playerName })} disabled={!playerName}>Deop</Btn>
                </div>
              </Section>
              <Section title="Whitelist" number="C">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "end", marginBottom: "1rem" }}>
                  <div style={{ flex: 1 }}><Field label="Player"><input type="text" value={wlPlayer} onChange={(e) => setWlPlayer(e.target.value)} style={inputStyle} placeholder="Player name" /></Field></div>
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

          {/* ── TITLES ── */}
          {tab === "titles" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" }}>03</span><h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>Titles & Countdown</h2></div><div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} /></div>

              {/* Title Builder */}
              <Section title="Title Builder" number="A">
                <Field label="Target Player">
                  <input type="text" value={titleTarget} onChange={(e) => setTitleTarget(e.target.value)} style={inputStyle} placeholder="@a for all players" />
                </Field>

                {/* Preview */}
                <div style={{ background: "#2a2a2a", borderRadius: "4px", padding: "clamp(2rem, 4vw, 4rem)", margin: "1.5rem 0", textAlign: "center", border: "2px solid var(--navy)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: "0.5rem", left: "0.75rem", fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "var(--font-mono), monospace", color: "rgba(255,255,255,0.3)" }}>In-Game Preview</div>
                  {subtitleText && (
                    <div style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)", color: MC_COLORS[subtitleColor] || "#FFFFFF", textShadow: "2px 2px 0px #3f3f3f", marginBottom: "0.5rem", fontWeight: 500 }}>{subtitleText}</div>
                  )}
                  <div style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: MC_COLORS[titleColor] || "#FFFFFF", textShadow: "3px 3px 0px #3f3f3f", fontWeight: 900 }}>{titleText || "Title Text"}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Title Text">
                    <input type="text" value={titleText} onChange={(e) => setTitleText(e.target.value)} style={inputStyle} placeholder="Enter title text" />
                  </Field>
                  <Field label="Color">
                    <select value={titleColor} onChange={(e) => setTitleColor(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: "120px" }}>
                      {Object.keys(MC_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginBottom: "1.5rem" }}>
                  <Field label="Subtitle Text">
                    <input type="text" value={subtitleText} onChange={(e) => setSubtitleText(e.target.value)} style={inputStyle} placeholder="Optional subtitle" />
                  </Field>
                  <Field label="Color">
                    <select value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: "120px" }}>
                      {Object.keys(MC_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <Field label="Fade In (ticks)"><input type="number" value={titleFade} onChange={(e) => setTitleFade(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Stay (ticks)"><input type="number" value={titleStay} onChange={(e) => setTitleStay(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Fade Out (ticks)"><input type="number" value={titleFadeOut} onChange={(e) => setTitleFadeOut(e.target.value)} style={inputStyle} /></Field>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Btn color="navy" onClick={() => sendTitle("title")} disabled={!connected || !titleText}><Type size={14} /> Send Title</Btn>
                  <Btn color="outline" onClick={() => sendTitle("subtitle")} disabled={!connected || !subtitleText}>Subtitle Only</Btn>
                  <Btn color="outline" onClick={() => { api("title_clear", { player: titleTarget }); }} disabled={!connected}>Clear</Btn>
                  <Btn color="outline" onClick={() => { api("title_reset", { player: titleTarget }); }} disabled={!connected}>Reset</Btn>
                </div>
              </Section>

              {/* Countdown */}
              <Section title="Countdown Timer" number="B">
                <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
                  <div style={{ flex: "0 0 auto" }}>
                    <span style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900,
                      color: countdownRemaining <= 10 && countdownRunning ? "var(--red)" : "var(--navy)",
                      letterSpacing: "-0.02em", lineHeight: 1,
                    }}>{countdownRunning ? formatTime(countdownRemaining) : countdownTotal}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <Field label="Duration (MM:SS)">
                      <input type="text" value={countdownTotal} onChange={(e) => setCountdownTotal(e.target.value)} style={inputStyle} placeholder="20:00" disabled={countdownRunning} />
                    </Field>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                      {!countdownRunning ? (
                        <Btn color="navy" onClick={startCountdown} disabled={!connected || countdownRemaining > 0}><Play size={14} /> Start</Btn>
                      ) : (
                        <Btn color="cream" onClick={() => setCountdownRunning(false)} style={{ borderColor: "var(--red)" }}><Pause size={14} /> Pause</Btn>
                      )}
                      <Btn color="outline" onClick={resetCountdown}><RotateCcw size={14} /> Reset</Btn>
                    </div>
                  </div>
                </div>

                {/* Notification Intervals */}
                <div style={{ marginTop: "1.5rem" }}>
                  <Field label="Notification Intervals (comma-separated, MM:SS)">
                    <input type="text" value={countdownIntervalsInput} onChange={(e) => setCountdownIntervalsInput(e.target.value)}
                      style={inputStyle} placeholder="15:00, 10:00, 5:00, 1:00, 0:10, 0:05" disabled={countdownRunning} />
                  </Field>
                  {countdownIntervals.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                      {countdownIntervals.map((interval) => (
                        <span key={interval.seconds} style={{
                          padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", fontWeight: 700,
                          border: "1px solid", borderColor: interval.sent ? "var(--grey-light)" : "var(--navy)",
                          color: interval.sent ? "var(--grey)" : "var(--navy)",
                          background: interval.sent ? "var(--cream-dark)" : "var(--cream)",
                          opacity: interval.sent ? 0.5 : 1,
                        }}>{interval.label}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prefix & Suffix */}
                <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Title Prefix">
                    <input type="text" value={countdownPrefix} onChange={(e) => setCountdownPrefix(e.target.value)}
                      style={inputStyle} placeholder="e.g. Game starts in" disabled={countdownRunning} />
                  </Field>
                  <Field label="Title Suffix">
                    <input type="text" value={countdownSuffix} onChange={(e) => setCountdownSuffix(e.target.value)}
                      style={inputStyle} placeholder="e.g. !" disabled={countdownRunning} />
                  </Field>
                </div>

                {/* Preview */}
                <div style={{ background: "#2a2a2a", borderRadius: "4px", padding: "clamp(1.5rem, 3vw, 2.5rem)", margin: "1.5rem 0", textAlign: "center", border: "2px solid var(--navy)" }}>
                  <div style={{ fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "var(--font-mono), monospace", color: "rgba(255,255,255,0.3)", marginBottom: "0.5rem" }}>Notification Preview</div>
                  <div style={{ fontSize: "clamp(1.2rem, 3vw, 2rem)", color: countdownRemaining <= 10 ? "#FF5555" : "#FFAA00", textShadow: "2px 2px 0px #3f3f3f", fontWeight: 900 }}>
                    {countdownPrefix ? `${countdownPrefix} ` : ""}{countdownRemaining > 0 ? formatTime(countdownRemaining) : countdownFinishTitle}{countdownSuffix ? ` ${countdownSuffix}` : ""}
                  </div>
                </div>

                {/* Finish Action */}
                <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--grey-light)", paddingTop: "1.5rem" }}>
                  <Field label="When Countdown Finishes">
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {[
                        { value: "none", label: "Nothing" },
                        { value: "say", label: "Say Message" },
                        { value: "command", label: "Run Command" },
                        { value: "stop", label: "Stop Server" },
                        { value: "restart", label: "Restart Server" },
                      ].map((opt) => (
                        <Btn key={opt.value} color={countdownFinishType === opt.value ? "navy" : "outline"}
                          onClick={() => setCountdownFinishType(opt.value as typeof countdownFinishType)}
                          disabled={countdownRunning}>{opt.label}</Btn>
                      ))}
                    </div>
                  </Field>

                  {countdownFinishType === "command" && (
                    <div style={{ marginTop: "1rem" }}>
                      <Field label="Command to Execute">
                        <input type="text" value={countdownFinishCmd} onChange={(e) => setCountdownFinishCmd(e.target.value)}
                          style={inputStyle} placeholder="e.g. time set day" disabled={countdownRunning} />
                      </Field>
                      <span style={{ fontSize: "0.75rem", color: "var(--grey)", fontFamily: "var(--font-mono), monospace", marginTop: "0.5rem", display: "block" }}>
                        Supports any RCON command: give, gamemode, time, effect, tp, etc.
                      </span>
                    </div>
                  )}

                  {countdownFinishType === "say" && (
                    <div style={{ marginTop: "1rem" }}>
                      <Field label="Message to Broadcast">
                        <input type="text" value={countdownFinishCmd} onChange={(e) => setCountdownFinishCmd(e.target.value)}
                          style={inputStyle} placeholder="e.g. Game has started!" disabled={countdownRunning} />
                      </Field>
                    </div>
                  )}

                  {countdownFinishType !== "none" && (
                    <div style={{ marginTop: "1rem" }}>
                      <Field label="Finish Title Text">
                        <input type="text" value={countdownFinishTitle} onChange={(e) => setCountdownFinishTitle(e.target.value)}
                          style={inputStyle} placeholder="GO!" disabled={countdownRunning} />
                      </Field>
                    </div>
                  )}
                </div>
              </Section>

              {result && <ResultBox value={result} />}
            </div>
          )}

          {/* ── TEAMS ── */}
          {tab === "teams" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" }}>04</span><h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>Teams</h2></div><div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} /></div>

              <Section title="Team List" number="A">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--grey)" }}>{teams.length} team{teams.length !== 1 ? "s" : ""}</span>
                  <Btn color="outline" onClick={fetchTeams} disabled={!connected} style={{ padding: "0.5rem 1rem" }}>Refresh</Btn>
                </div>
                {teams.length === 0 ? (
                  <p style={{ color: "var(--grey)", fontSize: "0.875rem" }}>Click Refresh to load teams</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                    {teams.map((team) => (
                      <button key={team.name} onClick={() => setSelectedTeam(selectedTeam === team.name ? null : team.name)}
                        style={{
                          background: "var(--cream)", border: "2px solid", borderColor: selectedTeam === team.name ? "var(--red)" : "var(--navy)",
                          padding: "1rem", textAlign: "left", cursor: "pointer", transition: "all 0.15s", position: "relative",
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{
                            width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center",
                            background: MC_COLORS[team.color] || "#555555", color: ["white", "yellow", "gold", "light_gray", "aqua", "green"].includes(team.color) ? "#000" : "#FFF",
                            fontWeight: 900, fontSize: "0.75rem",
                          }}>{(team.displayName || team.name).charAt(0).toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--navy)" }}>{team.displayName || team.name}</div>
                            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", color: "var(--grey)" }}>
                              {team.players.length} player{team.players.length !== 1 ? "s" : ""} &middot; {team.color}
                            </div>
                          </div>
                        </div>
                        {team.players.length > 0 && (
                          <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                            {team.players.map((p) => (
                              <span key={p} style={{ fontSize: "0.625rem", fontFamily: "var(--font-mono), monospace", padding: "2px 6px", background: "var(--white)", border: "1px solid var(--grey-light)" }}>{p}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Section>

              {/* Create / Delete */}
              <Section title="Manage Teams" number="B">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "end", marginBottom: "1rem" }}>
                  <div style={{ flex: 1 }}><Field label="New Team Name"><input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} style={inputStyle} placeholder="team_name" /></Field></div>
                  <Btn color="navy" onClick={() => { run("team_add", { name: newTeamName }); setNewTeamName(""); }} disabled={!newTeamName}>Create</Btn>
                  <Btn color="red" onClick={() => { if (selectedTeam && confirm(`Delete team "${selectedTeam}"?`)) { run("team_remove", { name: selectedTeam }); setSelectedTeam(null); } }} disabled={!selectedTeam}>Delete Selected</Btn>
                </div>
              </Section>

              {/* Edit selected team */}
              {selectedTeam && (
                <Section title={`Edit: ${teams.find((t) => t.name === selectedTeam)?.displayName || selectedTeam}`} number="C">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                    <Field label="Display Name">
                      <input type="text" value={teamDisplayName} onChange={(e) => setTeamDisplayName(e.target.value)} style={inputStyle} placeholder="My Team" />
                    </Field>
                    <Field label="Color">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {Object.keys(MC_COLORS).map((c) => (
                          <button key={c} onClick={() => { run("team_color", { name: selectedTeam, color: c }); }}
                            title={c} style={{
                              width: "1.5rem", height: "1.5rem", background: MC_COLORS[c], border: "2px solid var(--navy)",
                              cursor: "pointer", outline: teams.find((t) => t.name === selectedTeam)?.color === c ? "2px solid var(--red)" : "none",
                              outlineOffset: "1px",
                            }} />
                        ))}
                      </div>
                    </Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                    <Field label="Prefix">
                      <input type="text" value={teamPrefix} onChange={(e) => setTeamPrefix(e.target.value)} style={inputStyle} placeholder="[VIP]" />
                    </Field>
                    <Field label="Suffix">
                      <input type="text" value={teamSuffix} onChange={(e) => setTeamSuffix(e.target.value)} style={inputStyle} placeholder="*" />
                    </Field>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                    <Btn color="navy" onClick={() => { if (teamDisplayName) run("team_displayname", { name: selectedTeam, displayName: teamDisplayName }); }}>Set Display Name</Btn>
                    <Btn color="outline" onClick={() => { if (teamPrefix) run("team_prefix", { name: selectedTeam, prefix: teamPrefix }); }}>Set Prefix</Btn>
                    <Btn color="outline" onClick={() => { if (teamSuffix) run("team_suffix", { name: selectedTeam, suffix: teamSuffix }); }}>Set Suffix</Btn>
                  </div>

                  {/* Player management */}
                  <div style={{ borderTop: "1px solid var(--grey-light)", paddingTop: "1rem" }}>
                    <Field label="Add Player to Team">
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <input type="text" value={teamPlayer} onChange={(e) => setTeamPlayer(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Player name" />
                        <Btn color="navy" onClick={() => { run("team_join", { name: selectedTeam, player: teamPlayer }); setTeamPlayer(""); }} disabled={!teamPlayer}>Join</Btn>
                        <Btn color="outline" onClick={() => { run("team_leave", { player: teamPlayer }); setTeamPlayer(""); }} disabled={!teamPlayer}>Leave</Btn>
                      </div>
                    </Field>
                    <Btn color="outline" onClick={() => run("team_empty", { name: selectedTeam })} style={{ marginTop: "0.75rem" }}>Empty Team</Btn>
                  </div>
                </Section>
              )}

              {result && <ResultBox value={result} />}
            </div>
           )}

          {/* ── TOOLS ── */}
          {tab === "tools" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" as const }}>05</span><h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>Tools</h2></div><div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} /></div>

              {/* Scoreboard */}
              <Section title="Scoreboard" number="A">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Objective Name"><input type="text" value={sbObjective} onChange={(e) => setSbObjective(e.target.value)} style={inputStyle} placeholder="my_score" /></Field>
                  <Field label="Criteria"><select value={sbCriteria} onChange={(e) => setSbCriteria(e.target.value)} style={inputStyle}><option value="dummy">dummy</option><option value="health">health</option><option value="xp">xp</option><option value="level">level</option><option value="food">food</option><option value="air">air</option><option value="armor">armor</option></select></Field>
                  <Field label="Display Name"><input type="text" value={sbDisplayName} onChange={(e) => setSbDisplayName(e.target.value)} style={inputStyle} placeholder="Optional" /></Field>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                  <Btn color="navy" onClick={() => run("scoreboard_add", { objective: sbObjective, criteria: sbCriteria, displayName: sbDisplayName })} disabled={!sbObjective}>Create Objective</Btn>
                  <Btn color="red" onClick={() => run("scoreboard_remove", { objective: sbObjective })} disabled={!sbObjective}>Remove Objective</Btn>
                  <Btn color="outline" onClick={() => run("scoreboard_objectives")}>List Objectives</Btn>
                </div>
                <div style={{ borderTop: "1px solid var(--grey-light)", paddingTop: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                    <Field label="Target"><input type="text" value={sbTarget} onChange={(e) => setSbTarget(e.target.value)} style={inputStyle} placeholder="@a or player" /></Field>
                    <Field label="Objective"><input type="text" value={sbObjective} onChange={(e) => setSbObjective(e.target.value)} style={inputStyle} placeholder="my_score" /></Field>
                    <Field label="Score"><input type="number" value={sbScore} onChange={(e) => setSbScore(e.target.value)} style={inputStyle} /></Field>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                    <Btn color="navy" onClick={() => run("scoreboard_set", { target: sbTarget, objective: sbObjective, score: sbScore })}>Set</Btn>
                    <Btn color="outline" onClick={() => run("scoreboard_add_score", { target: sbTarget, objective: sbObjective, score: sbScore })}>Add</Btn>
                    <Btn color="outline" onClick={() => run("scoreboard_remove_score", { target: sbTarget, objective: sbObjective, score: sbScore })}>Remove</Btn>
                    <Btn color="outline" onClick={() => run("scoreboard_get", { target: sbTarget, objective: sbObjective })}>Get</Btn>
                    <Btn color="red" onClick={() => run("scoreboard_reset", { target: sbTarget, objective: sbObjective })}>Reset</Btn>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--grey-light)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
                    <div><Field label="Display Slot"><select value={sbSlot} onChange={(e) => setSbSlot(e.target.value)} style={{ ...inputStyle, width: "150px" }}><option value="sidebar">sidebar</option><option value="list">list</option><option value="tab">tab</option><option value="below_name">below_name</option></select></Field></div>
                    <Btn color="navy" onClick={() => run("scoreboard_display", { slot: sbSlot, objective: sbObjective })}>Set Display</Btn>
                    <Btn color="outline" onClick={() => run("scoreboard_display", { slot: sbSlot })}>Clear Display</Btn>
                  </div>
                </div>
              </Section>

              {/* Boss Bar */}
              <Section title="Boss Bar" number="B">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="ID"><input type="text" value={bbId} onChange={(e) => setBbId(e.target.value)} style={inputStyle} placeholder="mynamespace:bar" /></Field>
                  <Field label="Title"><input type="text" value={bbTitle} onChange={(e) => setBbTitle(e.target.value)} style={inputStyle} placeholder="Boss HP" /></Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Color"><select value={bbColor} onChange={(e) => setBbColor(e.target.value)} style={inputStyle}>{["pink","blue","red","green","yellow","purple","white"].map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
                  <Field label="Style"><select value={bbStyle} onChange={(e) => setBbStyle(e.target.value)} style={inputStyle}>{["notched_6","notched_10","notched_12","notched_20","progress"].map(s=><option key={s} value={s}>{s}</option>)}</select></Field>
                  <Field label="Value"><input type="number" value={bbValue} onChange={(e) => setBbValue(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Max"><input type="number" value={bbMax} onChange={(e) => setBbMax(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Range"><input type="number" value={bbRange} onChange={(e) => setBbRange(e.target.value)} style={inputStyle} /></Field>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Btn color="navy" onClick={() => run("bossbar_create", { id: bbId, title: bbTitle, color: bbColor, style: bbStyle, value: bbValue, max: bbMax, range: bbRange })}>Create</Btn>
                  <Btn color="outline" onClick={() => run("bossbar_set", { id: bbId, title: bbTitle, value: bbValue, max: bbMax, color: bbColor, style: bbStyle, visible: bbVisible, range: bbRange })}>Update</Btn>
                  <Btn color="outline" onClick={() => run("bossbar_set", { id: bbId, visible: "true" })}>Show</Btn>
                  <Btn color="outline" onClick={() => run("bossbar_set", { id: bbId, visible: "false" })}>Hide</Btn>
                  <Btn color="red" onClick={() => run("bossbar_remove", { id: bbId })}>Remove</Btn>
                  <Btn color="outline" onClick={() => run("bossbar_list")}>List</Btn>
                </div>
              </Section>

              {/* Tags */}
              <Section title="Tags" number="C">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Target"><input type="text" value={tagTarget} onChange={(e) => setTagTarget(e.target.value)} style={inputStyle} placeholder="@a or player" /></Field>
                  <Field label="Tag Name"><input type="text" value={tagName} onChange={(e) => setTagName(e.target.value)} style={inputStyle} placeholder="my_tag" /></Field>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Btn color="navy" onClick={() => run("tag_add", { target: tagTarget, tag: tagName })} disabled={!tagTarget || !tagName}>Add Tag</Btn>
                  <Btn color="red" onClick={() => run("tag_remove", { target: tagTarget, tag: tagName })} disabled={!tagTarget || !tagName}>Remove Tag</Btn>
                  <Btn color="outline" onClick={() => run("tag_list", { target: tagTarget })} disabled={!tagTarget}>List Tags</Btn>
                </div>
              </Section>

              {/* Recipes */}
              <Section title="Recipes" number="D">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Player"><input type="text" value={recipeTarget} onChange={(e) => setRecipeTarget(e.target.value)} style={inputStyle} placeholder="@a or player" /></Field>
                  <Field label="Recipe"><input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} style={inputStyle} placeholder="* for all or recipe id" /></Field>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Btn color="navy" onClick={() => run("recipe_grant", { player: recipeTarget, recipe: recipeName })}>Grant</Btn>
                  <Btn color="red" onClick={() => run("recipe_revoke", { player: recipeTarget, recipe: recipeName })}>Revoke</Btn>
                </div>
              </Section>

              {/* Attributes */}
              <Section title="Attributes" number="E">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Target"><input type="text" value={attrTarget} onChange={(e) => setAttrTarget(e.target.value)} style={inputStyle} placeholder="@a or player" /></Field>
                  <Field label="Attribute"><select value={attrName} onChange={(e) => setAttrName(e.target.value)} style={inputStyle}>{["generic.max_health","generic.movement_speed","generic.attack_damage","generic.armor","generic.follow_range","generic.knockback_resistance","generic.attack_speed","generic.luck","horse.jump_strength","zombie.spawn_reinforcements"].map(a=><option key={a} value={a}>{a}</option>)}</select></Field>
                  <Field label="Value"><input type="number" value={attrValue} onChange={(e) => setAttrValue(e.target.value)} style={inputStyle} /></Field>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Btn color="navy" onClick={() => run("attribute_set", { target: attrTarget, attribute: attrName, value: attrValue })}>Set</Btn>
                  <Btn color="outline" onClick={() => run("attribute_get", { target: attrTarget, attribute: attrName })}>Get</Btn>
                </div>
              </Section>

              {/* Spread Players */}
              <Section title="Spread Players" number="F">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Players"><input type="text" value={spreadPlayers} onChange={(e) => setSpreadPlayers(e.target.value)} style={inputStyle} placeholder="@a" /></Field>
                  <Field label="Min Distance"><input type="number" value={spreadMin} onChange={(e) => setSpreadMin(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Max Distance"><input type="number" value={spreadMax} onChange={(e) => setSpreadMax(e.target.value)} style={inputStyle} /></Field>
                </div>
                <Btn color="navy" onClick={() => run("spread", { players: spreadPlayers, minRange: spreadMin, maxRange: spreadMax, respectTeams: "false", x: "~", z: "~" })}>Spread</Btn>
              </Section>

              {/* Sound / Particle */}
              <Section title="Sound & Particles" number="G">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Sound"><input type="text" value={soundName} onChange={(e) => setSoundName(e.target.value)} style={inputStyle} placeholder="entity.player.levelup" /></Field>
                  <Field label="Source"><select value={soundSource} onChange={(e) => setSoundSource(e.target.value)} style={inputStyle}>{["master","music","record","weather","block","hostile","neutral","player","voice"].map(s=><option key={s} value={s}>{s}</option>)}</select></Field>
                  <Field label="Volume"><input type="number" value={soundVolume} onChange={(e) => setSoundVolume(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Pitch"><input type="number" value={soundPitch} onChange={(e) => setSoundPitch(e.target.value)} style={inputStyle} step="0.1" /></Field>
                </div>
                <Btn color="navy" onClick={() => run("playsound", { sound: soundName, source: soundSource, target: "@a", volume: soundVolume, pitch: soundPitch })} style={{ marginBottom: "1.5rem" }}>Play Sound</Btn>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Particle"><input type="text" value={particleName} onChange={(e) => setParticleName(e.target.value)} style={inputStyle} placeholder="minecraft:happy_villager" /></Field>
                  <Field label="X"><input type="text" value={particleX} onChange={(e) => setParticleX(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Y"><input type="text" value={particleY} onChange={(e) => setParticleY(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Count"><input type="number" value={particleCount} onChange={(e) => setParticleCount(e.target.value)} style={inputStyle} /></Field>
                </div>
                <Btn color="navy" onClick={() => run("particle", { particle: particleName, x: particleX, y: particleY, z: particleZ, dx: "0.5", dy: "0.5", dz: "0.5", speed: "0", count: particleCount, target: "@a" })}>Spawn Particle</Btn>
              </Section>

              {/* Schedule */}
              <Section title="Scheduled Commands" number="H">
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  <button onClick={() => setSchedMode("delay")} style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", background: schedMode === "delay" ? "var(--navy)" : "transparent", color: schedMode === "delay" ? "white" : "var(--navy)", border: "1px solid var(--navy)", cursor: "pointer" }}>Relative Delay</button>
                  <button onClick={() => setSchedMode("at")} style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontFamily: "var(--font-mono), monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", background: schedMode === "at" ? "var(--navy)" : "transparent", color: schedMode === "at" ? "white" : "var(--navy)", border: "1px solid var(--navy)", cursor: "pointer" }}>At Specific Time</button>
                </div>
                <Field label="Command"><input type="text" value={schedCommand} onChange={(e) => setSchedCommand(e.target.value)} style={inputStyle} placeholder="say Hello world" /></Field>
                <div style={{ display: "grid", gridTemplateColumns: schedMode === "at" ? "2fr 1fr" : "2fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  {schedMode === "delay" ? (
                    <Field label="Delay"><input type="text" value={schedDelay} onChange={(e) => setSchedDelay(e.target.value)} style={inputStyle} placeholder="10s, 5m, 1h, 1d" /></Field>
                  ) : (
                    <Field label="Run At (your time)"><input type="datetime-local" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} style={inputStyle} /></Field>
                  )}
                  <div><Field label="Mode"><select value={schedType} onChange={(e) => setSchedType(e.target.value)} style={{ ...inputStyle, width: "100%" }}><option value="append">Append</option><option value="replace">Replace</option></select></Field></div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <Btn color="navy" onClick={() => {
                    if (schedMode === "at" && schedTime) {
                      const target = new Date(schedTime).getTime();
                      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
                      if (diff <= 0) { setResult("Error: Time is in the past"); return; }
                      let delayStr = "";
                      const days = Math.floor(diff / 86400);
                      const hours = Math.floor((diff % 86400) / 3600);
                      const mins = Math.floor((diff % 3600) / 60);
                      const secs = diff % 60;
                      if (days > 0) delayStr += `${days}d `;
                      if (hours > 0) delayStr += `${hours}h `;
                      if (mins > 0) delayStr += `${mins}m `;
                      if (secs > 0) delayStr += `${secs}s`;
                      delayStr = delayStr.trim() || "1s";
                      run("schedule", { command: schedCommand, delay: delayStr, type: schedType });
                    } else {
                      run("schedule", { command: schedCommand, delay: schedDelay, type: schedType });
                    }
                  }} disabled={!schedCommand || (schedMode === "at" && !schedTime)}>Schedule</Btn>
                  <Btn color="outline" onClick={() => run("schedule_list")}>List Scheduled</Btn>
                  <Btn color="red" onClick={() => run("schedule_clear", { command: schedCommand })}>Clear All</Btn>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--grey)", fontFamily: "var(--font-mono), monospace", marginTop: "0.75rem", display: "block" }}>
                  {schedMode === "delay" ? "Delay: 1s, 5m, 1h, 1d" : "Pick a time and the delay is calculated automatically from now"}
                </span>
              </Section>

              {result && <ResultBox value={result} />}
            </div>
          )}

          {/* ── SERVER ── */}
          {tab === "server" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" }}>06</span><h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>Server</h2></div><div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} /></div>
              <Section title="Information" number="A"><div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <Btn color="outline" onClick={() => run("list")}>Player List</Btn><Btn color="outline" onClick={() => run("tps")}>TPS</Btn>
                <Btn color="outline" onClick={() => run("raw", { command: "motd" })}>MOTD</Btn><Btn color="outline" onClick={() => run("raw", { command: "seed" })}>Seed</Btn>
                <Btn color="outline" onClick={() => run("raw", { command: "difficulty" })}>Difficulty</Btn><Btn color="outline" onClick={() => run("raw", { command: "gamerule" })}>Game Rules</Btn>
              </div></Section>
              <Section title="Difficulty" number="B"><div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {["peaceful", "easy", "normal", "hard"].map((d) => (<Btn key={d} color={d === difficultyLevel ? "navy" : "outline"} onClick={() => { setDifficultyLevel(d); run("difficulty", { level: d }); }}>{d}</Btn>))}
              </div></Section>
              <Section title="Danger Zone" number="C"><div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <Btn color="outline" onClick={() => run("save")}>Save All</Btn><Btn color="outline" onClick={() => run("reload")}>Reload</Btn>
                <Btn color="cream" onClick={() => { if (confirm("Restart the server?")) run("restart"); }} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Restart</Btn>
                <Btn color="red" onClick={() => { if (confirm("Stop the server?")) run("stop"); }}>Stop</Btn>
              </div></Section>
              {result && <ResultBox value={result} />}
            </div>
          )}

          {/* ── WORLD ── */}
          {tab === "world" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 3vw, 3rem)" }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" }}>07</span><h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>World</h2></div><div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} /></div>
              <Section title="Time" number="A"><div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                {["day", "noon", "sunset", "night", "midnight"].map((t) => (<Btn key={t} color="outline" onClick={() => run("time", { value: t })}>{t}</Btn>))}
                <input type="number" value={timeValue} onChange={(e) => setTimeValue(e.target.value)} style={{ ...inputStyle, width: "6rem" }} />
                <Btn color="navy" onClick={() => run("time", { value: timeValue })}>Set</Btn>
              </div></Section>
              <Section title="Weather" number="B"><div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                {["clear", "rain", "thunder"].map((w) => (<Btn key={w} color={w === weatherType ? "navy" : "outline"} onClick={() => { setWeatherType(w); run("weather", { type: w, duration: weatherDuration }); }}>{w}</Btn>))}
                <input type="number" value={weatherDuration} onChange={(e) => setWeatherDuration(e.target.value)} style={{ ...inputStyle, width: "6rem" }} placeholder="secs" />
              </div></Section>
              <Section title="Gamemode" number="C">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Player"><input type="text" value={gamemodeTarget} onChange={(e) => setGamemodeTarget(e.target.value)} style={inputStyle} placeholder="Player (empty = all)" /></Field>
                  <Field label="Mode"><select value={gamemodeMode} onChange={(e) => setGamemodeMode(e.target.value)} style={inputStyle}><option value="survival">Survival</option><option value="creative">Creative</option><option value="adventure">Adventure</option><option value="spectator">Spectator</option></select></Field>
                </div>
                <Btn color="navy" onClick={() => run("gamemode", { mode: gamemodeMode, player: gamemodeTarget })}>Set Gamemode</Btn>
              </Section>
              <Section title="Give Items" number="D">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Player"><input type="text" value={giveTarget} onChange={(e) => setGiveTarget(e.target.value)} style={inputStyle} placeholder="Player" /></Field>
                  <Field label="Item"><input type="text" value={giveItem} onChange={(e) => setGiveItem(e.target.value)} style={inputStyle} placeholder="diamond" /></Field>
                  <Field label="Amount"><input type="number" value={giveAmount} onChange={(e) => setGiveAmount(e.target.value)} style={inputStyle} placeholder="1" /></Field>
                </div>
                <Btn color="navy" onClick={() => run("give", { player: giveTarget, item: giveItem, amount: giveAmount })}>Give</Btn>
              </Section>
              <Section title="Effects" number="E">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Player"><input type="text" value={effectTarget} onChange={(e) => setEffectTarget(e.target.value)} style={inputStyle} placeholder="Player" /></Field>
                  <Field label="Effect"><input type="text" value={effectType} onChange={(e) => setEffectType(e.target.value)} style={inputStyle} placeholder="speed, strength..." /></Field>
                  <Field label="Duration"><input type="number" value={effectDuration} onChange={(e) => setEffectDuration(e.target.value)} style={inputStyle} /></Field>
                </div>
                <Btn color="navy" onClick={() => run("effect", { player: effectTarget, effect: effectType, seconds: effectDuration })}>Give Effect</Btn>
              </Section>
              <Section title="Teleport" number="F">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <Field label="Target"><input type="text" value={tpTarget} onChange={(e) => setTpTarget(e.target.value)} style={inputStyle} placeholder="Player" /></Field>
                  <Field label="Destination"><input type="text" value={tpDestination} onChange={(e) => setTpDestination(e.target.value)} style={inputStyle} placeholder="Player or x y z" /></Field>
                </div>
                <Btn color="navy" onClick={() => run("tp", { target: tpTarget, destination: tpDestination })}>Teleport</Btn>
              </Section>
              {result && <ResultBox value={result} />}
            </div>
          )}

          {/* ── CONSOLE ── */}
          {tab === "console" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", color: "var(--red)", border: "1px solid var(--red)", padding: "3px 8px", textTransform: "uppercase" }}>08</span><h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--navy)" }}>Console</h2></div>
              <div style={{ width: "3rem", height: "3px", background: "var(--red)", marginBottom: "clamp(2rem, 3vw, 3rem)" }} />
              <div style={{ background: "var(--navy)", border: "1px solid var(--navy)", padding: "clamp(2rem, 3vw, 3rem)", marginBottom: "1.5rem", minHeight: "50vh", maxHeight: "60vh", overflowY: "auto", fontFamily: "var(--font-mono), monospace" }}>
                {consoleOutput.length === 0 ? <span style={{ color: "var(--grey-light)", fontSize: "0.875rem" }}>Type commands below.</span>
                : consoleOutput.map((line, i) => <div key={i} style={{ fontSize: "0.875rem", lineHeight: 1.8, color: line.startsWith("$") ? "#6bcf7f" : "var(--cream)" }}>{line}</div>)}
              </div>
              <form onSubmit={handleRaw} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span style={{ color: "var(--red)", fontFamily: "var(--font-mono), monospace", fontWeight: 900, fontSize: "1rem" }}>$</span>
                <input type="text" value={rawCommand} onChange={(e) => setRawCommand(e.target.value)} disabled={!connected || loading} style={{ ...inputStyle, flex: 1, fontFamily: "var(--font-mono), monospace" }} placeholder={connected ? "Enter RCON command..." : "Connect first"} />
                <button type="submit" disabled={!connected || loading} style={{ ...btnBase, background: "var(--navy)", color: "var(--cream)", opacity: (!connected || loading) ? 0.4 : 1 }}>Run</button>
              </form>
            </div>
          )}

        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--navy)", padding: "clamp(2rem, 4vw, 3rem) clamp(2rem, 8vw, 8rem)", background: "var(--cream-dark)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--grey)", fontFamily: "var(--font-mono), monospace" }}>MC RCON Dashboard</span>
          <span style={{ fontSize: "0.75rem", color: "var(--grey)", fontFamily: "var(--font-mono), monospace" }}>Minecraft Server Management</span>
        </div>
      </footer>
    </div>
  );
}
