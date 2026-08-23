const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Replace with your actual deployed Apps Script Web App URL ending in /exec
const APPS_SCRIPT_WEBAPP_URL = process.env.APPS_SCRIPT_WEBAPP_URL;

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('gb')) return;

  // Example Syntax 1 (DM):    gb dm recipient@yourdomain.com Hello from Discord!
  // Example Syntax 2 (Space): gb space AAAAxxxxxx Hello Space!
  const args = message.content.slice(2).trim().split(/ +/);
  const targetType = args.shift()?.toLowerCase(); // 'dm' or 'space'
  const target = args.shift();                    // email or space ID
  const textContent = args.join(' ');

  if (!targetType || !target || !textContent) {
    return message.reply('gb Command Usage:\n`gb dm <email> <message>`\n`gb space <spaceId> <message>`');
  }

  try {
    const response = await fetch(APPS_SCRIPT_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: targetType,
        target: target,
        content: textContent
      })
    });

    const result = await response.json();
    if (result.error) {
      message.reply(`Error: ${result.error}`);
    } else {
      message.react('✅');
    }
  } catch (err) {
    message.reply(`Failed to route message: ${err.message}`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);