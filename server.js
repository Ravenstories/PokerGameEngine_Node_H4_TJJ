import uuid from 'uuid-random';
import NodeRSA from 'node-rsa';
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
    var player = new Player(client);
    // Create a unique ID for the client
    player.id = uuid();
    console.log(`New client connected: ${player.id}`);
    // Send the client their ID
    player.Send(JSON.stringify({ type: 'connect', id: player.id }));

    // Handle client messages
    player.client.on('message', (data) => {
        
        if(player instanceof EncryptedPlayer){
            data = player.DecryptMessage(data);
        }

        const dataJSON = JSON.parse(data);
        console.log('Message Type: ' + dataJSON.type);
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
                player = new EncryptedPlayer(player);

                let aesValues = JSON.stringify({type: 'aesValues', aesKey: player.aesKey, aesIV: player.aesIV});

                // https://www.geeksforgeeks.org/how-base64-encoding-and-decoding-is-done-in-node-js/
                //let bufferObj = Buffer.from(dataJSON.rsaPublicKey, "base64");
                //let decodedString = bufferObj.toString("utf8");  // utf8, 99% certain. Otherwise: ucs2, utf16le
                //console.log(decodedString);

                // https://www.npmjs.com/package/node-rsa
                const key = new NodeRSA(dataJSON.rsaPublicKey);
                //console.log(key);
                let rsaEncryptedMessage = player.encrypter.RSAEncrypt(aesValues, key.exportKey('pkcs8-public-der'));
                
                client.send(rsaEncryptedMessage);
                break;
            default:
                console.log("Invalid message type:\n" + dataJSON.type);
                client.send("Invalid message type:\n" + dataJSON.type);
        }
    });

    // Handle client disconnections
    client.on('close', () => {
        console.log(`Client disconnected: ${client.id}`);
        //gameManager.removeClient(client.id);
    });
});

wss.on('listening', () => { console.log("Listening on 8080") });

