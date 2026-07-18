import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Z jaką dyscypliną kojarzy się układ punktów 15, 30, 40?', 'Tenis', [], undefined, '15 · 30 · 40'],
  ['W jakiej dyscyplinie używa się obręczy o średnicy 45 cm?', 'Koszykówka', [], undefined, 'OBRĘCZ 45 cm'],
  ['Jak nazywa się wyścig kolarski symbolizowany przez żółtą koszulkę?', 'Tour de France', [], undefined, 'ŻÓŁTA KOSZULKA'],
  ['W której dyscyplinie wykonuje się skok typu Fosbury flop?', 'Skok wzwyż', [], undefined, 'FOSBURY FLOP'],
  ['Ile kół znajduje się w symbolu olimpijskim?', 'Pięć', ['5'], undefined, 'OLIMPIZM'],
  ['Jak nazywa się odległość 42,195 km w lekkoatletyce?', 'Maraton', [], undefined, '42,195 km'],
  ['W której grze używa się lotek i tarczy podzielonej na 20 sektorów?', 'Dart', ['darts', 'rzutki'], undefined, '20 SEKTORÓW'],
  ['Jak nazywa się pozycja szachowa oznaczająca zagrożenie króla bez możliwości obrony?', 'Mat', ['szach mat'], undefined, 'KRÓL BEZ OBRONY'],
  ['Ilu zawodników jednej drużyny przebywa na boisku w piłce nożnej?', '11', ['jedenastu']],
  ['W jakiej dyscyplinie przyznaje się Puchar Davisa?', 'Tenis'],
  ['Ile setów trzeba wygrać w standardowym meczu siatkówki halowej?', 'Trzy', ['3']],
  ['Jak nazywa się najwyższa liga piłkarska w Polsce?', 'Ekstraklasa'],
  ['Który styl pływacki jest najszybszy?', 'Kraul', ['styl dowolny']],
  ['W której dyscyplinie występują pozycje młynarza i łącznika młyna?', 'Rugby'],
  ['Jak nazywa się arena walk bokserskich?', 'Ring'],
  ['Ile punktów wart jest rzut zza linii 6,75 m w koszykówce?', 'Trzy', ['3']],
  ['W jakim kraju narodziło się judo?', 'Japonia'],
  ['Jak nazywa się trofeum mistrza ligi NHL?', 'Puchar Stanleya', ['Stanley Cup']],
  ['W której dyscyplinie startuje się z bloków i biegnie po torach?', 'Lekkoatletyka', ['biegi sprinterskie', 'sprint']],
  ['Ile minut trwa regulaminowy mecz piłki ręcznej seniorów?', '60 minut', ['60']],
  ['Jak nazywa się uderzenie rozpoczynające dołek w golfie?', 'Drive', ['drajw']],
  ['W której dyscyplinie używa się floretu, szpady i szabli?', 'Szermierka'],
  ['Jak nazywa się wyścig Formuły 1 rozgrywany ulicami Monako?', 'Grand Prix Monako', ['GP Monako']],
  ['Ile kamieni ma każda drużyna w jednej partii curlingu?', 'Osiem', ['8']],
  ['Jak nazywa się japońska sztuka walki oparta głównie na rzutach i chwytach?', 'Judo'],
  ['W której dyscyplinie można zdobyć birdie i eagle?', 'Golf'],
  ['Jak nazywa się seria rzutów karnych rozstrzygająca remis w piłce nożnej?', 'Konkurs rzutów karnych', ['rzuty karne', 'jedenastki']],
  ['Ile wynosi maksymalny break w snookerze bez faulu przeciwnika?', '147', ['147 punktów']],
  ['Jak nazywa się najważniejszy turniej tenisowy rozgrywany na trawie w Londynie?', 'Wimbledon'],
  ['Która dyscyplina łączy biegi narciarskie i strzelanie?', 'Biathlon'],
];

export const SPORT_QUESTIONS = buildQuestions('sport', 'sport', facts);
