const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const TIKTOK_USERNAME = 'interactive.stream';

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

let tiktokLive = new WebcastPushConnection(TIKTOK_USERNAME);

function connectTikTok() {
    tiktokLive.connect().then(state => {
        console.log(`Подключено к стриму! Room ID: ${state.roomId}`);
    }).catch(err => {
        console.error('Стрим не найден, повтор через 10 сек...', err.message);
        setTimeout(connectTikTok, 10000);
    });
}

// Слушаем подарки
tiktokLive.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) return;

    broadcast({
        type: 'gift',
        giftName: data.giftName,
        sender: data.nickname
    });
});

// Слушаем лайки
tiktokLive.on('like', data => {
    broadcast({
        type: 'like',
        likeCount: data.likeCount
    });
});

tiktokLive.on('streamEnd', () => {
    setTimeout(connectTikTok, 15000);
});

connectTikTok();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер работает на порту ${PORT}`);
});
