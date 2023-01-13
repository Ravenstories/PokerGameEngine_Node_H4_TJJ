import Deck from './models/deck.js';
import {shuffle} from './models/deck.js';
import uuid from 'uuid-random';

const deck = new Deck();

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
                [client.id]: {
                    client: client,
                    id: client.id, 
                    clientName: client.name, 
                    ready: false, 
                    hand: [], 
                    bananaChips: 100, 
                    isFolded: false, 
                    isAllIn: false,
                    currentBet: 0
                }
            },
            state: 'waiting',
            smallBlind:5,
            bigBlind:10,
            bigBlindPlayer:0,
            smallBlindPlayer:1,
            pot:0,
            currentBet:0,
            dealer:0,
            deck : deck // This is the deck of cards, that we will with cards from deck.js 
        }

console.log("Game created: ", " Game ID: ", gameId, " Game: ", this.games[gameId]);
        client.send(JSON.stringify({ type: 'createGame', gameId: gameId }));
    }

    getGames(client) {
        const gameIds = Object.keys(this.games);
        client.send(JSON.stringify({ type: 'gamesList', gameIds: gameIds }));
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

        game.players[client.id] = Object.assign({}, { id: client.id, clientName: client.name, ready: false, hand: [], bananaChips: 100, isFolded: false, isAllIn: false, currentBet: 0});

        this.broadcast(gameId, JSON.stringify({ type: 'joinGame', gameId: gameId, players: game.players }));
        client.send(JSON.stringify({ type: 'joinGame', gameId: gameId }));
    }
    
    startGame(client, gameId) {
        const game = this.games[gameId];
console.log("Starting game!");
        if (!game) {
console.log("Game not found! / Invalid game ID");
            client.send(JSON.stringify({ type: 'error', message: 'Invalid game ID' }));
            return;
        }
        if (game.state !== 'waiting') {
console.log("Game has already started");
            client.send(JSON.stringify({ type: 'error', message: 'Game has already started' }));
            return;
        }
    
        // shuffle and deal cards to the players
console.log("Shuffle deck GM");
        game.deck = shuffle(game.deck.cards);

        for (const client in game.players) {
console.log("Dealing cards to players");
            game.players[client].hand = game.deck.splice(0, 2); // Be mindfull here, hand might go on broadcast
console.log("Player Hand: ", game.players[client].hand)
        }

        //Set initial blinds
        game.players[this.getSmallBlindPlayer(game)].bananaChips -= game.smallBlind
        game.players[this.getBigBlindPlayer(game)].bananaChips -= game.bigBlind
    
        game.pot += game.smallBlind + game.bigBlind;
        
        game.players[this.getSmallBlindPlayer(game)].currentBet = game.smallBlind
        game.players[this.getBigBlindPlayer(game)].currentBet = game.bigBlind
        game.state = 'playing';

        // Set the current player to the player after the big blind
        game.currentPlayer = this.getNextPlayer(this.getBigBlindPlayer(game), gameId)

        this.broadcast(gameId, JSON.stringify({ type: 'startGame', gameId: gameId, players: Object.keys(game.players) })); //!!!! ERROR HERE !!!! SENDING THE WHOLE GAME OBJECT
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
      
    getNextPlayer(clientID, gameId){ 
        //check if player is folded
        //check if player is all in
        //check if player is last player, if so return first player
        //check if player is last player to bet
        //check if player is last player to bet and all other players have folded
        //if none of the above, return next player

console.log("Getting next player: ");

        const game = this.games[gameId];

//console.log("Game: ", game);

        const playerIds = Object.keys(game.players);

        const playerIndex = playerIds.indexOf(clientID);

        const nextPlayerIndex = (playerIndex + 1) % playerIds.length;
console.log("Next player index: ", nextPlayerIndex)
        
        //Check if player is still in game, if not, get the player after that, and so on
        if(game.players[playerIds[nextPlayerIndex]].folded){
console.log("Returning next player index: ", nextPlayerIndex)
            return this.getNextPlayer(playerIds[nextPlayerIndex], gameId);
        }
        //Check if player is all in, if so, we don't need an action from them
        if(game.players[playerIds[nextPlayerIndex]].allIn){
console.log("Returning next player index: ", nextPlayerIndex)
            return this.getNextPlayer(playerIds[nextPlayerIndex], gameId);
        }

        //Check if player is last player, if so return first player
        if(playerIndex >= playerIds.length){
console.log("Returning next player index: ", nextPlayerIndex)
            game.players[playerIds[0]].client.send(JSON.stringify({ type: 'action', currentPlayer: playerIds[0], message: "Your Turn" }));
            return playerIds[0];
        }

        //return next player
console.log("Returning next player index: ", nextPlayerIndex)
        game.players[nextPlayerIndex].client.send(JSON.stringify({ type: 'action', message: "Your Turn" }));
        return playerIds[nextPlayerIndex];
    }

    getSmallBlindPlayer(game){ 
        const playerIds = Object.keys(game.players);
        const nextSmallBlindPlayer = (game.smallBlindPlayer + 1) % playerIds.length;
        
        //Check if it's the last player, then check if they can afford the small blind, if not they go all in. If they haven't any at all they are out. 
        if(nextSmallBlindPlayer > playerIds.length){
            if(playerIds[0].bananaChips < game.smallBlind){
                if(playerIds[0].bananaChips === 0){
                    return playerIds[1];
                }else{
                    playerIds[0].allIn = true
                } 
            }
            return playerIds[0];
        }

        //Check if player can afford the small blind, if not they go all in. If they haven't any at all they are out.
        if(playerIds[nextSmallBlindPlayer].bananaChips < game.smallBlind){
            if(playerIds[nextSmallBlindPlayer].bananaChips === 0){
                return playerIds[nextSmallBlindPlayer+1];
            }else{
                playerIds[nextSmallBlindPlayer].allIn = true
            } 
        }

        return playerIds[nextSmallBlindPlayer];
    }

    getBigBlindPlayer(game){ 
        const playerIds = Object.keys(game.players);
        const nextBigBlindPlayer = (game.bigBlindPlayer + 1) % playerIds.length;
        
        //Check if it's the last player, then check if they can afford the big blind, if not they go all in. If they haven't any at all they are out. 
        if(nextBigBlindPlayer > playerIds.length){
            if(playerIds[0].bananaChips < game.bigBlind){
                if(playerIds[0].bananaChips === 0){
                    return playerIds[1];
                }else{
                    playerIds[0].allIn = true
                } 
            }
            return playerIds[0];
        }

        //Check if player can afford the big blind, if not they go all in. If they haven't any at all they are out.
        if(playerIds[nextBigBlindPlayer].bananaChips < game.bigBlind){
            if(playerIds[nextBigBlindPlayer].bananaChips === 0){
                return playerIds[nextBigBlindPlayer+1];
            }else{
                playerIds[nextBigBlindPlayer].allIn = true
            } 
        }

        return playerIds[nextBigBlindPlayer];
    }

    broadcast(gameId, message) {
        const game = this.games[gameId];
console.log("Broadcasting!");
        for (const playerId in game.players) {
            //Send a message to all players in the game
console.log("Sending message: ", message, " to player: ", playerId);
            game.players[playerId].client.send(message);
        }
    }
}