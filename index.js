const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPS_SCRIPT_WEBAPP_URL = process.env.APPS_SCRIPT_WEBAPP_URL;

// Optional fallback target if no space/DM is specified
const DEFAULT_TARGET = process.env.DEFAULT_TARGET || 'spaces/6zmCrUAAAAE';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Bridge bot online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (!content.toLowerCase().startsWith('gb')) return;

  const rawArgs = content.substring(2).trim();

  if (!rawArgs) {
    return message.reply(
      '**Usage:**\n' +
      '• `gb "user@domain.com" Your message` (DM via email)\n' +
      '• `gb "spaces/AAAA..." Your message` (Specific Space ID)\n' +
      '• `gb Your message` (Sends to default space)'
    );
  }

  let targetName = '';
  let textToSend = '';

  // 1. Quoted Target Name -> gb "user@domain.com" Hello!
  if (rawArgs.startsWith('"')) {
    const closingQuoteIndex = rawArgs.indexOf('"', 1);
    if (closingQuoteIndex !== -1) {
      targetName = rawArgs.substring(1, closingQuoteIndex).trim();
      textToSend = rawArgs.substring(closingQuoteIndex + 1).trim();
    }
  }

  // 2. Direct Space ID Target -> gb spaces/AAAA12345 Hello!
  if (!targetName && rawArgs.startsWith('spaces/')) {
    const firstSpaceIndex = rawArgs.indexOf(' ');
    if (firstSpaceIndex !== -1) {
      targetName = rawArgs.substring(0, firstSpaceIndex).trim();
      textToSend = rawArgs.substring(firstSpaceIndex + 1).trim();
    }
  }

  // 3. Fallback: Entire text goes to default destination
  if (!targetName) {
    targetName = DEFAULT_TARGET;
    textToSend = rawArgs;
  }

  if (!textToSend) {
    return message.reply('Please provide a text message to send.');
  }

  try {
    // Post to Apps Script Web App handling 302 redirects explicitly
    const response = await axios.post(
      APPS_SCRIPT_WEBAPP_URL,
      {
        target: targetName,
        text: `[Discord - ${message.author.username}]: ${textToSend}`,
      },
      {
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Prevents Apps Script CORS / pre-flight issues
        },
        maxRedirects: 5,
      }
    );

    if (response.data && response.data.status === 'success') {
      await message.react('✅');
    } else {
      const errorMsg = response.data ? response.data.message : 'Unknown response from Apps Script.';
      await message.reply(`❌ **Google Chat Error:** ${errorMsg}`);
    }
  } catch (error) {
    console.error('HTTP Request Error:', error.response ? error.response.data : error.message);
    await message.reply('❌ **Connection Error:** Could not reach the Google Apps Script endpoint.');
  }
});

client.login(DISCORD_BOT_TOKEN);