/* Chat API example
   Webhook example for Facebook Messenger and SMS
   This demo greets to each sender and response with a random answer.

   To register your Facebook Page to Nexmo OTT, Use the tool at:
   https://static.nexmo.com/facebook

   API Referene: https://docs.nexmo.com/... (TBD)
 */
'use strict';

const NEXMO_API_KEY = process.env.NEXMO_API_KEY;
const NEXMO_API_SECRET = process.env.NEXMO_API_SECRET;
const NEXMO_NUMBER = process.env.NEXMO_NUMBER;
const APIAI_TOKEN = process.env.APIAI_TOKEN;
const WEATHER_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

const NEXMO_CHAT_REST_URL = 'https://api.nexmo.com/ott/poc/chat/json';
const NEXMO_RECEIPT_URL = 'https://c14aefab.ngrok.io/receipt';
const APIAI_URL = 'https://api.api.ai/v1/query';

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.use(express.static(__dirname + '/public'));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

// To POST data
const request = require('request');

// Use Node.js Lib for SMS.
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
  apiKey: NEXMO_API_KEY,
  apiSecret: NEXMO_API_SECRET,
}, {debug: true});

// API.ai
const apiai = require('apiai');
const apiaiApp = apiai(APIAI_TOKEN);

// socket.io - for Web UI (Optional)
const socketio = require('socket.io');
const io = socketio(server);

// Web UI (Optional)

app.get('/', function (req, res) {
  res.render('index');
});


// Handle both GET and POST requests

app.post('/message', (req, res) => {
  console.log('*** Inbound to Nexmo ***');
  //console.log(req.body);
  // FB response
  // {   user_id: '1284850101589xxx',
  //    user_name: 'Tomomi Imura',
  //    message_timestamp: '2016-12-28 22:54:15',
  //    from: 'ott:fbmessenger:1284850101589147',
  //    message_id: 'mid.1482965653850:0ca09da421',
  //    to: 'ott:fbmessenger:301125206951687',
  //    text: 'yo',
  //    type: 'text',
  //    user_img: 'https://scontent.xx.fbcdn.net/v/t1.0-1/392074_4093360926879_883458610_n.jpg?oh=eb5b28fc079d0d5788bdf360ad306077&oe=58F2A4D1' }

  // SMS response
  // { msisdn: '14155553202',
  //   to: '18187970001',
  //   messageId: '0B000000280E4CBE',
  //   text: 'Yo',
  //   type: 'text',
  //   keyword: 'YO',
  //   'message-timestamp': '2016-12-28 23:02:15' }

  // Socket.io
  if(req.body.type === 'text' || req.body.msisdn){
    io.emit('user', req.body);
  } 

  // Get a reply from api.ai
  getReplyFromApiai(req.body);

  //res.send(req.body);
  res.status(200).end();
});

app.post('/receipt', (req, res) => {
  console.log('*** Outbound from Nexmo ***');
  console.log(req.body);
  res.status(200).end();
});


/* GET query from API.ai */
function getReplyFromApiai(params) {

  let request = apiaiApp.textRequest(params.text, {
    sessionId: 'jamiecat'
  });

  request.on('response', function(response) {
      console.log(response);
      let replyMessage = response.result.fulfillment.speech;

      if (params.msisdn) { // Sender is texting via SMS
        nexmo.message.sendSms(
            NEXMO_NUMBER, params.msisdn, replyMessage, {type: 'unicode'},
            (err, responseData) => {if (err) {console.log(err)}}
          );
      } else { // Facebook etc.
        if (params.type === 'text') {
          postMessage(params.from, replyMessage);
        }
      }
  });

  request.on('error', function(error) {
      console.log(error);
  });

  request.end();

}

/* POST to Facebook Messenger via the REST API (Currently, Node.js lib is not available) */
function postMessage(user, message) {
  let data = {
    api_key: NEXMO_API_KEY,
    api_secret: NEXMO_API_SECRET,
    to: user, // should look like "ott:fbmessenger:1284850101589147"
    callback: NEXMO_RECEIPT_URL,
    type: 'text',
    text: message
  };
  request.post(
    NEXMO_CHAT_REST_URL,
    {json: data},
    (err, res, body) => {
      if (!err && res.statusCode == 200) {
        console.log(body);
      }
    });
}

/* This is for API.ai Webhook Fullfilment */

app.post('/ai', (req, res) => {
  console.log('*** Webhook for api.ai query ***');
  let result = req.body.result;

  if (result.action === 'horoscope') {
    console.log('*** horoscope ***');
    if(!result.parameters['horoscope-sign']) return;

    let sign = result.parameters['horoscope-sign'];
    let restUrl = 'http://widgets.fabulously40.com/horoscope.json?sign=' +sign;

    request.get(restUrl, (err, response, body) => {
      if (!err && response.statusCode == 200) {

        let json = JSON.parse(body);
        console.log(json.horoscope);
        // escape unicode
        let decodedResult = JSON.parse('"' + json.horoscope.horoscope + '"')
        return res.json({
          speech: decodedResult,
          displayText: '⭐️ ' + decodedResult,
          source: 'horoscope'
        });
      } else {
        let errorMessage = 'I failed to look up your zodiac sign. Please check the spelling!';
        return res.status(400).json({
          status: {
            code: 400,
            errorType: errorMessage
          }
        });
      }
    })
  } else if (result.action === 'weather') {
    console.log('*** weather ***');
    if(!result.parameters['geo-city']) return;

    let city = result.parameters['geo-city'];
    let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+WEATHER_API_KEY+'&q='+city;

    request.get(restUrl, (err, response, body) => {
      if (!err && response.statusCode == 200) {
        let json = JSON.parse(body);
        console.log(json);
        let tempF = ~~(json.main.temp * 9/5 - 459.67);
        let tempC = ~~(json.main.temp - 273.15);
        let msg = 'The current condition in ' + json.name + ' is ' + json.weather[0].description + ' and the temperature is ' + tempF + ' ℉ (' +tempC+ ' ℃).'
        return res.json({
          speech: msg,
          displayText: msg,
          source: 'weather'
        });
      } else {
        let errorMessage = 'I failed to look up the city name.';
        return res.status(400).json({
          status: {
            code: 400,
            errorType: errorMessage
          }
        });
      }
    })
  }

});
