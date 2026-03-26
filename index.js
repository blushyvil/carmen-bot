require('dotenv').config()
const express = require('express')
const line = require('@line/bot-sdk')
const fs = require('fs')
const { ADMIN_IDS } = require('./config')

const middlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET
}

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

const app = express()

let responses = {}
if (fs.existsSync('responses.json')) {
  responses = JSON.parse(fs.readFileSync('responses.json'))
}

// Helper Functions (Taruh di atas biar rapi)
function saveAdmins(admins) {
  fs.writeFileSync('admins.json', JSON.stringify(admins, null, 2));
}

function loadAdmins() {
  if (!fs.existsSync('admins.json')) return [];
  try {
    return JSON.parse(fs.readFileSync('admins.json', 'utf8'));
  } catch (e) {
    return [];
  }
}

app.post('/webhook', line.middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => console.error(err))
})

async function handleEvent(event) {
  // 1. Handling Member Joined
  if (event.type === 'memberJoined') {
    const members = event.joined.members



    for (const member of members) {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'textV2',
          text: `{user} welcome to ﹒h͟i͟b͟i͟g͟o͟u͟ 🏄🏻‍♀️\n\nmake yourself at home, enjoy shopping!\n▸ invite temen harus pc admin!\n▸jangan hapus album, notes, atau kick member. or, you'll get 𝗯𝗮𝗻𝗻𝗲𝗱 :3\n\nplease read this ⤸ gohibigou.carrd.co`,
          substitution: {
            user: { type: 'mention', mentionee: { type: 'user', userId: member.userId } }
          }
        }]
      })
    }
    return
  }

  // 2. Filter hanya pesan teks
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null
  }

  const userId = event.source.userId
  const text = event.message.text.trim()
  const sourceType = event.source.type

  const currentAdmins = loadAdmins();
  const isAdmin = ADMIN_IDS.includes(userId) || currentAdmins.includes(userId);

  // --- COMMAND SECTION ---

  // !set
  if (text.startsWith('!set ')) {
    if (!isAdmin) return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: 'sorry! that one is a̲d̲m̲i̲n̲ only' }] });
    const parts = text.slice(5).split(' ')
    const command = parts[0]
    const response = parts.slice(1).join(' ')
    responses[command] = response
    fs.writeFileSync('responses.json', JSON.stringify(responses))
    return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: `i'm taking notes, .${command} saved!` }] })
  }

  // !delete
  if (text.startsWith('!delete ')) {
    if (!isAdmin) return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: 'sorry! that one is a̲d̲m̲i̲n̲ only' }] });
    const command = text.slice(8).trim()
    if (responses[command]) {
      delete responses[command];
      fs.writeFileSync('responses.json', JSON.stringify(responses));
      return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: `poof... .${command} gone` }] });
    }
  }

  // !comlist
  if (text === '!comlist') {
    if (!isAdmin) return null;
    const keys = Object.keys(responses);
    const list = keys.length === 0 ? 'nothing yet' : keys.map(k => `.${k}`).join('\n');
    return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: `here's my notes!\n\n${list}` }] });
  }

  // !addadmin & !unadmin
  if (text.startsWith('!addadmin') || text.startsWith('!unadmin')) {
    if (sourceType !== 'user') return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: 'psst! please use this in private chat!' }] });
    if (!isAdmin) return;

 if (text.startsWith('!addadmin ')) {
  const newId = text.slice(10).trim();
  
  if (!newId.startsWith('U')) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'hmm, that doesn\'t look like a valid User ID! :<' }]
    });
  }

  let current = loadAdmins();
  if (!current.includes(newId)) {
    try {
      // AMBIL DISPLAY NAME DARI LINE
      const profile = await client.getUserProfile(newId);
      const displayName = profile.displayName;

      current.push(newId);
      saveAdmins(current);

      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ 
          type: 'text', 
          text: `ⓘ admin "${displayName}" added successfully! ᵔ ᵕ ᵔ` 
        }]
      });
    } catch (error) {
      // Jika ID tidak ditemukan atau bot tidak bisa akses profilnya
      console.error(error);
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ 
          type: 'text', 
          text: `added ID: ${newId}, but i couldn't peek their name! :<` 
        }]
      });
    }
  } else {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'psst! they are already an admin!' }]
    });
  }
}

    if (text.startsWith('!unadmin')) {
      const targetId = text.slice(9).trim();
      let current = loadAdmins();
      saveAdmins(current.filter(id => id !== targetId));
      return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: `poof! user ${targetId} is out.`}] });
    }
  }

  // !adminlist (PASTIKAN INI DI DALAM handleEvent)
  if (text === '!adminlist') {
    let admins = loadAdmins();
    if (admins.length === 0) return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: 'no admin listed yet!' }] });

    let adminText = "here's who can h͟e͟l͟p͟ you,\n\n";
    const substitution = {};

    admins.forEach((id, index) => {
      const placeholder = `admin${index}`;
      adminText += `Ꮺ {${placeholder}}\n`;
      substitution[placeholder] = { type: 'mention', mentionee: { type: 'user', userId: id } };
    });



    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'textV2', text: adminText + "\nkindly wait! ♡", substitution: substitution }]
    });
  }

  // .getid
  if (text === '.getid') {
    if (sourceType !== 'user') return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: "psst! private chat me to get ID." }] });
    return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: `your secret id is: ${userId}` }] });
  }

  // Auto-response .command
  if (text.startsWith('.')) {
    const command = text.slice(1)
    if (responses[command]) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: responses[command] }] });
    }
  }

  return null;
} // <-- TUTUP HANDLE EVENT DI SINI

app.listen(process.env.PORT || 3000, () => console.log('must say carmen is cute!'))