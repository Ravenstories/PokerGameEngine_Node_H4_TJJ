const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
const values = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

class Deck {
    constructor(cards) {
        this.cards = cards;
    }
}

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }
}
