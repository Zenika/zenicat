require('dotenv/config')
const { createServer } = require('http');
const express = require('express');
const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');
const io = require('socket.io');

const slackSigningSecret = process.env.SECRET;
const botUserToken = process.env.BOT_USER_TOKEN;
const channel = process.env.CHANNEL;
const port = process.env.PORT || 3000;

const slackEvents = createEventAdapter(slackSigningSecret);
const web = new WebClient(botUserToken);

const app = express();
const server = createServer(app);
const socket = io(server)

let clients = {};

app.use('/slack/events', slackEvents.expressMiddleware());

app.get('/question', async function (req, res) {
    const {text, thread_ts, username} = req.query
    console.info('message sent on', thread_ts, 'by', username)
    const result = await web.chat.postMessage({
        text,
        channel: channel,
        thread_ts,
        username
    });
    res.send({result});
});

app.get('/message', async function (req, res) {
    const result = await web.conversations.replies({
        token: process.env.TOKEN,
        channel: channel,
        ts: req.query.thread
    });
    res.send({
        messages: result.messages.map(({text, subtype}) => ({
            text,
            from: subtype ? 'me' : undefined
        }))
    });
});

slackEvents.on('message', (event) => {
    const thread = event.thread_ts
    const client = clients[thread]
    if (client && event.bot_id !== process.env.BOT_ID && event.text !== '') {
        console.info('message received for ', thread)
        client.emit('message', {text: event.text})
    }
});

socket.on('connect', (client) => {
    const { thread } = client.handshake.query
    console.info('connected : ', thread)
    clients[thread] = client
})

socket.on('disconnect', (client) => {
    const { thread } = client.handshake.query
    console.info('disconnected : ', thread)
    delete clients[thread]
})

server.listen(port, () => {
    console.info(`Listening for events on ${server.address().port}`);
});
