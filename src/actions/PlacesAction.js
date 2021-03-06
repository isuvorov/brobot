import qs from 'querystring';
import Morphy from 'phpmorphy';
import get from 'lodash/get';
import sample from 'lodash/sample';
import lowerCase from 'lodash/lowerCase';
import upperCase from 'lodash/upperCase';
import translate from '../lib/translate';
import Action from './Action';
import config from '../config';

const { foursquare = {} } = config;
const HOST = 'https://api.foursquare.com/v2';
const ERR_MSG = 'Извини, я забыл как искать. Возможно когда-нибудь вспомню.';

const startSearchPhrases = [
  'Ушёл искать.',
  'Уже бегу искать, оставайтесь на линии!',
  'Ща поищем, братиш.',
  'Опять искать? Ладно..',
  'OK Boomer',
];

const endSearchNotFoundPhrases = [
  'Извини, я не нашел этого города.',
  'Ну я хотябы пытался найти.',
  'Слыш, пёс. А ты уверен в этом месте?',
  'В общем, ничего не найдено. Я пошёл...',
  '404 Not found',
];

const endSearchTimedPhrases = [
  'Извини, я не нашел ничего в этом городе, возможно заведения уже закрыты. Попробуй в другой раз.',
  'Мне пришлось все заведения обзвонить, но никто не ответил. Всё ты виноват, смотри который час.',
  'Я хз, мне сказали сказать, что всё закрыто.',
  'Давай не сейчас, уже не время.',
];

const foundPlaces = (address) => ([
  `В <b>${address}</b>, есть несколько мест, которые сейчас открыты:`,
  `Ну, в общем, здесь (<b>${address}</b>) кое-что ещё открыто:`,
  `Результаты лучше чем на алиэкспрессе. Смотри, что нашёл в <b>${address}</b>:`,
  `Это было сложно, но всё для тебя! Здесь, <b>${address}</b>, есть следующие места:`,
]);

const userCitiesEnum = {
  'лимасе': 'Лимассол',
  'лимас': 'Лимассол',
  'нижний': 'Нижний Новгород',
  'нижнем': 'Нижний Новгород',
  'нур-султане': 'Астана',
  'нур-султан': 'Астана',
  'спб': 'Санкт-Петербург',
  'мск': 'Москва',
  'тлт': 'Тольятти',
};

const restrictedCities = [
  'Солт Лейк Сити',
];

const restrictedTranslates = [
  'СЫСЕРТЬ',
];

const eatPhrases = [
  'поесть в',
  'еда в',
  'пообедать в',
  'покушать в',
];

const drinkPhrases = [
  'нажраться в',
  'бухать в',
  'выпить в',
];

const coffeePhrases = [
  'выпить кофе в',
  'попить кофе в',
  'напитки в',
  'кофе в',
  'кофейни в',
];

const shopsPhrases = [
  'магазы в',
  'магазины в',
  'затариться в',
  'товары в',
];

const artsPhrases = [
  'насладиться в',
  'посмотреть в',
  'искусство в',
];

const sightsPhrases = [
  'достопримечательности в',
  'интересное в',
  'интересности в',
  'туристам в',
];

const outdoorsPhrases = [
  'сходить в',
  'пойти в',
  'найти в',
  'собраться в',
];

const phrases = [
  ...eatPhrases,
  ...drinkPhrases,
  ...coffeePhrases,
  ...shopsPhrases,
  ...artsPhrases,
  ...sightsPhrases,
  ...outdoorsPhrases,
];

const rx = new RegExp(`(${phrases.join('|')})о? ([A-Za-zА-Яа-я0-9- ]+)`, 'i');

export default class PlacesAction extends Action {
  constructor(...args) {
    super(...args);
    this.name = 'PlacesAction';
  }

  test(message) {
    return this.testMessageRegExp(message, rx);
  }

  getSection(action) {
    const categories = ['food', 'drinks', 'coffee', 'shops', 'sights', 'outdoors'];
    let section = sample(categories);
    if (eatPhrases.includes(action)) section = categories[0];
    if (drinkPhrases.includes(action)) section = categories[1];
    if (coffeePhrases.includes(action)) section = categories[2];
    if (shopsPhrases.includes(action)) section = categories[3];
    if (sightsPhrases.includes(action)) section = categories[4];
    if (outdoorsPhrases.includes(action)) section = categories[5];
    return section;
  }

