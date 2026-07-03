import { Rcon } from "rcon-client";
import { NextResponse } from "next/server";

let rcon: Rcon | null = null;

interface ChatMessage {
  time: string;
  player: string;
  message: string;
  source: "rcon" | "log";
}

const chatLog: ChatMessage[] = [];

function addChatMessage(msg: ChatMessage) {
  chatLog.push(msg);
  if (chatLog.length > 500) chatLog.shift();
}

async function connectRcon(host: string, port: number, password: string) {
  if (rcon) {
    try { await rcon.end(); } catch {}
  }
  rcon = await Rcon.connect({ host, port, password });
}

async function sendCommand(command: string): Promise<string> {
  if (!rcon) throw new Error("Not connected to RCON");
  return await rcon.send(command);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "connect": {
        const { host, port, password } = body;
        await connectRcon(host, parseInt(port, 10) || 25575, password);
        return NextResponse.json({ success: true, message: `Connected to ${host}:${port}` });
      }

      case "disconnect": {
        if (rcon) { try { await rcon.end(); } catch {} rcon = null; }
        return NextResponse.json({ success: true, message: "Disconnected" });
      }

      // ── Chat ──
      case "say": {
        const msg = body.message || "";
        await sendCommand(`say ${msg}`);
        addChatMessage({ time: new Date().toLocaleTimeString(), player: "Server", message: msg, source: "rcon" });
        return NextResponse.json({ success: true });
      }
      case "msg": {
        const { target, message } = body;
        await sendCommand(`msg ${target} ${message}`);
        return NextResponse.json({ success: true });
      }
      case "chatlog": {
        return NextResponse.json({ success: true, messages: chatLog.slice(-200) });
      }

      // ── Players ──
      case "list": {
        const result = await sendCommand("list");
        return NextResponse.json({ success: true, response: result });
      }
      case "list_uuids": {
        const result = await sendCommand("list uuids");
        return NextResponse.json({ success: true, response: result });
      }
      case "kick": {
        const { player, reason } = body;
        await sendCommand(`kick ${player}${reason ? ` ${reason}` : ""}`);
        return NextResponse.json({ success: true, response: `Kicked ${player}` });
      }
      case "ban": {
        const { player, reason } = body;
        await sendCommand(`ban ${player}${reason ? ` ${reason}` : ""}`);
        return NextResponse.json({ success: true, response: `Banned ${player}` });
      }
      case "unban": {
        const { player } = body;
        await sendCommand(`pardon ${player}`);
        return NextResponse.json({ success: true, response: `Unbanned ${player}` });
      }
      case "banlist": {
        const result = await sendCommand("banlist");
        return NextResponse.json({ success: true, response: result });
      }
      case "op": {
        const { player } = body;
        await sendCommand(`op ${player}`);
        return NextResponse.json({ success: true, response: `Opped ${player}` });
      }
      case "deop": {
        const { player } = body;
        await sendCommand(`deop ${player}`);
        return NextResponse.json({ success: true, response: `De-opped ${player}` });
      }
      case "whitelist_add": {
        const { player } = body;
        await sendCommand(`whitelist add ${player}`);
        return NextResponse.json({ success: true, response: `Added ${player} to whitelist` });
      }
      case "whitelist_remove": {
        const { player } = body;
        await sendCommand(`whitelist remove ${player}`);
        return NextResponse.json({ success: true, response: `Removed ${player} from whitelist` });
      }
      case "whitelist_list": {
        const result = await sendCommand("whitelist list");
        return NextResponse.json({ success: true, response: result });
      }
      case "whitelist_on": {
        await sendCommand("whitelist on");
        return NextResponse.json({ success: true, response: "Whitelist enabled" });
      }
      case "whitelist_off": {
        await sendCommand("whitelist off");
        return NextResponse.json({ success: true, response: "Whitelist disabled" });
      }

      // ── Give / Items ──
      case "give": {
        const { player, item, amount } = body;
        const cmd = amount ? `give ${player} ${item} ${amount}` : `give ${player} ${item}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result });
      }
      case "clear": {
        const { player } = body;
        const result = await sendCommand(player ? `clear ${player}` : "clear");
        return NextResponse.json({ success: true, response: result });
      }

      // ── World ──
      case "time": {
        const { value } = body;
        const result = await sendCommand(`time set ${value}`);
        return NextResponse.json({ success: true, response: result });
      }
      case "weather": {
        const { type, duration } = body;
        const cmd = duration ? `weather ${type} ${duration}` : `weather ${type}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result });
      }
      case "gamemode": {
        const { mode, player } = body;
        const result = await sendCommand(`gamemode ${mode}${player ? ` ${player}` : ""}`);
        return NextResponse.json({ success: true, response: result });
      }
      case "difficulty": {
        const { level } = body;
        const result = await sendCommand(`difficulty ${level}`);
        return NextResponse.json({ success: true, response: result });
      }
      case "tp": {
        const { target, destination } = body;
        const result = await sendCommand(`tp ${target} ${destination}`);
        return NextResponse.json({ success: true, response: result });
      }
      case "effect": {
        const { player, effect, seconds, amplifier } = body;
        const cmd = seconds
          ? `effect give ${player} ${effect} ${seconds}${amplifier ? ` ${amplifier}` : ""}`
          : `effect give ${player} ${effect}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result });
      }
      case "enchant": {
        const { player, enchantment, level } = body;
        const result = await sendCommand(`enchant ${player} ${enchantment}${level ? ` ${level}` : ""}`);
        return NextResponse.json({ success: true, response: result });
      }

      // ── Server ──
      case "server_info": {
        const result = await sendCommand("list");
        const motd = await sendCommand("motd");
        const tps = await sendCommand("tps");
        return NextResponse.json({ success: true, response: { list: result, motd, tps } });
      }
      case "tps": {
        const result = await sendCommand("tps");
        return NextResponse.json({ success: true, response: result });
      }
      case "save": {
        const result = await sendCommand("save-all");
        return NextResponse.json({ success: true, response: result });
      }
      case "restart": {
        await sendCommand("restart");
        return NextResponse.json({ success: true, response: "Restart command sent" });
      }
      case "stop": {
        await sendCommand("stop");
        return NextResponse.json({ success: true, response: "Stop command sent" });
      }
      case "reload": {
        const result = await sendCommand("reload");
        return NextResponse.json({ success: true, response: result });
      }

      // ── Titles ──
      case "title": {
        const { player, text, color, fade, stay, fadeOut } = body;
        const p = player || "@a";
        if (fade || stay || fadeOut) {
          await sendCommand(`title ${p} times ${fade || 10} ${stay || 40} ${fadeOut || 10}`);
        }
        const jsonText = JSON.stringify({
          text: text || "",
          color: color || "white",
        });
        await sendCommand(`title ${p} title ${jsonText}`);
        return NextResponse.json({ success: true });
      }
      case "subtitle": {
        const { player, text, color } = body;
        const p = player || "@a";
        const jsonText = JSON.stringify({
          text: text || "",
          color: color || "white",
        });
        await sendCommand(`title ${p} subtitle ${jsonText}`);
        return NextResponse.json({ success: true });
      }
      case "title_actionbar": {
        const { player, text, color } = body;
        const p = player || "@a";
        const jsonText = JSON.stringify({
          text: text || "",
          color: color || "white",
        });
        await sendCommand(`title ${p} actionbar ${jsonText}`);
        return NextResponse.json({ success: true });
      }
      case "title_clear": {
        const { player } = body;
        await sendCommand(`title ${player || "@a"} clear`);
        return NextResponse.json({ success: true });
      }
      case "title_reset": {
        const { player } = body;
        await sendCommand(`title ${player || "@a"} reset`);
        return NextResponse.json({ success: true });
      }

      // ── Teams ──
      case "team_list": {
        const result = await sendCommand("team list");
        const match = result.match(/Known teams \((\d+)\):\s*(.*)/i);
        if (!match) {
          return NextResponse.json({ success: true, teams: [], raw: result });
        }
        const count = parseInt(match[1]);
        const namesStr = match[2].trim();
        if (count === 0 || !namesStr) {
          return NextResponse.json({ success: true, teams: [], raw: result });
        }
        const teamNames = namesStr.split(", ").filter(Boolean);
        const teams: { name: string; color: string; players: string[] }[] = [];
        for (const name of teamNames) {
          try {
            const info = await sendCommand(`team list ${name}`);
            const playersMatch = info.match(/members?\s*\((\d+)\):\s*(.*)/i) || info.match(/members?:\s*(.*)/i);
            let players: string[] = [];
            if (playersMatch) {
              const pStr = playersMatch[2] || playersMatch[1];
              if (pStr && pStr.trim() && !pStr.match(/^\d+$/)) players = pStr.split(", ").filter(Boolean);
            }
            teams.push({ name, color: "white", players });
          } catch {
            teams.push({ name, color: "white", players: [] });
          }
        }
        return NextResponse.json({ success: true, teams, raw: result });
      }
      case "team_add": {
        const { name } = body;
        await sendCommand(`team add ${name}`);
        return NextResponse.json({ success: true, response: `Created team ${name}` });
      }
      case "team_remove": {
        const { name } = body;
        await sendCommand(`team remove ${name}`);
        return NextResponse.json({ success: true, response: `Removed team ${name}` });
      }
      case "team_color": {
        const { name, color } = body;
        await sendCommand(`team modify ${name} color ${color}`);
        return NextResponse.json({ success: true, response: `Set ${name} color to ${color}` });
      }
      case "team_displayname": {
        const { name, displayName } = body;
        const jsonText = JSON.stringify({ text: displayName });
        await sendCommand(`team modify ${name} displayName ${jsonText}`);
        return NextResponse.json({ success: true, response: `Set ${name} display name to ${displayName}` });
      }
      case "team_prefix": {
        const { name, prefix } = body;
        const jsonText = JSON.stringify({ text: prefix });
        await sendCommand(`team modify ${name} prefix ${jsonText}`);
        return NextResponse.json({ success: true, response: `Set ${name} prefix to ${prefix}` });
      }
      case "team_suffix": {
        const { name, suffix } = body;
        const jsonText = JSON.stringify({ text: suffix });
        await sendCommand(`team modify ${name} suffix ${jsonText}`);
        return NextResponse.json({ success: true, response: `Set ${name} suffix to ${suffix}` });
      }
      case "team_join": {
        const { name, player } = body;
        await sendCommand(`team join ${name} ${player}`);
        return NextResponse.json({ success: true, response: `Added ${player} to ${name}` });
      }
      case "team_leave": {
        const { player } = body;
        await sendCommand(`team leave ${player}`);
        return NextResponse.json({ success: true, response: `Removed ${player} from their team` });
      }
      case "team_empty": {
        const { name } = body;
        await sendCommand(`team empty ${name}`);
        return NextResponse.json({ success: true, response: `Emptied team ${name}` });
      }
      case "team_option": {
        const { name, option, value } = body;
        await sendCommand(`team modify ${name} ${option} ${value}`);
        return NextResponse.json({ success: true, response: `Set ${name} ${option} to ${value}` });
      }

      // ── Raw Command ──
      case "raw": {
        const { command } = body;
        const result = await sendCommand(command);
        return NextResponse.json({ success: true, response: result });
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ connected: !!rcon, chatLog });
}
