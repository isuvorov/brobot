import 'babel-polyfill';
import './fix';
import 'isomorphic-fetch';
import path from 'path';
import fs from 'fs';
// import Promise from 'bluebird';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import sample from 'lodash/sample';
import { ferrets } from './ferret';
import { mgbetaChatId } from './config/chats';


const __DEV__ = process.env.USER === 'isuvorov'

// export const anonMessages = {};
dotenv.config({ silent: true });
const token = process.env.TOKEN;
// console.log({ token });
// Promise.config = () => {}; // херов багфикс для телеграма
// let TelegramBot;
// try {
//   TelegramBot = require('node-telegram-bot-api');
// } catch (err) {
//   console.log('TelegramBot init', err);
// }


const actionClasses = [
  require('./actions/repost').default,
  require('./actions/privateMessage').default,
  require('./actions/antons').default,
  require('./actions/odnoklassniki').default,
  require('./actions/bratishka').default,
  require('./actions/azazaz').default,
  require('./actions/bayan').default,
  require('./actions/tuesday').default,
  require('./actions/bratbratan').default,
  require('./actions/counter').default,
  require('./actions/mobx').default,
  require('./actions/boobs').default,
  require('./actions/today').default,
  require('./actions/win').default,
  require('./actions/gay').default,
  require('./actions/cats').default,
  require('./actions/ferret').default,
  // Сколько это можно терпеть?!
  // require('./actions/satan').default,
  require('./actions/places').default,
  require('./actions/polundra').default,
  require('./actions/deanonVotes').default,
];

const bot = new TelegramBot(token, { polling: true });
const freshDate = Date.now();

const actions = actionClasses.map((ActionClass) => {
  return new ActionClass(bot);
});


const loves = [
  'давно хотел сказать',
  'но всегда боялся',
  'ты the BEST',
  'спасибо тебе',
  'медвежонок',
  'чмаффки!',
  'спаси меня!',
  'слыш, по ебалу хочешь?',
  'Гришот, блять!',
  'ты из-за TS не контрибьютишь в нового бота?',
  'жду твоих коммитов',
  'Пиздец, больше всего на свете я ненавижу...',
  '..юю',
  'дрочишь?',
  'я слежу за тобой',
  'не могу перестать думать о тебе',
  'сдеанонь меня, слабо?',
  'почему не пишешь в меня?',
  'Аааа ОРУ!',
  'Меня обновили. Угадай какой компромат добавлии на тебя?',
  'скучаю по твоим сообщениям',
  'напиши Нате плиз',
]
if (!__DEV__) {
  setTimeout(() => {
    try {
      const lastCommitMessage = fs.readFileSync(__dirname + '/last_commit_message.txt').toString();
      const lines = lastCommitMessage.split('\n');
      const commitId = lines[0].split(' ')[1]
      const commitAuthor = lines[1].split(': ')[1].split(' <')[0]
      const commitDate = new Date(lines[2].split(': ')[1].trim());
      const commitMessage = lines.slice(4, lines.length - 1).join('\n');
      const commitIsNew = (new Date() - 20 * 60 * 1000 < commitDate);
      const message = `
#ОБНОВЛЕНИЕ от ${commitAuthor}

${commitMessage}

https://gitlab.isuvorov.com/mgbeta/bratishka/commit/${commitId}
`.trim()
    
      if (commitIsNew) {
        bot.sendMessage(mgbetaChatId, message);
      }
    } catch(err){
      console.error(err);
    }
  }, 1000);
  // setTimeout(() => {
  //   ferrets.forEach(ferret => {
  //     const love = sample(loves)
  //     bot.sendMessage(ferret, love);
  //   });
  // }, 60000);
}



// Matches /echo [whatever]
bot.onText(/\/echo (.+)/, (message, match) => {
  const fromId = message.from.id;
  const resp = match[1];
  // console.log(message);
  bot.sendMessage(fromId, resp);
});

// Any kind of message
bot.on('message', (message) => {
  //console.log('M: ', message);
  //

  // if (message.sticker) {
  //   console.log('S: ', message.sticker.file_id);
  // }
  if (message.date * 1000 < freshDate) return false;
  actions.forEach((action) => {
    if (__DEV__) console.log('action.test', action.name)
    if (action.test(message)) {
      action.doAction(message);
    }
  });

  return false;
});
//
// bot.sendPhoto(80081115, 'AgADAgADhagxG-r-aUskTzaqcl_fFvMYrQ4ABIYQ7lB4_8D_XU4BAAEC', {
//   caption: 'message.caption',
// });

// bot.on('polling_error', err => {
//  console.log('ERROR', err);
//   const error = err.code;
//   const code = err.response && err.response.body && err.response.body.error_code;
//   if (error === 'ETELEGRAM' && code === 409) return;
//   console.log('ERROR', error, code);
// });

console.log('Bot successful runned');
