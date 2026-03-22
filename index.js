  require('dotenv').config()
const express = require('express')
const line = require('@line/bot-sdk')

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}

const client = new line.Client(config)
const app = express()

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => console.error(err))
})

const { ADMIN_IDS } = require('./config')
const fs = require('fs')

let responses = {}
if (fs.existsSync('responses.json')) {
  responses = JSON.parse(fs.readFileSync('responses.json'))
}

async function handleEvent(event) {
  if (event.type === 'memberJoined') {
    const members = event.joined.members
    for (const member of members) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'hii, welcome to carmen! selamat datang ya ♡'
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
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'sorry, admin only! ♡'
      })
    }
    const parts = text.slice(5).split(' ')
    const command = parts[0]
    const response = parts.slice(1).join(' ')
    responses[command] = response
    fs.writeFileSync('responses.json', JSON.stringify(responses))
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `done! command #${command} udah disimpan ♡`
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