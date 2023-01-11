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
            state: 'waiting',
            smallBlind:5,
            bigBlind:10,
            pot:0,
            currentBet:0,
            dealer:0
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
        // Using Object.assign to copy player objects when joining a game
        game.players[client.id] = Object.assign({}, { id: client.id, ready: false });
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

        if(isNaN(amount) || amount <= 0){
            client.send(JSON.stringify({ type: 'error', message: 'Invalid amount' }));
            return;
        }
        
        // update the player's chips and handle the action
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
                game.currentBet = amount;
                game.currentPlayer = this.getNextPlayer(client.id);
                this.broadcast(gameId, JSON.stringify({ type: 'bet', playerId: client.id, amount: amount }));
                break;
            case 'call':
                if (amount > game.players[client.id].chips) {
                    client.send(JSON.stringify({ type: 'error', message: 'Not enough chips' }));
                    return;
                }
                if (amount < game.currentBet) {
                    client.send(JSON.stringify({ type: 'error', message: 'You must match the current bet' }));
                    return;
                }
                game.players[client.id].chips -= amount;
                game.pot += amount;
                game.players[client.id].currentBet = game.currentBet;
                game.currentPlayer = this.getNextPlayer(client.id);
                this.broadcast(gameId, JSON.stringify({ type: 'call', playerId: client.id, amount: amount }));
                break;
            case 'fold':
                game.players[client.id].folded = true;
                game.currentPlayer = this.getNextPlayer(client.id);
                this.broadcast(gameId, JSON.stringify({ type: 'fold', playerId: client.id }));
                break;
            case 'check':
                game.currentPlayer = this.getNextPlayer(client.id);
                this.broadcast(gameId, JSON.stringify({ type: 'check', playerId: client.id }));
                break;
            default:
                client.send(JSON.stringify({ type: 'error', message: 'Invalid action' }));
                return;
        }
    }
}