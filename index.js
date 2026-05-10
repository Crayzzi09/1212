const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const config = require('./config.json');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildEmojisAndStickers
    ] 
});

client.commands = new Collection();
const commands = [];

const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
            } else {
                console.log(`[UYARI] ${filePath} komutunda 'data' veya 'execute' özelliği eksik.`);
            }
        }
    }
}

loadCommands(commandsPath);

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

const rest = new REST({ version: '10', timeout: 60000 }).setToken(config.token);

(async () => {
    try {
        console.log(`Bota ${commands.length} slash komutu yükleniyor... (Bu işlem biraz zaman alabilir, lütfen bekleyin)`);
        
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log(`✅ ${commands.length} Komut başarıyla Discord'a kaydedildi.`);
    } catch (error) {
        console.error('❌ Komutlar yüklenirken bir hata oluştu:');
        console.error(error);
        console.log('\nİPUCU: Bağlantı hatası alıyorsan VPN kullanmayı veya DNS ayarlarını kontrol etmeyi deneyebilirsin.');
    }
})();


client.login(config.token);