  async getPhoto(v, venueId) {
    if (!foursquare.clientId && !foursquare.clientSecret) {
      return null;
    }
    try {
      const res = await fetch(
        `${HOST}/venues/${venueId}/photos?${qs.stringify({
          client_id: foursquare.clientId,
          client_secret: foursquare.clientSecret,
          limit: 1,
          group: 'venue',
          v,
        })}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).then(res => res.json());
      const item = get(res, 'response.photos.items.0');
      if (!item) return null;
      const url = `${item.prefix}500${item.suffix}`;
      return url;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async findVenues(v, near, section) {
    if (!foursquare.clientId && !foursquare.clientSecret) {
      return {
        caption: ERR_MSG,
      };
    }

    try {
      const res = await fetch(
        `${HOST}/venues/explore?${qs.stringify({
          client_id: foursquare.clientId,
          client_secret: foursquare.clientSecret,
          v,
          limit: 5,
          sortByPopularity: 1,
          openNow: 1,
          near,
          section
        })}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).then(res => res.json());
      const items = get(res, 'response.groups.0.items', []);
      const venues = items.map(({ venue }) => ({
        id: venue.id,
        name: venue.name,
        address: venue.location.address,
      }));
      const promises = items.map(({ venue }) => this.getPhoto(v, venue.id));
      const prePhotos = await Promise.all(promises);
      const photos = prePhotos.filter(e => !!e);
      const cityAddress = get(res, 'response.geocode.displayString');
      if (!cityAddress) {
        return {
          caption: sample(endSearchNotFoundPhrases),
        };
      }
      if (!(Array.isArray(venues) && venues.length)) {
        return {
          caption: sample(endSearchTimedPhrases)
        };
      }
      const caption = `
${sample(foundPlaces(cityAddress))}
${venues.map((venue, index) => `
${index + 1}. <i>${venue.name}</i>${!!venue.address ? `
${venue.address}` : ''}
`).join('')}
      `;
      return {
        photos,
        caption,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async prepareCityName(_name) {
    let name = lowerCase(_name);
    if (restrictedCities.includes(name)) return name;
    if (userCitiesEnum[name]) name = userCitiesEnum[name];

    const morphy = new Morphy('ru', {
      storage: Morphy.STORAGE_MEM,
      predict_by_suffix: true,
      predict_by_db: true,
      graminfo_as_text: true,
      use_ancodes_cache: false,
      resolve_ancodes: Morphy.RESOLVE_ANCODES_AS_TEXT,
    });

    const cityPhrases = name.split(' ');
    const res = morphy.lemmatize(cityPhrases);
    const compCity = cityPhrases.map((e) => {
      const val = res[upperCase(e)];
      return val[val.length - 1];
    });
    const isError = compCity.some(e => !e);
    let newCity;
    if (isError) newCity = name;
    else newCity = compCity.join(' ');
    if (restrictedTranslates.includes(newCity)) {
      return restrictedTranslates.find(e => e === newCity);
    }
    const { text }  = await translate(newCity, { to: 'en' });
    return text;
  }

  async doAction(message) {
    this.log('doAction');
    const { text } = message;
    const [, action, cityRaw] = rx.exec(text);
    const bot = this.bot;
    const section = this.getSection(action);
    const chatId = message.chat.id || message.from.id;
    const options = { reply_to_message_id: message.message_id };
    bot.sendMessage(chatId, sample(startSearchPhrases), options);
    const city = await this.prepareCityName(cityRaw);
    const { photos, caption } = await this.findVenues('20191226', city, section);
    let media = [];
    if (photos && Array.isArray(photos)) {
      media = photos.map((photo, index) => ({
        type: 'photo',
        media: photo,
        ...(index === 0 ? {
          caption,
          parse_mode: 'html',
        } : {}),
        width: 500,
        height: 500,
      }));
    }
    
    if (media.length) {
      bot.sendMediaGroup(chatId, media, options);
    } else {
      bot.sendMessage(chatId, caption, options);
    }
  }
}
