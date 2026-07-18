import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Jakie miasto jest stolicą Polski?', 'Warszawa', [], undefined, 'STOLICA POLSKI'],
  ['Jak nazywa się najwyższy szczyt Polski oznaczony wysokością 2499 m?', 'Rysy', [], undefined, '2499 m'],
  ['Która rzeka przepływa przez Kraków i Warszawę?', 'Wisła', [], undefined, 'KRAKÓW → WARSZAWA'],
  ['Jak nazywa się polskie morze?', 'Morze Bałtyckie', ['Bałtyk'], undefined, 'PÓŁNOC POLSKI'],
  ['Które miasto kojarzy się z koziołkami na ratuszu?', 'Poznań', [], undefined, 'KOZIOŁKI NA RATUSZU'],
  ['Jak nazywa się pustynia położona na Wyżynie Krakowsko-Częstochowskiej?', 'Pustynia Błędowska', [], undefined, 'POLSKA PUSTYNIA'],
  ['Który symbol narodowy przedstawia białego ptaka w koronie?', 'Godło Polski', ['orzeł biały', 'biały orzeł'], undefined, 'BIAŁY ORZEŁ'],
  ['Jak nazywa się region słynący z oscypka?', 'Podhale', ['Tatry'], undefined, 'OSCYPEK'],
  ['Ile województw ma Polska?', '16', ['szesnaście']],
  ['Jak nazywa się najdłuższe polskie jezioro?', 'Jeziorak'],
  ['W którym mieście znajduje się Zamek Królewski na Wawelu?', 'Kraków'],
  ['Jak nazywa się tradycyjny polski taniec w szybkim tempie pochodzący z Krakowa?', 'Krakowiak'],
  ['Które miasto jest siedzibą Europejskiego Centrum Solidarności?', 'Gdańsk'],
  ['Jak nazywa się największy park narodowy w Polsce?', 'Biebrzański Park Narodowy', ['Biebrzański']],
  ['Który astronom urodzony w Toruniu sformułował teorię heliocentryczną?', 'Mikołaj Kopernik', ['Kopernik', 'mikolaj kopernik']],
  ['Jak nazywa się polska waluta?', 'Złoty', ['polski złoty', 'PLN']],
  ['Które miasto leży nad Odrą i słynie z licznych mostów oraz krasnali?', 'Wrocław'],
  ['Jak nazywa się puszcza będąca siedliskiem żubrów na wschodzie Polski?', 'Puszcza Białowieska', ['Białowieża']],
  ['Który kompozytor urodził się w Żelazowej Woli?', 'Fryderyk Chopin', ['Chopin']],
  ['Jak nazywa się półwysep na północy Polski z miastem Hel?', 'Półwysep Helski', ['Mierzeja Helska']],
  ['Które miasto było pierwszą stolicą Polski?', 'Gniezno'],
  ['Jak nazywa się tradycyjna zupa z zakwasu żytniego?', 'Żurek', ['żur']],
  ['Które góry leżą w południowo-zachodniej Polsce i obejmują Karkonosze?', 'Sudety'],
  ['Jak nazywa się hymn Polski?', 'Mazurek Dąbrowskiego'],
  ['W którym mieście znajduje się ulica Piotrkowska?', 'Łódź', ['Lodz']],
  ['Jak nazywa się największa wyspa należąca częściowo do Polski?', 'Uznam'],
  ['Który polski laureat Pokojowej Nagrody Nobla był liderem Solidarności?', 'Lech Wałęsa', ['Lech Walesa', 'Wałęsa']],
  ['Jak nazywa się charakterystyczny czerwony kwiat z wycinanek łowickich?', 'Mak'],
  ['Które miasto słynie z pierników i gotyckiej starówki nad Wisłą?', 'Toruń'],
  ['Jak nazywa się najwyższy wodospad w polskich Tatrach?', 'Wielka Siklawa', ['Siklawa']],
];

export const POLAND_QUESTIONS = buildQuestions('poland', 'poland', facts);
