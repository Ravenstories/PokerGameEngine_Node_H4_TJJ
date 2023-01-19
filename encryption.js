/*
What needs to happen here:

It will receive a RSA Public Key with OAEP Encoding from a client
It will generate and Encrypt a AES-Key and an AES-IV using RSA with the Public Key given
It will then send and receive 128bit-AES encrypted messages, with CBC for ciphermode and PKCS7 padding.
UTF-16 for string encoding.

RSA Encrypt:
https://github.com/nkhil/node-crypto/blob/master/src/rsa/encrypt.js

*/
import { publicEncrypt, constants, RsaPublicKey } from "crypto";

export default class Encryption{
    constructor(){

    }


    /// Used once per client to encrypt a JSON object containing an AES key and AES IV
    RSAEncrypt(message, publicKey){
        var encryptedMessage = publicEncrypt(
            {
                key: publicKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'CBC',
            }, 
            Buffer.from(message)
        );

        return encryptedMessage;
    }

    AESEncrypt(message, key, iV){
        // Convert to Bytes

        // PKCS7 padding

        // Encrypting
        return message;
    }

    AESDecrypt(bytes, key, iV){
        return bytes;
    }

    GenerateBytes(length){
        return [123, 123, 123, 123];
    }
    
}