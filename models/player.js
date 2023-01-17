
import { WebSocket } from 'ws';

export class Player extends WebSocket{
    constructor(client){
        // ... I guess I start a new WebSocket and IMMEDIATELY overwrite it... This feels Beyond illegal.
        super() = client;
    }

    send(message){
        super.send(message);
    }
}

export class EncryptedPlayer extends Player{
    constructor(client){
        this.encrypter = Encryption();
        this.aesKey = this.encrypter.GenerateBytes(16);
        this.aesIV = this.encrypter.GenerateBytes(16);
        super(client);
    }

    send(message){
        // does the encrypting
        encryptedMessage = this.encrypter.AESEncrypt(message, this.aesKey, this.aesIV);
        // then sends
        super.send(encryptedMessage);
    }

    DecryptMessage(message){
        // does the decrypting
        return this.encrypter.AESDecrypt(message, this.aesKey, this.aesIV);
    }
}