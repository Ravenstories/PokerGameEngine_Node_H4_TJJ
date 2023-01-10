var uuid = require('uuid-random');
const WebSocket = require('ws')

const wss = new WebSocket.WebSocketServer({ port: 8080 }, () => {
    console.log('Server started on port 8080');
});

//Stores player data
var playersData = {
    "type" : "playersData"
}

//-----------------Websocket Functions-----------------//

wss.on('connection', function connection(client){
    //Create unique id for user
    client.id = uuid();

    playersData["" + client.id] = {id : client.id}
    client.send(`{"id" : "${client.id}"}`);
    client.on('message', (data) => {
        var dataJSON = JSON.parse(data);
        console.log("Player Message");
        console.log(dataJSON);
    });

    //Notify that client disconnected
    client.on('close', () => {
        console.log("Player Disconnected");
        console.log("Removing client " + client.id);
        //delete playersData["" + client.id];
    });

});

wss.on('listening', () => { console.log("Listening on 8080") });