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
    player = Player(client);
    // Create a unique ID for the client
    player.id = uuid();
    console.log(`New client connected: ${player.id}`);
    // Send the client their ID
    player.send(JSON.stringify({ type: 'connect', id: player.id }));

    // Handle client messages
    player.on('message', (data) => {
        if(player instanceof EncryptedPlayer){
            data = player.DecryptMessage(data);
        }

        const dataJSON = JSON.parse(data);
        switch (dataJSON.type) {
            case 'createGame':
                gameManager.createGame(player, dataJSON.gameName);
                break;
            case 'getGames':
                gameManager.getGames(player);
            case 'joinGame':
                gameManager.joinGame(player, dataJSON.gameId);
                break;
            case 'startGame':
                gameManager.startGame(player, dataJSON.gameId);
                break;
            case 'play':
                gameManager.play(player, dataJSON.gameId, dataJSON.card);
                break;
            case 'encrypt':
                player = EncryptedPlayer(player);

                aesValues = JSON.parse('{"type":"aesValues", "aesKey":"' + player.aesKey + '", "aesIV":"' + player.aesIV + '"}')
                
                rsaEncryptedMessage = player.encrypter.RSAEncrypt(aesValues, dataJSON.publicKey);
                // The last, holy true client, at least as far as EncryptedPlayers are concerned
                client.send(rsaEncryptedMessage);
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

