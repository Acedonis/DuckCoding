const { spawn } = require("child_process");
const path = require("path");

const processes = {};

// Inicia um bot
function startBot(userId, botId, filePath, lang) {
  if(!filePath) throw new Error(`filePath inválido para botId: ${botId}`);
  const key = `${userId}_${botId}`;
  if (processes[key]) stopBot(userId, botId);

  let cmd, args;
  switch (lang) {
    case "python":
      cmd = "python3";
      args = [filePath];
      break;
    case "java":
      cmd = "bash";
      args = ["-c", `javac ${filePath} && java -cp ${path.dirname(filePath)} Main`];
      break;
    case "node":
    default:
      cmd = "node";
      args = [filePath];
      break;
  }

  const proc = spawn(cmd, args, { cwd: path.dirname(filePath), stdio: ["pipe","pipe","pipe"] });
  processes[key] = proc;

  proc.stdout.on("data", data => {
    if(global.io) global.io.to(userId).emit("bot-output",{botId, msg:data.toString()});
  });
  proc.stderr.on("data", data => {
    if(global.io) global.io.to(userId).emit("bot-output",{botId, msg:data.toString()});
  });
  proc.on("exit", () => { 
    if(global.io) global.io.to(userId).emit("bot-status",{botId,status:"offline"});
    delete processes[key]; 
  });

  return proc;
}

// Para um bot
function stopBot(userId, botId) {
  const key = `${userId}_${botId}`;
  if(processes[key]) { 
    processes[key].kill(); 
    delete processes[key]; 
    return true; 
  }
  return false;
}

// Envia input para o bot
function sendInput(userId, botId, input) {
  const key = `${userId}_${botId}`;
  const proc = processes[key];
  if(!proc) return false;
  try { proc.stdin.write(input+"\n"); return true; } catch { return false; }
}

// Verifica se o bot está em execução
function isRunning(userId, botId) {
  return !!processes[`${userId}_${botId}`];
}

module.exports = { startBot, stopBot, sendInput, isRunning };