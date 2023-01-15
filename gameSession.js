export default class GameSession {
    constructor(game) {
        this.game = game;
        this.players = Object.values(this.game.players);
        this.currentPlayer = this.players[this.game.bigBlindPlayer];
    }

    play() {
        game = this.game;
        if(game.roundState === 'newRound'){
            // shuffle and deal cards to the players
            this.game.deck = shuffle(this.game.deck.cards);
            for (const player of this.players) {
                player.hand = this.game.deck.splice(0, 2);
            }
        
            // Set initial blinds
            this.players[this.game.smallBlindPlayer].bananaChips -= this.game.smallBlind;
            this.players[this.game.bigBlindPlayer].bananaChips -= this.game.bigBlind;
            this.game.currentBet = this.game.bigBlind;
            game.roundState = 'preflop';
        }

        switch (game.roundState) {
            case "preflop":
                this.playRound("preflop");
                break;
            case "flop":
                this.playRound("flop");
                break;
            case "turn":
                this.playRound("turn");
                break;
            case "river":
                this.playRound("river");
                break;
            case "end":
                this.endRound();
                break;
        }
    }

    nextRoundStage(roundState) {
        switch (roundState) {
            case "preflop":
                this.dealFlop();
                this.roundStage = "flop";
                this.playRound("flop");
                break;
            case "flop":
                this.dealTurn();
                this.roundStage = "turn";
                this.playRound("turn");
                break;
            case "turn":
                this.dealRiver();
                this.roundStage = "river";
                this.playRound("river");
                break;
            case "river":
                this.endRound();
                this.roundStage = "end";
                break;
        }
    }
    
    playRound(roundState) {
        // Play the round
        while (true) {
            // Get the next player
            const currentPlayer = this.getNextPlayer();
    
            // Handle player's turn
            this.playerAction(currentPlayer);
    
            // Check if round is over
            if (this.isBettingRoundOver()) {
                this.nextRoundStage(roundState);
                break;
            }
        }
    }
    
    dealFlop(){
        //Add flop to the table
        this.game.tableCards.push(this.game.deck.splice(0,3));
    }

    dealTurn(){
        //Add turn to the table
        this.game.tableCards.push(this.game.deck.splice(0,1));
    } 
    
    dealRiver(){
        //Add river to the table
        this.game.tableCards.push(this.game.deck.splice(0,1));
    }
    
    endRound(){
        this.game.roundState = 'newRound';

        ///For each player in the array, it checks if the player has folded by checking the isFolded property. 
        //If the player has not folded, it checks if there is a winner. If there is no winner, it sets the winner to the current player and sets the winning hand to the current player's hand.
        //If there is a winner, it compares the current player's hand to the winning hand. 
        //If the current player's hand is better, it sets the winner to the current player and sets the winning hand to the current player's hand.
        //After the loop, the winner is awarded the pot and the game is reset for the next round.
        
        let winner;
        let winningHand;
        for (const player of this.players) {
            if (!player.isFolded) {
                if (!winner) {
                    winner = player;
                    winningHand = player.hand;
                } else {
                    const playerHand = player.hand;
                    if (compareHands(playerHand, winningHand) === 1) {
                        winner = player;
                        winningHand = playerHand;
                    }
                }
            }
        }
    
        // Award the pot to the winner(s)
        winner.bananaChips += this.game.pot;
    
        // Reset the game for the next round
        this.game.pot = 0;
        this.game.tableCards = [];
        this.game.currentBet = 0;
        for (const player of this.players) {
            player.isReady = false;
            player.currentBet = 0;
            player.isFolded = false;
        }
    

        // Send the game state to all clients
        
        
        // Start the next round
        this.play();
    }

    isBettingRoundOver() {
        // Check if all players have folded
        let remainingPlayers = 0;
        let remainingPlayer;
        for (const player of this.players) {
            if (!player.isFolded) {
                remainingPlayers++;
                remainingPlayer = player;
            }
        }
        if (remainingPlayers === 1) {
            this.endRound();
        }
        // Check if all players have called / added the same amount to the pot
        const currentBet = this.game.currentBet;
        for (const player of this.players) {
            if (!player.isFolded && player.currentBet !== currentBet) {
                return false;
            }
        }
        return true;
    }
    
    playerAction(client, game, action, amount) {
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
                game.players[client.id].isFolded = true; // Place in player properties 
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

    getNextPlayer(clientID, game){ 
        //check if player is folded
        //check if player is all in
        //check if player is last player, if so return first player
        //check if player is last player to bet
        //check if player is last player to bet and all other players have folded
        //if none of the above, return next player

console.log("Getting next player: ");

//console.log("Game: ", game);

        const playerIds = Object.keys(game.players);

        const playerIndex = playerIds.indexOf(clientID);

        const nextPlayerIndex = (playerIndex + 1) % playerIds.length;
console.log("Next player index: ", nextPlayerIndex)
        
        //Check if player is still in game, if not, get the player after that, and so on
        if(game.players[playerIds[nextPlayerIndex]].isFolded){
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

}
