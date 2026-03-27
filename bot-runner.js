const { spawn } = require("child_process");
const path = require("path");

const processes = {};

function startBot(userId, botId, filePath, lang) {
  const key = `${userId}_${botId}`;
  if (processes[key]) stopBot(userId, botId);

  let cmd, args;
  if (lang === "python") {
    cmd = "python3";
    args = [filePath];
  } else if (lang === "java") {
    cmd = "java";
    args = [filePath];
  } else {
    cmd = "node";
    args = [filePath];
  }

  const proc = spawn(cmd, args, { cwd: path.dirname(filePath) });
  processes[key] = proc;
  return proc;
}

function stopBot(userId, botId) {
  const key = `${userId}_${botId}`;
  if (processes[key]) {
    processes[key].kill();
    delete processes[key];
    return true;
  }
  return false;
}

function isRunning(userId, botId) {
  return !!processes[`${userId}_${botId}`];
}

module.exports = { startBot, stopBot, isRunning };
