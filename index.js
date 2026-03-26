// LINE Bot - User Management Module
// Fitur: Kick, Ban, Admin Management

const line = require('@line/bot-sdk');

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

// Storage untuk banned users dan admin list (gunakan database di production)
const bannedUsers = new Set(); // Set userId yang di-ban
const adminUsers = new Set(); // Set userId yang jadi admin
const groupSettings = new Map(); // Map groupId -> settings

// Helper: Check if user is admin
function isAdmin(userId) {
  return adminUsers.has(userId);
}

// Helper: Check if user is banned
function isBanned(userId) {
  return bannedUsers.has(userId);
}

// Handler untuk pesan masuk
async function handleUserManagement(event) {
  const { type, message, source } = event;
  
  // Cek apakah di group/room
  if (source.type !== 'group' && source.type !== 'room') {
    return null; // User management hanya untuk group
  }

  if (type !== 'message' || message.type !== 'text') {
    return null;
  }

  const text = message.text.trim();
  const userId = source.userId;
  const groupId = source.groupId || source.roomId;

  // Command: !kick @mention atau !kick [userId]
  if (text.startsWith('!kick')) {
    if (!isAdmin(userId)) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '❌ Kamu nggak punya izin buat kick user!'
        }]
      });
    }

    // Parse target user dari mention atau text
    const targetUserId = extractUserId(text, event);
    
    if (!targetUserId) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '⚠️ Mention user yang mau di-kick!\nContoh: !kick @username'
        }]
      });
    }

    try {
      // Kick user dari group
      if (source.type === 'group') {
        await client.leaveGroup(groupId, targetUserId);
      } else {
        await client.leaveRoom(groupId, targetUserId);
      }

      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '✅ User berhasil di-kick dari group!'
        }]
      });
    } catch (error) {
      console.error('Error kicking user:', error);
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '❌ Gagal kick user. Pastikan bot punya permission!'
        }]
      });
    }
  }

  // Command: !ban @mention
  if (text.startsWith('!ban')) {
    if (!isAdmin(userId)) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '❌ Kamu nggak punya izin buat ban user!'
        }]
      });
    }

    const targetUserId = extractUserId(text, event);
    
    if (!targetUserId) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '⚠️ Mention user yang mau di-ban!\nContoh: !ban @username'
        }]
      });
    }

    // Tambahkan ke banned list
    bannedUsers.add(targetUserId);

    try {
      // Kick sekalian dari group
      if (source.type === 'group') {
        await client.leaveGroup(groupId, targetUserId);
      } else {
        await client.leaveRoom(groupId, targetUserId);
      }

      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '🔨 User berhasil di-ban dan di-kick!'
        }]
      });
    } catch (error) {
      console.error('Error banning user:', error);
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '⚠️ User di-ban tapi gagal di-kick. Kick manual ya!'
        }]
      });
    }
  }

  // Command: !unban @mention
  if (text.startsWith('!unban')) {
    if (!isAdmin(userId)) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '❌ Kamu nggak punya izin buat unban user!'
        }]
      });
    }

    const targetUserId = extractUserId(text, event);
    
    if (!targetUserId) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '⚠️ Mention user yang mau di-unban!'
        }]
      });
    }

    bannedUsers.delete(targetUserId);

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: '✅ User berhasil di-unban! Silakan invite kembali.'
      }]
    });
  }

  // Command: !addadmin @mention
  if (text.startsWith('!addadmin')) {
    if (!isAdmin(userId)) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '❌ Kamu nggak punya izin buat tambah admin!'
        }]
      });
    }

    const targetUserId = extractUserId(text, event);
    
    if (!targetUserId) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '⚠️ Mention user yang mau dijadiin admin!'
        }]
      });
    }

    adminUsers.add(targetUserId);

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: '👑 User berhasil dijadiin admin!'
      }]
    });
  }

  // Command: !removeadmin @mention
  if (text.startsWith('!removeadmin')) {
    if (!isAdmin(userId)) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '❌ Kamu nggak punya izin buat remove admin!'
        }]
      });
    }

    const targetUserId = extractUserId(text, event);
    
    if (!targetUserId) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '⚠️ Mention user yang mau di-remove dari admin!'
        }]
      });
    }

    adminUsers.delete(targetUserId);

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: '✅ User berhasil di-remove dari admin!'
      }]
    });
  }

  // Command: !adminlist
  if (text === '!adminlist') {
    const adminList = Array.from(adminUsers);
    const listText = adminList.length > 0 
      ? `👑 Admin List:\n${adminList.map((id, i) => `${i+1}. ${id}`).join('\n')}`
      : '⚠️ Belum ada admin yang terdaftar!';

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: listText
      }]
    });
  }

  // Command: !banlist
  if (text === '!banlist') {
    if (!isAdmin(userId)) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: '❌ Kamu nggak punya izin buat liat ban list!'
        }]
      });
    }

    const banList = Array.from(bannedUsers);
    const listText = banList.length > 0 
      ? `🔨 Banned Users:\n${banList.map((id, i) => `${i+1}. ${id}`).join('\n')}`
      : '✅ Nggak ada user yang di-ban!';

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: listText
      }]
    });
  }

  return null;
}

// Helper function: Extract userId dari mention atau text
function extractUserId(text, event) {
  // Cek apakah ada mention di event
  if (event.message.mention && event.message.mention.mentionees) {
    const mentioned = event.message.mention.mentionees[0];
    if (mentioned && mentioned.userId) {
      return mentioned.userId;
    }
  }

  // Fallback: parse dari text (format: !command userId)
  const parts = text.split(' ');
  if (parts.length > 1) {
    return parts[1].trim();
  }

  return null;
}

// Event handler untuk cek banned user join
async function handleMemberJoined(event) {
  const { joined } = event;
  
  if (!joined || !joined.members) return null;

  for (const member of joined.members) {
    if (isBanned(member.userId)) {
      const groupId = event.source.groupId || event.source.roomId;
      
      try {
        // Auto-kick banned user
        if (event.source.type === 'group') {
          await client.leaveGroup(groupId, member.userId);
        } else {
          await client.leaveRoom(groupId, member.userId);
        }

        // Kirim notifikasi
        await client.pushMessage({
          to: groupId,
          messages: [{
            type: 'text',
            text: '🔨 Banned user terdeteksi dan otomatis di-kick!'
          }]
        });
      } catch (error) {
        console.error('Error auto-kicking banned user:', error);
      }
    }
  }

  return null;
}

// Export functions
module.exports = {
  handleUserManagement,
  handleMemberJoined,
  isAdmin,
  isBanned,
  adminUsers, // Export untuk initial setup
  bannedUsers
};

// Contoh penggunaan di main webhook handler:
/*
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    
    await Promise.all(events.map(async (event) => {
      // Handle user management commands
      if (event.type === 'message') {
        await handleUserManagement(event);
      }
      
      // Handle member joined (auto-kick banned users)
      if (event.type === 'memberJoined') {
        await handleMemberJoined(event);
      }
      
      // Handler lainnya...
    }));
    
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// Setup admin pertama kali (run sekali aja)
adminUsers.add('YOUR_USER_ID_HERE'); // Ganti dengan userId lo
*/