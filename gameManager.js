import Deck from './models/deck.js';
import uuid from 'uuid-random';

const deck = new Deck();
const cards = deck.cards;

export default class GameManager {
    constructor() {
        this.games = {};
    }


    createGame(client, gameName) {
        // Generate a unique ID for the game
        console.log("Creating game. Client: ", client.id, " Game name: ", gameName);

        const gameId = uuid();
        this.games[gameId] = {
            name: gameName,
            players: {
                [client.id]: {id: client.id, clientName: client.name, ready: false, hand: [], bananaChips: 100 }
            },
            state: 'waiting',
            smallBlind:5,
            bigBlind:10,
            pot:0,
            currentBet:0,
            dealer:0,
            deck : cards // This is the deck of cards, that we will with cards from deck.js 
        }

        console.log("Game created: ", this.games[gameId]);
        client.send(JSON.stringify({ type: 'createGame', gameId: gameId }));
    }

    // Join a game by ID and send the game state to the client
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
        if (Object.keys(game.players).length >= 9) { // 9 players max per game (change this to 2 for testing) 
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
        //game.deck = this.shuffleDeck();
        //console.log("Shuffled deck: ", game.deck);

        for (const client in game.players) {
            game.players[client].hand = game.deck.splice(0, 2); // Be mindfull here, hand might go on broadcast
            console.log("Player: ", game.players[client] )
        }

        //Set initial blinds
        game.players[this.getSmallBlindPlayer(game)].bananaChips -= game.smallBlind
        game.players[this.getBigBlindPlayer(game)].bananaChips -= game.bigBlind
    
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
                if (amount > game.players[client.id].bananaChips) {
                    client.send(JSON.stringify({ type: 'error', message: 'Not enough bananas' }));
                    return;
                }
                if (amount < game.currentBet) {
                    client.send(JSON.stringify({ type: 'error', message: 'You must match the current bet or raise' }));
                    return;
                }
                game.players[client.id].bananaChips -= amount;
                game.pot += amount;
                game.currentBet = amount;
                game.currentPlayer = this.getNextPlayer(client.id);
                this.broadcast(gameId, JSON.stringify({ type: 'bet', playerId: client.id, amount: amount }));
                break;
            case 'call':
                if (amount > game.players[client.id].bananaChips) {
                    client.send(JSON.stringify({ type: 'error', message: 'Not enough bananas' }));
                    // all in function?
                    return;
                }
                if (amount < game.currentBet) {
                    client.send(JSON.stringify({ type: 'error', message: 'You must match the current bet' }));
                    return;
                }
                game.players[client.id].bananaChips -= amount;
                game.pot += amount;
                game.players[client.id].currentBet = game.currentBet;
                game.currentPlayer = this.getNextPlayer(client.id);
                this.broadcast(gameId, JSON.stringify({ type: 'call', playerId: client.id, amount: amount }));
                break;
            case 'fold':
                game.players[client.id].folded = true; // Place in player properties 
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

    shuffleDeck(deck) { // Fisher-Yates shuffle
        for (let i = 51; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }
    
    getNextPlayer(playerId){ 
        //check if player is folded
        const game = this.games[this.players[playerId].gameId];
        const playerIds = Object.keys(game.players);
        const playerIndex = playerIds.indexOf(playerId);
        if(playerIndex === playerIds.length - 1){
            return playerIds[0];
        }
        return playerIds[playerIndex + 1];
    }

    getSmallBlindPlayer(game){ 
        const playerIds = Object.keys(game.players);
        return playerIds[0];
    }

    getBigBlindPlayer(game){ 
        const playerIds = Object.keys(game.players);
        return playerIds[1];
    }

    broadcast(gameId, message) {
        const game = this.games[gameId];
        for (const playerId in game.players) {
            game.players[playerId].client.send(message);
        }
    }
}