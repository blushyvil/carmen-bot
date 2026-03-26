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

// Settings untuk anti-invite
let antiInviteEnabled = true // Set true untuk aktifkan auto-kick inviter

app.post('/webhook', line.middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => console.error(err))
})

async function handleEvent(event) {

  if (event.type === 'memberJoined') {
    const members = event.joined.members
    const groupId = event.source.groupId

    const inviterId = event.source.userId

    for (const member of members) {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'textV2',
          text: `{user} welcome to ﹒h͟i͟b͟i͟g͟o͟u͟ 🏄🏻‍♀️\n\nmake yourself at home, enjoy shopping!\n▸ invite temen harus pc admin!\n▸jangan hapus album, notes, atau kick member. or, you'll get 𝗯𝗮𝗻𝗻𝗲𝗱 :3\n\nplease read this ⤸ gohibigou.carrd.co`,
          substitution: {
            user: {
              type: 'mention',
              mentionee: {
                type: 'user',
                userId: member.userId
              }
            }
          }
        }]
      })
    }
    return
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null
  }

  const userId = event.source.userId
  const text = event.message.text.trim()

  const currentAdmins = loadAdmins();
  const isAdmin = ADMIN_IDS.includes(userId) || currentAdmins.includes(userId);

  // Command: !set
  if (text.startsWith('!set ')) {
    if (!isAdmin) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'sorry! that one is a̲d̲m̲i̲n̲ only' }]
      })
    }
    const parts = text.slice(5).split(' ')
    const command = parts[0]
    const response = parts.slice(1).join(' ')
    responses[command] = response
    fs.writeFileSync('responses.json', JSON.stringify(responses))
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `i'm taking notes, .${command} saved!` }]
    })
  }

  // Command: !delete
  if (text.startsWith('!delete ')) {
    if (!isAdmin) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'sorry! that one is a̲d̲m̲i̲n̲ only' }]
      })
    }
    const command = text.slice(8).trim()
    if (responses[command]) {
      delete responses[command]
      fs.writeFileSync('responses.json', JSON.stringify(responses))
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: `poof... .${command} gone` }]
      })
    } else {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: `hmm, .${command} not found! :<` }]
      })
    }
  }

  // Command: !comlist
  if (text === '!comlist') {
    if (!isAdmin) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'sorry! that one is a̲d̲m̲i̲n̲ only' }]
      })
    }
    const keys = Object.keys(responses)
    if (keys.length === 0) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'hmm, nothing is here yet. (๑•᎑•๑)' }]
      })
    }
    const list = keys.map(k => `.${k}`).join('\n')
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `here's my notes!\n\n${list}\n\n𓏵` }]
    })
  }

  if (text.startsWith('!addadmin') || text.startsWith('!unadmin')) {
    if (sourceType !== 'user')
      return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'psst! for privacy, please use this command in private chat!'}]
  });
}

if (!isAdmin) return;

if (text.startsWith('!addadmin')) {
  const newId = text.slice(10).trim();
  if (newId.startsWith('U')) {
    let current = loadAdmins();
    if (!current.includes(newId)) {
      current.push(newId);
      saveAdmins(current);
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'ⓘ admin {user} added successfully!'}],
        substitution: { user: { type: 'mention', mentionee: {type: 'user', userId: newId}}}
      })
    }
  }
}

if (text.startsWith('!unadmin')) {
  const targetId = text.slice(9).trim();
  let current = loadAdmins();
  const filtered = current.filter(id => id !== targetId);
  saveAdmins(filtered);
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: 'poof! user ${targetid} is no longer an admin.'}]
  })
}

  // Command: . (dot)
  if (text.startsWith('.')) {
    const command = text.slice(1)
    if (responses[command]) {
      if (!isAdmin) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: responses[command] }]
      })
    }
  }
  }

  if (text === '!adminlist') {
    let admins = [];
    if (fs.existsSync('admins.json')) {
      admins = JSON.parse(fs.readFileSync('admins.json'));
    }

    if (admins.length === 0) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'no admin listed yet! (◞‸ ◟)💧' }] // Suda diperbaiki ke 'messages'
      });
    }

    let adminText = "here's who can h͟e͟l͟p͟ you,\n\n";
    const substitution = {};

    admins.forEach((id, index) => {
      const placeholder = `admin${index}`;
      adminText += `Ꮺ {${placeholder}}\n`;

      substitution[placeholder] = {
        type: 'mention',
        mentionee: {
          type: 'user',
          userId: id
        }
      };
    });

    adminText += "\n࣭ ⭑ kindly wait for their responses! ♡"

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'textV2',
        text: adminText,
        substitution: substitution
      }]
    })
  }

  // Command: .getid (Hanya bisa di Private Chat)
  if (text === '.getid') {
    const sourceType = event.source.type; // Cek 'user', 'group', atau 'room'

    if (sourceType !== 'user') {
      // Jika diketik di grup, Carmen kasih tahu buat PC aja
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ 
          type: 'text', 
          text: "psst! for security, please chat me p̲r̲i̲v̲a̲t̲e̲l̲y̲ to get your ID. ♡" 
        }]
      });
    }

    // Jika di Private Chat (user), tampilkan ID-nya
    console.log(`[PRIVATE ID CHECK] Admin Candidate: ${event.source.userId}`);
    
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ 
        type: 'text', 
        text: `your secret id is: ${event.source.userId}\n\nplease send this to the owner! 𓏵` 
      }]
    });
  }

  return null
}

function saveAdmins(admins) {
  fs.writeFileSync('admins.json', JSON.stringify(admins, null, 2));
}

function loadAdmins() {
  if (!fs.existsSync('admins.json')) return [];
  return JSON.parse(fs.readFileSync('admins.json', 'utf8'));
}

app.listen(process.env.PORT || 3000, () => console.log('must say carmen is cute!'))