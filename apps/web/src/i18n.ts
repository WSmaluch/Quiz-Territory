import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  pl: {
    translation: {
      "welcome": "Witaj w Quiz Territory",
      "host_login": "Zaloguj jako Host",
      "try_demo": "Wypróbuj Demo",
      "join_game": "Dołącz do Gry",
      "lobby": "Poczekalnia",
      "players": "Gracze",
      "start_game": "Rozpocznij Grę",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "pl", // default language is Polish
    fallbackLng: "pl",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
