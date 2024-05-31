import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enJSON from "./eng.json";
import espJSON from "./esp.json";

const resources = {
  eng: { ...enJSON },
  esp: { ...espJSON },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "eng",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
