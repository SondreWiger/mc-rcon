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
        try {
          const result = await sendCommand("team list");
          let teamNames: string[] = [];
          const matchKnown = result.match(/Known teams \((\d+)\):\s*(.*)/i);
          const matchThere = result.match(/There are \d+ team\(s\):\s*\[(.*?)\]/i);
          if (matchKnown && matchKnown[2].trim()) {
            teamNames = matchKnown[2].split(",").map((n: string) => n.trim()).filter(Boolean);
          } else if (matchThere && matchThere[1].trim()) {
            teamNames = matchThere[1].split(",").map((n: string) => n.trim()).filter(Boolean);
          } else {
            const matchColon = result.match(/:\s*(.+)/);
            if (matchColon && matchColon[1].trim()) {
              teamNames = matchColon[1].replace(/[\[\]]/g, "").split(",").map((n: string) => n.trim()).filter(Boolean);
            }
          }
          if (teamNames.length === 0) {
            return NextResponse.json({ success: true, teams: [], raw: result });
          }
          const strip = (s: string) => s.replace(/\u00A7[0-9a-fk-or]/gi, "").trim();
          const teams: { name: string; displayName: string; color: string; players: string[] }[] = [];
          for (const rawName of teamNames) {
            const name = rawName.trim();
            const displayName = strip(rawName);
            try {
              const info = await sendCommand(`team list ${name}`);
              const players: string[] = [];
              const memberMatch = info.match(/(\d+) members? in team/i) || info.match(/members?:\s*(.*)/i);
              if (memberMatch) {
                const afterColon = info.split(":")[1];
                if (afterColon && afterColon.trim()) {
                  players.push(...afterColon.split(",").map((p: string) => p.trim()).filter(Boolean));
                }
              }
              let color = "white";
              const colorMatch = info.match(/color:\s*(\w+)/i);
              if (colorMatch) color = colorMatch[1].toLowerCase();
              teams.push({ name, displayName, color, players });
            } catch {
              teams.push({ name, displayName, color: "white", players: [] });
            }
          }
          return NextResponse.json({ success: true, teams, raw: result });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return NextResponse.json({ success: false, error: `team list failed: ${msg}` });
        }
      }
      case "team_add": {
        const { name } = body;
        const result = await sendCommand(`team add ${name}`);
        return NextResponse.json({ success: true, response: result || `Created team ${name}` });
      }
      case "team_remove": {
        const { name } = body;
        const result = await sendCommand(`team remove ${name}`);
        return NextResponse.json({ success: true, response: result || `Removed team ${name}` });
      }
      case "team_color": {
        const { name, color } = body;
        const result = await sendCommand(`team modify ${name} color ${color}`);
        return NextResponse.json({ success: true, response: result || `Set ${name} color to ${color}` });
      }
      case "team_displayname": {
        const { name, displayName } = body;
        const result = await sendCommand(`team modify ${name} displayName {"text":"${displayName}"}`);
        return NextResponse.json({ success: true, response: result || `Set ${name} display name to ${displayName}` });
      }
      case "team_prefix": {
        const { name, prefix } = body;
        const result = await sendCommand(`team modify ${name} prefix {"text":"${prefix}"}`);
        return NextResponse.json({ success: true, response: result || `Set ${name} prefix to ${prefix}` });
      }
      case "team_suffix": {
        const { name, suffix } = body;
        const result = await sendCommand(`team modify ${name} suffix {"text":"${suffix}"}`);
        return NextResponse.json({ success: true, response: result || `Set ${name} suffix to ${suffix}` });
      }
      case "team_join": {
        const { name, player } = body;
        const result = await sendCommand(`team join ${name} ${player}`);
        return NextResponse.json({ success: true, response: result || `Added ${player} to ${name}` });
      }
      case "team_leave": {
        const { player } = body;
        const result = await sendCommand(`team leave ${player}`);
        return NextResponse.json({ success: true, response: result || `Removed ${player} from their team` });
      }
      case "team_empty": {
        const { name } = body;
        const result = await sendCommand(`team empty ${name}`);
        return NextResponse.json({ success: true, response: result || `Emptied team ${name}` });
      }
      case "team_option": {
        const { name, option, value } = body;
        const result = await sendCommand(`team modify ${name} ${option} ${value}`);
        return NextResponse.json({ success: true, response: result || `Set ${name} ${option} to ${value}` });
      }

      // ── Scoreboard ──
      case "scoreboard_objectives": {
        const result = await sendCommand("scoreboard objectives list");
        return NextResponse.json({ success: true, response: result });
      }
      case "scoreboard_add": {
        const { objective, criteria, displayName } = body;
        const cmd = displayName
          ? `scoreboard objectives add ${objective} ${criteria || "dummy"} ${displayName}`
          : `scoreboard objectives add ${objective} ${criteria || "dummy"}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result || `Created objective ${objective}` });
      }
      case "scoreboard_remove": {
        const { objective } = body;
        const result = await sendCommand(`scoreboard objectives remove ${objective}`);
        return NextResponse.json({ success: true, response: result || `Removed objective ${objective}` });
      }
      case "scoreboard_set": {
        const { target, objective, score } = body;
        const result = await sendCommand(`scoreboard players set ${target} ${objective} ${score}`);
        return NextResponse.json({ success: true, response: result || `Set ${target}'s ${objective} to ${score}` });
      }
      case "scoreboard_add_score": {
        const { target, objective, score } = body;
        const result = await sendCommand(`scoreboard players add ${target} ${objective} ${score}`);
        return NextResponse.json({ success: true, response: result || `Added ${score} to ${target}'s ${objective}` });
      }
      case "scoreboard_remove_score": {
        const { target, objective, score } = body;
        const result = await sendCommand(`scoreboard players remove ${target} ${objective} ${score}`);
        return NextResponse.json({ success: true, response: result || `Removed ${score} from ${target}'s ${objective}` });
      }
      case "scoreboard_get": {
        const { target, objective } = body;
        const cmd = objective ? `scoreboard players get ${target} ${objective}` : `scoreboard players list ${target}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result });
      }
      case "scoreboard_display": {
        const { slot, objective } = body;
        const cmd = objective ? `scoreboard objectives setdisplay ${slot} ${objective}` : `scoreboard objectives setdisplay ${slot}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result || `Set display slot ${slot}` });
      }
      case "scoreboard_reset": {
        const { target, objective } = body;
        const cmd = objective ? `scoreboard players reset ${target} ${objective}` : `scoreboard players reset ${target}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result || `Reset scores for ${target}` });
      }

      // ── Boss Bar ──
      case "bossbar_create": {
        const { id, title, color: bc, style, range, value, max } = body;
        const cmd = `bossbar add ${id} ${title || "Boss"}`;
        await sendCommand(cmd);
        if (bc) await sendCommand(`bossbar set ${id} color ${bc}`);
        if (style) await sendCommand(`bossbar set ${id} style ${style}`);
        if (range) await sendCommand(`bossbar set ${id} range ${range}`);
        if (value && max) await sendCommand(`bossbar set ${id} value ${value} max ${max}`);
        return NextResponse.json({ success: true, response: `Created bossbar ${id}` });
      }
      case "bossbar_set": {
        const { id, title, value, max, visible, color: bc, style, range, players: bp } = body;
        if (title) await sendCommand(`bossbar set ${id} name ${title}`);
        if (value && max) await sendCommand(`bossbar set ${id} value ${value} max ${max}`);
        else if (value) await sendCommand(`bossbar set ${id} value ${value}`);
        if (visible !== undefined) await sendCommand(`bossbar set ${id} visible ${visible}`);
        if (bc) await sendCommand(`bossbar set ${id} color ${bc}`);
        if (style) await sendCommand(`bossbar set ${id} style ${style}`);
        if (range) await sendCommand(`bossbar set ${id} range ${range}`);
        if (bp) await sendCommand(`bossbar set ${id} players ${bp}`);
        return NextResponse.json({ success: true, response: `Updated bossbar ${id}` });
      }
      case "bossbar_remove": {
        const { id } = body;
        const result = await sendCommand(`bossbar remove ${id}`);
        return NextResponse.json({ success: true, response: result || `Removed bossbar ${id}` });
      }
      case "bossbar_list": {
        const result = await sendCommand("bossbar list");
        return NextResponse.json({ success: true, response: result });
      }

      // ── Tag ──
      case "tag_add": {
        const { target, tag } = body;
        const result = await sendCommand(`tag ${target} add ${tag}`);
        return NextResponse.json({ success: true, response: result || `Added tag ${tag} to ${target}` });
      }
      case "tag_remove": {
        const { target, tag } = body;
        const result = await sendCommand(`tag ${target} remove ${tag}`);
        return NextResponse.json({ success: true, response: result || `Removed tag ${tag} from ${target}` });
      }
      case "tag_list": {
        const { target } = body;
        const result = await sendCommand(`tag ${target} list`);
        return NextResponse.json({ success: true, response: result });
      }

      // ── Recipe ──
      case "recipe_grant": {
        const { player, recipe } = body;
        const result = await sendCommand(`recipe give ${player} ${recipe}`);
        return NextResponse.json({ success: true, response: result || `Granted recipe to ${player}` });
      }
      case "recipe_revoke": {
        const { player, recipe } = body;
        const result = await sendCommand(`recipe take ${player} ${recipe}`);
        return NextResponse.json({ success: true, response: result || `Revoked recipe from ${player}` });
      }

      // ── Attribute ──
      case "attribute_get": {
        const { target, attribute } = body;
        const result = await sendCommand(`attribute ${target} ${attribute} get`);
        return NextResponse.json({ success: true, response: result });
      }
      case "attribute_set": {
        const { target, attribute, value, base } = body;
        const cmd = base
          ? `attribute ${target} ${attribute} base set ${value}`
          : `attribute ${target} ${attribute} base set ${value}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result || `Set ${attribute} to ${value}` });
      }
      case "attribute_modifiers": {
        const { target, attribute } = body;
        const result = await sendCommand(`attribute ${target} ${attribute} modifier list`);
        return NextResponse.json({ success: true, response: result });
      }

      // ── Spread ──
      case "spread": {
        const { players: sp, minRange, maxRange, respectTeams } = body;
        const cmd = `spreadplayers ${body.x || "~"} ${body.z || "~"} ${minRange || "10"} ${maxRange || "30"} ${respectTeams === "true" ? "true" : "false"} ${sp || "@a"}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result });
      }

      // ── Sound / Particle ──
      case "playsound": {
        const { sound, source, target: st, volume, pitch } = body;
        const cmd = `playsound ${sound} ${source || "master"} ${st || "@a"} ~ ~ ~ ${volume || "1"} ${pitch || "1"}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result });
      }
      case "particle": {
        const { particle, x, y, z, dx, dy, dz, speed, count: pc, target: pt } = body;
        const cmd = `particle ${particle} ${x || "~"} ${y || "~"} ${z || "~"} ${dx || "0"} ${dy || "0"} ${dz || "0"} ${speed || "0"} ${pc || "1"} ${pt || ""}`.trim();
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result });
      }

      // ── Schedule ──
      case "schedule": {
        const { delay, command: sc, type: stype } = body;
        const cmd = stype === "append"
          ? `schedule ${sc} ${delay} append`
          : stype === "replace"
          ? `schedule ${sc} ${delay} replace`
          : `schedule ${sc} ${delay}`;
        const result = await sendCommand(cmd);
        return NextResponse.json({ success: true, response: result || `Scheduled: ${sc} in ${delay}` });
      }
      case "schedule_clear": {
        const { command: sc } = body;
        const result = await sendCommand(sc ? `schedule clear ${sc}` : "schedule clear");
        return NextResponse.json({ success: true, response: result || "Cleared scheduled commands" });
      }
      case "schedule_list": {
        const result = await sendCommand("schedule list");
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
