var webSocketUrl = "wss://api.artik.cloud/v1.1/websocket?ack=true";
var device_id = "Enter Artik Cloud id";
var device_token = "Enter Artik Cloud Token";

var WebSocket = require('ws');
var isWebSocketReady = false;
var ws = null;

var PythonShell = require('python-shell');
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO

var brightness = 100;

var red = 255;
var green =255;
var blue = 255;

var stripState;

var sys = require('sys')
var exec = require('child_process').exec;
var child;
/**
 * Gets the current time in millis
 */
function getTimeMillis(){
    return parseInt(Date.now().toString());
}

/**
 * Create a /websocket connection and setup GPIO pin
 */
function start() {
    //Create the WebSocket connection
    isWebSocketReady = false;
    ws = new WebSocket(webSocketUrl);
    ws.on('open', function() {
        console.log("WebSocket connection is open ....");
        register();
    });
    ws.on('message', function(data) {
 //      console.log("Received message: " + data + '\n');
         handleRcvMsg(data);
    });
    ws.on('close', function() {
        console.log("WebSocket connection is closed ....");
	exitClosePins();
    });

}

/**
 * Sends a register message to /websocket endpoint
 */
function register(){
    console.log("Registering device on the WebSocket connection");
    try{
        var registerMessage = '{"type":"register", "sdid":"'+device_id+'", "Authorization":"bearer '+device_token+'", "cid":"'+getTimeMillis()+'"}';
        console.log('Sending register message ' + registerMessage + '\n');
        ws.send(registerMessage, {mask: true});
        isWebSocketReady = true;
    }
    catch (e) {
        console.error('Failed to register messages. Error in registering message: ' + e.toString());
    }    
}


/**
 * Handle Actions
   Example of the received message with Action type:
   {
   "type":"action","cts":1451436813630,"ts":1451436813631,
   "mid":"37e1d61b61b74a3ba962726cb3ef62f1",
   "sdid:xxxx,
   "ddid:xxxx,
   "data":{"actions":[{"name":"setOn","parameters":{}}]},
   "ddtid":"dtf3cdb9880d2e418f915fb9252e267051","uid":"650xxxx,mv":1
   }
 */
function handleRcvMsg(msg){
    var msgObj = JSON.parse(msg);
    if (msgObj.type != "action") return; //Early return;
    console.log("msg prob: " + JSON.stringify(msgObj));
    var newState;
    var actions = msgObj.data.actions;
    var actionName = actions[0].name; //assume that there is only one action in actions
    if (actionName.toLowerCase() == "seton") {
        newState = 1;
    }
    else if (actionName.toLowerCase() == "setoff") {
        newState = 0;
    }
    else if (actionName.toLowerCase() == "setlevel"){
        let actionLevel = actions[0].parameters.level;
        brightness = actionLevel;
        newState = 1;
    }
    else if (actionName.toLowerCase() == "setcolorrgb"){
        let colorRGB = actions[0].parameters.colorRGB;
        console.log("RGB!!!");
        red = colorRGB.red;
        green = colorRGB.green;
        blue = colorRGB.blue;
        newState = 2;
    }
    else {
        console.log('Do nothing since receiving unrecognized action ' + actionName);
        console.log("brightness is: " +  brightness);

    }

    console.log("action lev : " + brightness);

    console.log("brightness is: " + brightness);
    strip(newState , brightness, red, green, blue);


}

function strip(value, brightness, red, green, blue) {

    const ps = require('python-shell')
    ps.PythonShell.run('kill.py', null, function (err, results) {
        if (err) throw err;
        console.log('finished');
        console.log(results);

    });

    if (value == 1) {
        stripState = 'Rainbow';
        let options = {
            args: [brightness]
        };
        const ps = require('python-shell')
        ps.PythonShell.run('executeon.py', options, function (err, results) {
            if (err) throw err;
            console.log('finished');
            console.log(results);

        });
    }
    else if (value == 0) {
        stripState = 'Off';
        const ps = require('python-shell')
        ps.PythonShell.run('executeoff.py', null, function (err, results) {
            if (err) throw err;
            console.log('finished');
            console.log(results);

        });
    }
    else if (value == 2) {
        stripState = 'RGB';
        let options = {
            args: [red, green, blue]
        };
        const ps = require('python-shell')
        ps.PythonShell.run('executeSolid.py', options, function (err, results) {
            if (err) throw err;
            console.log('finished');
            console.log(results);

        });

    }
    sendStateToArtikCloud(stripState)
}


    /**
     * Send one message to ARTIK Cloud
     */
    function sendStateToArtikCloud(state) {

        try {
            ts = ', "ts": ' + getTimeMillis();
            var data = {
                "state": state
            };
            var payload = '{"sdid":"' + device_id + '"' + ts + ', "data": ' + JSON.stringify(data) + ', "cid":"' + getTimeMillis() + '"}';
            console.log('Sending payload ' + payload + '\n');
            ws.send(payload, {mask: true});
        } catch (e) {
            console.error('Error in sending a message: ' + e.toString() + '\n');
        }
    }

    /**
     * Properly cleanup the pins
     */
    function exitClosePins() {

    }

    /**
     * All start here
     */

    start();

    process.on('SIGINT', exitClosePins);
