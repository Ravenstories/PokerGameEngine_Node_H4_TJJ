import uuid from 'uuid-random';
import { WebSocketServer } from 'ws';
import GameManager from './gameManager.js';
import Encryption from './encryption.js';
import { EncryptedPlayer, Player } from './models/player.js';

// Create the GameManager
const gameManager = new GameManager();

// Initialize the WebSocket server
const wss = new WebSocketServer({ port: 8080 }, () => {
    console.log('Server started on port 8080');
});

// Handle new client connections
wss.on('connection', (client) => {
    player = Player(client)
    // Create a unique ID for the client
    player.client.id = uuid();
    console.log(`New client connected: ${player.client.id}`);
    // Send the client their ID
    player.client.send(JSON.stringify({ type: 'connect', id: player.client.id }));

    // Handle client messages
    player.client.on('message', (data) => {
        if(player instanceof EncryptedPlayer){
            data = player.DecryptMessage(data);
        }

        const dataJSON = JSON.parse(data);
        switch (dataJSON.type) {
            case 'createGame':
                gameManager.createGame(player.client, dataJSON.gameName);
                break;
            case 'getGames':
                gameManager.getGames(player.client);
            case 'joinGame':
                gameManager.joinGame(player.client, dataJSON.gameId);
                break;
            case 'startGame':
                gameManager.startGame(player.client, dataJSON.gameId);
                break;
            case 'play':
                gameManager.play(player.client, dataJSON.gameId, dataJSON.card);
                break;
            case 'encrypt':
                player = EncryptedPlayer(player);

                aesValues = JSON.parse('{"type":"aesValues", "aesKey":"' + player.aesKey + '", "aesIV":"' + player.aesIV + '"}')
                
                player.encrypter.RSAEncrypt(aesValues, dataJSON.publicKey);
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

