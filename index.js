const { Client, Intents, Permissions } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Kết nối MongoDB thành công!'))
  .catch(err => console.log(err));

// Mô hình lưu cấu hình chào mừng và phản hồi
const ConfigSchema = new mongoose.Schema({
  guildId: String,
  welcomeChannelId: String,
  welcomeMessage: String,
  autoReplies: [{ trigger: String, response: String }],
});
const Config = mongoose.model('Config', ConfigSchema);

// Khởi tạo bot
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS] });

client.once('ready', () => {
  console.log(`Bot đã hoạt động: ${client.user.tag}`);
});

// Khi người mới vào server
client.on('guildMemberAdd', async member => {
  const config = await Config.findOne({ guildId: member.guild.id });
  if (config && config.welcomeChannelId && config.welcomeMessage) {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (channel) channel.send(config.welcomeMessage.replace('{user}', member));
  }
});

// Lệnh quản lý bot
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const isAdmin = message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
  if (!isAdmin) return;

  const args = message.content.split(' ').slice(1);
  const config = await Config.findOne({ guildId: message.guild.id }) || new Config({ guildId: message.guild.id });

  switch (message.content.split(' ')[0]) {
    case 'eonwlc':
      config.welcomeChannelId = '1287289344003936266';
      await config.save();
      message.channel.send('Đã bật chào mừng!');
      break;

    case 'eoffwlc':
      config.welcomeChannelId = null;
      await config.save();
      message.channel.send('Đã tắt chào mừng!');
      break;

    case 'esetwlc':
      const welcomeMessage = args.join(' ');
      if (!welcomeMessage) return message.channel.send('Vui lòng nhập nội dung chào!');
      config.welcomeMessage = welcomeMessage;
      await config.save();
      message.channel.send('Đã cập nhật câu chào mới!');
      break;

    case 'eaaddreply':
      const trigger = args[0];
      const response = args.slice(1).join(' ');
      if (!trigger || !response) return message.channel.send('Vui lòng nhập trigger và phản hồi!');
      config.autoReplies.push({ trigger, response });
      await config.save();
      message.channel.send('Đã thêm phản hồi mới!');
      break;

    case 'edelreply':
      const delTrigger = args[0];
      if (!delTrigger) return message.channel.send('Vui lòng nhập trigger để xóa!');
      config.autoReplies = config.autoReplies.filter(r => r.trigger !== delTrigger);
      await config.save();
      message.channel.send('Đã xóa phản hồi!');
      break;

    case 'elistreply':
      if (config.autoReplies.length === 0) return message.channel.send('Không có phản hồi nào!');
      const list = config.autoReplies.map(r => `Trigger: **${r.trigger}** → Response: **${r.response}**`).join('\n');
      message.channel.send(`Danh sách phản hồi:\n${list}`);
      break;

    default:
      const reply = config.autoReplies.find(r => message.content.includes(r.trigger));
      if (reply) message.channel.send(reply.response);
      break;
  }
});

// Đăng nhập bot
client.login(process.env.DISCORD_TOKEN);
