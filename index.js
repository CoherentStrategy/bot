const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Environment variables (loads from Render or your local environment)
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPS_SCRIPT_WEBAPP_URL = process.env.APPS_SCRIPT_WEBAPP_URL;

// Optional fallback target if no space/DM is specified in the message
const DEFAULT_TARGET = 'spaces/6zmCrUAAAAE';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required to read "gb" commands
  ],
});

client.once('ready', () => {
  console.log(`Bridge bot online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Prevent loops by ignoring other bots
  if (message.author.bot) return;

  const content = message.content.trim();

  // Filter for commands starting with "gb"
  if (!content.toLowerCase().startsWith('gb')) return;

  const rawArgs = content.substring(2).trim();

  // Help command fallback
  if (!rawArgs) {
    return message.reply(
      '**Usage:**\n' +
      '• `gb "Space Name" Your message` (multi-word space name)\n' +
      '• `gb SpaceName Your message` (single-word space or DM name)\n' +
      '• `gb Your message` (sends to default destination)'
    );
  }

  let targetName = '';
  let textToSend = '';

  // 1. Quoted Target Name -> gb "Marketing Team" Hello!
  if (rawArgs.startsWith('"')) {
    const closingQuoteIndex = rawArgs.indexOf('"', 1);
    if (closingQuoteIndex !== -1) {
      targetName = rawArgs.substring(1, closingQuoteIndex).trim();
      textToSend = rawArgs.substring(closingQuoteIndex + 1).trim();
    }
  }

  // 2. Single-Word Target Name or Raw ID -> gb General Hello!
  if (!targetName) {
    const parts = rawArgs.split(/\s+/);
    const possibleTarget = parts[0];

    if (possibleTarget.startsWith('spaces/') || parts.length > 1) {
      targetName = possibleTarget;
      textToSend = parts.slice(1).join(' ');
    } else {
      // 3. Fallback: Entire text goes to default space/DM
      targetName = DEFAULT_TARGET;
      textToSend = rawArgs;
    }
  }

  if (!textToSend) {
    return message.reply('Please provide a message text to send.');
  }

  // Forward request to Google Apps Script Web App
  try {
    const response = await axios.post(APPS_SCRIPT_WEBAPP_URL, {
      target: targetName,
      text: `[Discord - ${message.author.username}]: ${textToSend}`
    });

    if (response.data.status === 'success') {
      await message.react('✅');
    } else {
      await message.reply(`❌ **Google Chat Error:** ${response.data.message || 'Failed to send message.'}`);
    }
  } catch (error) {
    console.error('HTTP Request Error:', error.message);
    await message.reply('❌ **Connection Error:** Could not reach the Google Apps Script endpoint.');
  }
});

client.login(DISCORD_BOT_TOKEN);
