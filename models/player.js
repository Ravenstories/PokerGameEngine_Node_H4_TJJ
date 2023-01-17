export class Player{
    constructor(client){
        this.client = client;
    }

    send(message){
        this.client.send(message);
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
        super(encryptedMessage);
    }

    DecryptMessage(message){
        // does the decrypting
        return this.encrypter.AESDecrypt(message, this.aesKey, this.aesIV);
    }
}