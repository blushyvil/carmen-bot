require('dotenv').config()
const express = require('express')
const line = require('@line/bot-sdk')
const fs = require('fs')
const { ADMIN_IDS } = require('./config')

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}

const client = new line.Client(config)
const app = express()

let responses = {}
if (fs.existsSync('responses.json')) {
  responses = JSON.parse(fs.readFileSync('responses.json'))
}

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => console.error(err))
})

async function handleEvent(event) {
const axios = require('axios')

if (event.type === 'memberJoined') {
    const members = event.joined.members
    for (const member of members) {
      try {
        const profile = await client.getGroupMemberProfile(event.source.groupId, member.userId)
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `test: ${profile.displayName}`
        })
      } catch (err) {
        console.error('profile error:', err)
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'gagal ambil nama'
        })
      }
    }
    return
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null
  }

  const userId = event.source.userId
  const text = event.message.text.trim()

  if (event.type === 'message') {
    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'your id: ' + event.source.userId
    })
}

  if (text.startsWith('!set ')) {
    if (!ADMIN_IDS.includes(userId)) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'sorry! that one is a͟d͟m͟i͟n͟ only'
      })
    }
    const parts = text.slice(5).split(' ')
    const command = parts[0]
    const response = parts.slice(1).join(' ')
    responses[command] = response
    fs.writeFileSync('responses.json', JSON.stringify(responses))
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `got it! #${command} saved`
    })
  }

  if (text.startsWith('!delete ')) {
    if (!ADMIN_IDS.includes(userId)) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'sorry! that one is a͟d͟m͟i͟n͟ only'
      })
    }
    const command = text.slice(8).trim()
    if (responses[command]) {
      delete responses[command]
      fs.writeFileSync('responses.json', JSON.stringify(responses))
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `poof... #${command} gone`
      })
    } else {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `hmm, #${command} not found! :<`
      })
    }
  }

  if (text === '!comlist') {
    if (!ADMIN_IDS.includes(userId)) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'sorry! that one is a͟d͟m͟i͟n͟ only'
      })
    }
    const keys = Object.keys(responses)
    if (keys.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'hm, nothing is here yet... (๑•᎑•๑)'
      })
    }
    const list = keys.map(k => `#${k}`).join('\n')
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `noted by carmen ۫ ׅ\n\n${list}\n\n𓏵`
    })
  }

  if (text.startsWith('#')) {
    const command = text.slice(1)
    if (responses[command]) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: responses[command]
      })
    }
  }

  return null
}

app.listen(process.env.PORT || 3000, () => console.log('carmen-bot is running!'))