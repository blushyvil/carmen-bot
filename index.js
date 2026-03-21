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

async function handleEvent(event) {
  if (event.type === 'memberJoined') {
    const members = event.joined.members
    for (const member of members) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'hii, welcome to hibigou! selamat datang ya ♡'
      })
    }
  }
}

app.listen(process.env.PORT || 3000, () => console.log('carmen-bot is running!'))