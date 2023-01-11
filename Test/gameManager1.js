const uuid = require('uuid-random');
const WebSocket = require('ws');
const GameManager = require('./gameManager');

// Create the GameManager
const gameManager = new GameManager();

// Initialize the WebSocket server
const wss = new WebSocket.Server({ port: 8080 }, () => {
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
        gameManager.removeClient(client.id);
    });
});

class GameManager {
    constructor() {
        this.games = {};
    }

    createGame(client, gameName) {
        // Generate a unique ID for the game
        const gameId = uuid();
        this.games[gameId] = {
            name: gameName,
            players: {
                [client.id]: { id: client.id, ready: false }
            },
            state: 'waiting'
        }
        client.send(JSON.stringify({ type: 'createGame', gameId: gameId }));
    }

    joinGame(client, gameId) {
        const game = this.games[gameId];
        if (!game) {
            client.send(JSON.stringify({ type: 'error', message: 'Invalid game ID' }));
            return;
        }
        if (game.state !== 'waiting') {
            client.send(JSON.stringify({ type: 'error', message: 'Game has already started' }));
            return;
        }
        if (Object.keys(game.players).length >= 4) {
            client.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
            return;
        }
        game.players[client.id] = { id: client.id, ready: false };
        client.send(JSON.stringify({ type: 'joinGame', gameId: gameId }));
    }

    startGame(client, gameId) {
        const game = this.games[gameId];
        if (!game) {
            client.send(JSON.stringify({ type: 'error', message: 'Invalid game ID' }));
            return;
        }
        if (game.state !== 'waiting') {
            client.send(JSON.stringify({ type: 'error', message: 'Game has already started' }));
            return;
        }
    
        // shuffle and deal cards to the players
        game.deck = this.shuffleDeck();
        for (const playerId in game.players) {
            game.players[playerId].hand = game.deck.splice(0, 2);
        }
        //Set initial blinds
        game.players[this.getSmallBlindPlayer(game)].chips -= game.smallBlind
        game.players[this.getBigBlindPlayer(game)].chips -= game.bigBlind
    
        game.pot += game.smallBlind + game.bigBlind;
        game.players[this.getSmallBlindPlayer(game)].currentBet = game.smallBlind
        game.players[this.getBigBlindPlayer(game)].currentBet = game.bigBlind
        game.state = 'playing';
        game.currentPlayer = this.getNextPlayer(this.getBigBlindPlayer(game))
        this.broadcast(gameId, JSON.stringify({ type: 'startGame', gameId: gameId, players: game.players }));
    }
    
    play(client, gameId, action, amount) {
        const game = this.games[gameId];
        if (!game) {
            client.send(JSON.stringify({ type: 'error', message: 'Invalid game ID' }));
            return;
        }
        if (game.state !== 'playing') {
            client.send(JSON.stringify({ type: 'error', message: 'The game has not started' }));
            return;
        }
        if (!game.players[client.id]) {
            client.send(JSON.stringify({ type: 'error', message: 'Invalid player' }));
            return;
        }
        if(game.currentPlayer !== client.id){
            client.send(JSON.stringify({ type: 'error', message: 'It\'s not your turn' }));
            return;
        }
    
        switch (action) {
            case 'bet':
                if (amount > game.players[client.id].chips) {
                    client.send(JSON.stringify({ type: 'error', message: 'Not enough chips' }));
                    return;
                }
                if (amount < game.currentBet) {
                    client.send(JSON.stringify({ type: 'error', message: 'You must match the current bet or raise' }));
                    return;
                }
                game.players[client.id].chips -= amount;
                game.pot += amount;
                game.players[client.id].currentBet = amount
                game.currentPlayer = this.getNextPlayer(client.id)
                break;

            case 'call':
                if (game.players[client.id].chips < game.currentBet) {
                    client.send(JSON.stringify({ type: 'error', message: 'Not enough chips to call' }));
                    return;
                }
                const chipsToCall = game.currentBet - game.players[client.id].currentBet;
                game.players[client.id].chips -= chipsToCall;
                game.pot += chipsToCall;
                game.players[client.id].currentBet = game.currentBet
                game.currentPlayer = this.getNextPlayer(client.id)
                this.broadcast(gameId, JSON.stringify({ type: 'call', playerId: client.id, amount: chipsToCall }));
                break;

            case 'raise':
                // ... (previous code)
                game.players[client.id].currentBet = amount;
                game.currentPlayer = this.getNextPlayer(client.id)
                this.broadcast(gameId, JSON.stringify({ type: 'raise', playerId: client.id, amount: amount }));
                break;
            case 'check':
                if (game.players[client.id].currentBet !== game.currentBet) {
                    client.send(JSON.stringify({ type: 'error', message: 'You must match the current bet to check' }));
                    return;
                }
                game.currentPlayer = this.getNextPlayer(client.id)
                this.broadcast(gameId, JSON.stringify({ type: 'check', playerId: client.id }));
                break;
            case 'fold':
                game.players[client.id].folded = true;
                game.currentPlayer = this.getNextPlayer(client.id)
                this.broadcast(gameId, JSON.stringify({ type: 'fold', playerId: client.id }));
                break;
            default:
                client.send(JSON.stringify({ type: 'error', message: 'Invalid action' }));
                return;
        }
    }
}
    
