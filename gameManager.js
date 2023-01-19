import Deck from './models/deck.js';
import uuid from 'uuid-random';
import GameSession from './gameSession.js';

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
            roundState: 'newRound',
            smallBlind:5,
            bigBlind:10,
            bigBlindPlayer:0,
            smallBlindPlayer:1,
            pot:0,
            currentBet:0,
            dealer:0,
            deck : deck, // This is the deck of cards, that we will with cards from deck.js 
            tableCards: [],
        }

console.log("Game created: ", " Game ID: ", gameId, " Game: ", this.games[gameId]);
        client.Send(JSON.stringify({ type: 'createGame', gameId: gameId }));
    }

    getGames(client) {
        const gameIds = Object.keys(this.games);
        client.Send(JSON.stringify({ type: 'gamesList', gameIds: gameIds }));
    }

    // Join a game by ID and send the game state to the client
    joinGame(client, gameId) {
        const game = this.games[gameId];

        if (!game) {
            client.Send(JSON.stringify({ type: 'error', message: 'Invalid game ID' }));
            return;
        }
        if (game.state !== 'waiting') {
            client.Send(JSON.stringify({ type: 'error', message: 'Game has already started' }));
            return;
        }
        if (Object.keys(game.players).length >= 9) { // 9 players max per game (change this to 2 for testing) 
            client.Send(JSON.stringify({ type: 'error', message: 'Game is full' }));
            return;
        }
        // Using Object.assign to copy player objects when joining a game

        game.players[client.id] = Object.assign({}, { id: client.id, clientName: client.name, ready: false, hand: [], bananaChips: 100, isFolded: false, isAllIn: false, currentBet: 0});

        this.broadcast(gameId, JSON.stringify({ type: 'joinGame', gameId: gameId, players: game.players }));
        client.Send(JSON.stringify({ type: 'joinGame', gameId: gameId }));
    }
    
    startGame(client, gameId) {
        const game = this.games[gameId];
console.log("Starting game!");
        if (!game) {
console.log("Game not found! / Invalid game ID");
            client.Send(JSON.stringify({ type: 'error', message: 'Invalid game ID' }));
            return;
        }
        if (game.state !== 'waiting') {
console.log("Game has already started");
            client.Send(JSON.stringify({ type: 'error', message: 'Game has already started' }));
            return;
        }
    
        // Set the game state to playing
        game.state = 'playing';
        let newGame = new GameSession(game);
        newGame.play();

        this.broadcast(gameId, JSON.stringify({ type: 'startGame', gameId: gameId, players: Object.keys(game.players) })); //!!!! ERROR HERE !!!! SENDING THE WHOLE GAME OBJECT
    }

    broadcast(gameId, message) {
        const game = this.games[gameId];
console.log("Broadcasting!");
        for (const playerId in game.players) {
            //Send a message to all players in the game
console.log("Sending message: ", message, " to player: ", playerId);
            game.players[playerId].client.Send(message);
        }
    }
}