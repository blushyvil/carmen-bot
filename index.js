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

let banned = []
if (fs.existsSync('banned.json')) {
  banned = JSON.parse(fs.readFileSync('banned.json'))
}
function isBanned(userId) {
  return banned.some(b => b.userId === userId)
}

let responses = {}
if (fs.existsSync('responses.json')) {
  responses = JSON.parse(fs.readFileSync('responses.json'))
}

app.post('/webhook', line.middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => console.error(err))
})

async function handleEvent(event) {
  if (event.type === 'memberJoined') {
    const members = event.joined.members
    for (const member of members) {
      if (isBanned(member.userId)) {
        await client.kickGroupMember(event.source.groupId, member.userId)
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: `someone tried to sneak in... and got removed.`}]
        })
        return
      }
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'textV2',
          text: `hi﹐ {user} welcome to ﹒h͟i͟b͟i͟g͟o͟u͟ 🏄🏻‍♀️\n\nmake yourself at home, enjoy shopping!\n▸ invite temen harus pc admin!\n▸jangan hapus album, notes, atau kick member. or, you'll get 𝗯𝗮𝗻𝗻𝗲𝗱 :3\n\nplease read this ⤸ gohibigou.carrd.co`,
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

  if (event.type === 'memberLeft') {
    const leftUserId = event.left.members[0].userId
    const sourceUserId = event.source.userId

    if (!ADMIN_IDS.includes(sourceUserId)) {
      const no = banned.length + 1
      try {
        const profile = await client.getGroupMemberProfile(event.source.groupId, sourceUserId)
        banned.push({ no, name: profile.displayName, userId: sourceUserId })
      } catch {
        banned.push({ no, name: 'unknown', userId: sourceUserId })
      }
      fs.writeFileSync('banned.json', JSON.stringify(banned))
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'someone kicked a member, and i sushed them :3!'}]
      })
      }
    }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null
  }

  const userId = event.source.userId
  const text = event.message.text.trim()

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

  if (text.startsWith('.')) {
    const command = text.slice(1)
    if (responses[command]) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: responses[command] }]
      })
    }
  }

  return null
}

app.listen(process.env.PORT || 3000, () => console.log('must say carmen is cute!'))