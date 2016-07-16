//var path = require('path');
import path from 'path'
import request from 'request'
import fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'
const token = process.env.TOKEN

const actionClasses = [
    require("./actions/antons").default
]

const bot = new TelegramBot(token, {polling: true})

const actions = actionClasses.map(function(actionClass){
   return new actionClass(bot)
});

// Matches /echo [whatever]
bot.onText(/\/echo (.+)/, function (msg, match) {
    const fromId = msg.from.id;
    const resp = match[1];
    console.log(msg.from.id);
    bot.sendMessage(fromId, resp);
});

// Any kind of message
bot.on('message', function (msg) {

    actions.forEach(function(action){
        if(action.test(msg)){
            action.doAction(msg)
        }
    });
    return false;

    const fromId = msg.from.id;

    console.log(msg.from.first_name + ": " + msg.text)

    const message = msg.text.toLowerCase();

    actions.forEach(function(action){
        if(action.test(message)){
            action.doAction(message)
        }
    });

});
