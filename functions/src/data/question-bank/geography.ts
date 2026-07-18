import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Do którego państwa należy flaga przedstawiona na ilustracji?', 'Francja', [], undefined, 'NIEBIESKI · BIAŁY · CZERWONY'],
  ['Jakie państwo ma kształt przypominający but?', 'Włochy', ['Italia'], undefined, 'KSZTAŁT BUTA'],
  ['Jak nazywa się najwyższy szczyt oznaczony wysokością na ilustracji?', 'Mount Everest', ['Everest', 'Czomolungma'], undefined, '8848,86 m'],
  ['Jak nazywa się rzeka kojarzona z deltą i piramidami?', 'Nil', [], undefined, 'DELTA + PIRAMIDY'],
  ['Który kontynent otacza biegun południowy?', 'Antarktyda', [], undefined, 'BIEGUN POŁUDNIOWY'],
  ['Jak nazywa się największy półwysep świata, widoczny na zdjęciu satelitarnym?', 'Półwysep Arabski', ['Arabia', 'półwysep arabski'], undefined, 'NAJWIĘKSZY PÓŁWYSEP'],
  ['Która pustynia jest największą gorącą pustynią świata?', 'Sahara', [], undefined, 'AFRYKA PÓŁNOCNA'],
  ['Jakie miasto jest stolicą Japonii?', 'Tokio', ['Tokyo'], undefined, 'JAPONIA'],
  ['Jak nazywa się stolica Australii?', 'Canberra', ['Kanberra']],
  ['Które państwo ma największą powierzchnię?', 'Rosja', ['Federacja Rosyjska']],
  ['Jak nazywa się morze między Europą a Afryką?', 'Morze Śródziemne'],
  ['Która rzeka przepływa przez Londyn?', 'Tamiza'],
  ['Jak nazywa się najdłuższa rzeka Polski?', 'Wisła'],
  ['Stolicą którego państwa jest Ottawa?', 'Kanada'],
  ['Jak nazywa się łańcuch górski oddzielający Europę od Azji?', 'Ural', ['Góry Ural']],
  ['Na którym kontynencie leży Surinam?', 'Ameryka Południowa'],
  ['Jak nazywa się stolica Islandii?', 'Reykjavík', ['Reykjavik', 'Rejkiawik']],
  ['Które jezioro jest najgłębsze na świecie?', 'Bajkał', ['Jezioro Bajkał']],
  ['Jakie państwo otacza Lesotho?', 'Republika Południowej Afryki', ['RPA', 'Afryka Południowa']],
  ['Jak nazywa się cieśnina oddzielająca Azję od Ameryki Północnej?', 'Cieśnina Beringa'],
  ['Która stolica leży nad Dunajem i powstała z połączenia Budy i Pesztu?', 'Budapeszt'],
  ['Jak nazywa się największa wyspa świata?', 'Grenlandia'],
  ['W którym państwie leży Machu Picchu?', 'Peru'],
  ['Jak nazywa się stolica Nowej Zelandii?', 'Wellington'],
  ['Które góry ciągną się wzdłuż zachodniego wybrzeża Ameryki Południowej?', 'Andy'],
  ['Jak nazywa się zatoka między Szwecją a Finlandią?', 'Zatoka Botnicka'],
  ['Które państwo ma stolicę w Ułan Bator?', 'Mongolia'],
  ['Jak nazywa się największe jezioro Afryki pod względem powierzchni?', 'Jezioro Wiktorii', ['Wiktoria']],
  ['Który kanał łączy Morze Śródziemne z Morzem Czerwonym?', 'Kanał Sueski'],
  ['Jak nazywa się stolica Chile?', 'Santiago', ['Santiago de Chile']],
];

export const GEOGRAPHY_QUESTIONS = buildQuestions('geography', 'geography', facts);
