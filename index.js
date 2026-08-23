const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Reads the URL injected by Bot-Hosting.net panel variables
const APPS_SCRIPT_WEBAPP_URL = process.env.APPS_SCRIPT_WEBAPP_URL;

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  if (!APPS_SCRIPT_WEBAPP_URL) {
    console.error("WARNING: APPS_SCRIPT_WEBAPP_URL environment variable is missing!");
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('gb')) return;

  const args = message.content.slice(2).trim().split(/ +/);
  const targetType = args.shift()?.toLowerCase(); // 'dm' or 'space'
  const target = args.shift();                    // recipient email or space ID
  const textContent = args.join(' ');

  if (!targetType || !target || !textContent) {
    return message.reply('gb Command Usage:\n`gb dm <email> <message>`\n`gb space <spaceId> <message>`');
  }

  try {
    // 1. Declare 'response' cleanly inside the try block
    const response = await fetch(APPS_SCRIPT_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: targetType,
        target: target,
        content: textContent
      })
    });

    // 2. Parse JSON response
    const result = await response.json();

    // 3. Handle API errors returned from Apps Script
    if (result.error) {
      const errorDetails = typeof result.error === 'object'
        ? JSON.stringify(result.error, null, 2)
        : result.error;

      return message.reply(`Google Chat API Error:\n\`\`\`json\n${errorDetails}\n\`\`\``);
    }

    // React with success emoji if message posted
    await message.react("✅Your bot has ran into a success :) We're collecting some success data and will restart the bot in a few seconds.");

  } catch (err) {
    console.error('Fetch error:', err);
    message.reply(`Failed to route message: ${err.message}`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);