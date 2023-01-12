import uuid from 'uuid-random';
import { WebSocketServer } from 'ws';
import GameManager from './gameManager.js';

// Create the GameManager
const gameManager = new GameManager();

// Initialize the WebSocket server
const wss = new WebSocketServer({ port: 8080 }, () => {
    console.log('Server started on port 8080');
});

// Handle new client connections
wss.on('connection', (client) => {
    // Create a unique ID for the client
    client.id = uuid();
    console.log(`New client connected: ${client.id}`);
    // Send the client their ID
    client.send(JSON.stringify({ type: 'connect', id: client.id }));

    // Handle client messages
    client.on('message', (data) => {
        const dataJSON = JSON.parse(data);
        switch (dataJSON.type) {
            case 'createGame':
                gameManager.createGame(client, dataJSON.gameName);
                break;
            case 'joinGame':
                gameManager.joinGame(client, dataJSON.gameId);
                break;
            case 'startGame':
                gameManager.startGame(client, dataJSON.gameId);
                break;
            case 'play':
                gameManager.play(client, dataJSON.gameId, dataJSON.card);
                break;
            default:
                console.log("Invalid message type: ", dataJSON.type);
        }
    });

    // Handle client disconnections
    client.on('close', () => {
        console.log(`Client disconnected: ${client.id}`);
        //gameManager.removeClient(client.id);
    });
});

wss.on('listening', () => { console.log("Listening on 8080") });

