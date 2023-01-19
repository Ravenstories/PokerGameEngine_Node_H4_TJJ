// import { WebSocket } from 'ws';
import Encryption from '../encryption.js';

export class Player{
    
    client;
    
    
    constructor(client){
        this.client = client;
    }


    Send(message){
        this.client.send(message);
    }
}

export class EncryptedPlayer extends Player{
    encrypter;
    aesKey;
    aesIV;

    constructor(client){
        super(client);
        this.encrypter = new Encryption();
        this.aesKey = this.encrypter.GenerateBytes(16);
        this.aesIV = this.encrypter.GenerateBytes(16);
    }

    Send(message){
        // does the encrypting
        encryptedMessage = this.encrypter.AESEncrypt(message, this.aesKey, this.aesIV);
        // then sends
        super.Send(encryptedMessage);
    }

    DecryptMessage(message){
        // does the decrypting
        return this.encrypter.AESDecrypt(message, this.aesKey, this.aesIV);
    }
}