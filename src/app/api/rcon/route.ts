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
