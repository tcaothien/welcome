const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

// Mô hình lưu trữ dữ liệu
const schema = new mongoose.Schema({
  guildId: String,
  welcomeChannel: String,
  welcomeMessage: String,
  replies: [{ trigger: String, response: String }],
  autoWelcome: { type: Boolean, default: true }
});
const Guild = mongoose.model('Guild', schema);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', async member => {
  const guildData = await Guild.findOne({ guildId: member.guild.id });
  if (!guildData || !guildData.autoWelcome) return;

  const channel = member.guild.channels.cache.get(guildData.welcomeChannel);
  if (channel) {
    channel.send(guildData.welcomeMessage.replace('{user}', `<@${member.id}>`));
  }
});

client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const guildData = await Guild.findOne({ guildId: message.guild.id });

  // Quản lý lệnh
  if (message.content.startsWith('eonwlc')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply('Bạn không có quyền sử dụng lệnh này!');
    if (!guildData) await Guild.create({ guildId: message.guild.id, welcomeChannel: '1287289344003936266', welcomeMessage: 'Chào mừng {user} đến với server!' });
    else guildData.autoWelcome = true, await guildData.save();
    message.reply('Tính năng chào mừng đã được bật.');
  }

  if (message.content.startsWith('eoffwlc')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply('Bạn không có quyền sử dụng lệnh này!');
    if (guildData) guildData.autoWelcome = false, await guildData.save();
    message.reply('Tính năng chào mừng đã được tắt.');
  }

  if (message.content.startsWith('esetwlc')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply('Bạn không có quyền sử dụng lệnh này!');
    const newMessage = message.content.split(' ').slice(1).join(' ');
    if (!newMessage) return message.reply('Vui lòng nhập câu chào mới.');
    if (!guildData) await Guild.create({ guildId: message.guild.id, welcomeMessage: newMessage });
    else guildData.welcomeMessage = newMessage, await guildData.save();
    message.reply('Câu chào mới đã được cập nhật.');
  }

  // Quản lý phản hồi
  if (message.content.startsWith('eaaddreply')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply('Bạn không có quyền sử dụng lệnh này!');
    const [trigger, ...response] = message.content.split(' ').slice(1);
    if (!trigger || !response.length) return message.reply('Cú pháp: eaaddreply <từ_khóa> <phản_hồi>');
    if (!guildData) await Guild.create({ guildId: message.guild.id, replies: [{ trigger, response: response.join(' ') }] });
    else guildData.replies.push({ trigger, response: response.join(' ') }), await guildData.save();
    message.reply('Phản hồi mới đã được thêm.');
  }

  if (message.content.startsWith('edelreply')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply('Bạn không có quyền sử dụng lệnh này!');
    const trigger = message.content.split(' ')[1];
    if (!trigger) return message.reply('Cú pháp: edelreply <từ_khóa>');
    if (!guildData) return message.reply('Không tìm thấy từ khóa để xóa.');
    guildData.replies = guildData.replies.filter(r => r.trigger !== trigger);
    await guildData.save();
    message.reply('Phản hồi đã được xóa.');
  }

  if (message.content.startsWith('elistreply')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply('Bạn không có quyền sử dụng lệnh này!');
    if (!guildData || !guildData.replies.length) return message.reply('Chưa có phản hồi nào được thiết lập.');
    message.reply(guildData.replies.map(r => `Từ khóa: ${r.trigger}, Phản hồi: ${r.response}`).join('\n'));
  }

  // Tự động phản hồi
  if (guildData) {
    const reply = guildData.replies.find(r => message.content.includes(r.trigger));
    if (reply) message.reply(reply.response);
  }
});

client.login(process.env.DISCORD_TOKEN);
