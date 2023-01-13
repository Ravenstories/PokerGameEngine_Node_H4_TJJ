const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
const values = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

export default class Deck {
    constructor(cards = newDeck()) {
        this.cards = cards;
    }
}

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }
}

function newDeck() {
    return suits.flatMap(suit => {
        return values.map(value => {
            return new Card(suit, value)})
    });
}

export function shuffle(deckOfCards) { // Fisher-Yates shuffle
    let currentIndex = deckOfCards.length;
console.log("deckOfCards.length: " + deckOfCards.length);

    let temporaryValue, randomIndex;

console.log("Shuffling deck");
    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        
        // And swap it with the current element.
        temporaryValue = deckOfCards[currentIndex];
        deckOfCards[currentIndex] = deckOfCards[randomIndex];
        deckOfCards[randomIndex] = temporaryValue;

//console.log("currentIndex: " + currentIndex + " randomIndex: " + randomIndex);
    }
console.log("Done shuffling deck");
    return deckOfCards;      
}

