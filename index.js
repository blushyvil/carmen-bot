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

  if (event.type === 'message' && event.message.type === 'text') {
    const uid = event.source.userId;
    
    // Ini yang bakal muncul di Log Railway (untuk kamu copy-paste)
    console.log(`[CHECK ID] User: ${uid} | Message: ${event.message.text}`);

    // Ini yang dibalas Carmen ke chat
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: `Your User ID: ${uid}`
      }]
    });
  }

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

  // Command: !set
  if (text.startsWith('!set ')) {
    if (!ADMIN_IDS.includes(userId)) {
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
    if (!ADMIN_IDS.includes(userId)) {
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
    if (!ADMIN_IDS.includes(userId)) {
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

  // Command: . (dot)
  if (text.startsWith('.')) {
    const command = text.slice(1)
    if (responses[command]) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: responses[command] }]
      })
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

  return null
}

app.listen(process.env.PORT || 3000, () => console.log('must say carmen is cute!'))