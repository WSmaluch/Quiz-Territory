import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Kto namalował dzieło kojarzone z tajemniczym uśmiechem?', 'Leonardo da Vinci', ['Leonardo', 'da Vinci'], undefined, 'TAJEMNICZY UŚMIECH'],
  ['Jak nazywa się styl architektoniczny rozpoznawalny po ostrołukach i witrażach?', 'Gotyk', ['styl gotycki'], undefined, 'OSTROŁUK + WITRAŻ'],
  ['Kto jest autorem rzeźby „Dawid” znajdującej się we Florencji?', 'Michał Anioł', ['Michelangelo'], undefined, 'DAWID · FLORENCJA'],
  ['Jak nazywa się japońska sztuka składania papieru?', 'Origami', [], undefined, 'SKŁADANY PAPIER'],
  ['Który malarz jest autorem „Gwiaździstej nocy”?', 'Vincent van Gogh', ['Van Gogh'], undefined, 'GWIAŹDZISTA NOC'],
  ['Jak nazywa się teatr wywodzący się z Japonii, w którym aktorzy noszą wyrazisty makijaż?', 'Kabuki', [], undefined, 'JAPONIA · MAKIJAŻ'],
  ['Która epoka artystyczna kojarzy się z przepychem, dynamiką i kontrastem?', 'Barok', [], undefined, 'PRZEPYCH + DYNAMIKA'],
  ['Jak nazywa się technika malowania na mokrym tynku?', 'Fresk', ['fresco'], undefined, 'MOKRY TYNK'],
  ['Kto napisał „Romea i Julię”?', 'William Shakespeare', ['Szekspir', 'Shakespeare']],
  ['Jak nazywa się muzeum w Paryżu, w którym znajduje się Mona Lisa?', 'Luwr', ['Louvre']],
  ['Kto jest autorem powieści „Proces”?', 'Franz Kafka', ['Kafka']],
  ['Jak nazywa się najstarsza zachowana polska pieśń religijna?', 'Bogurodzica'],
  ['Który architekt zaprojektował kościół Sagrada Família?', 'Antoni Gaudí', ['Antonio Gaudi', 'Gaudi']],
  ['Jak nazywa się zbiór opowieści Szeherezady?', 'Księga tysiąca i jednej nocy', ['Tysiąc i jedna noc', 'Baśnie z tysiąca i jednej nocy']],
  ['Kto namalował „Krzyk”?', 'Edvard Munch', ['Munch']],
  ['Jak nazywa się krótki utwór literacki zakończony morałem?', 'Bajka'],
  ['Który polski poeta napisał „Pana Tadeusza”?', 'Adam Mickiewicz', ['Mickiewicz']],
  ['Jak nazywa się sztuka pięknego pisania?', 'Kaligrafia'],
  ['W którym mieście znajduje się opera La Scala?', 'Mediolan'],
  ['Kto stworzył postać Sherlocka Holmesa?', 'Arthur Conan Doyle', ['Conan Doyle']],
  ['Jak nazywa się kierunek malarski Moneta i Renoira?', 'Impresjonizm'],
  ['Który polski pisarz otrzymał literacką Nagrodę Nobla za 1924 rok?', 'Władysław Reymont', ['Reymont']],
  ['Jak nazywa się monumentalna budowla grobowa w starożytnym Egipcie?', 'Piramida'],
  ['Kto skomponował muzykę do baletu „Dziadek do orzechów”?', 'Piotr Czajkowski', ['Czajkowski']],
  ['Jak nazywa się sztuka tworzenia obrazów z małych kawałków szkła lub kamienia?', 'Mozaika'],
  ['Która powieść George’a Orwella opisuje Wielkiego Brata?', 'Rok 1984', ['1984']],
  ['Jak nazywa się tradycyjny teatr lalek w Indonezji?', 'Wayang'],
  ['Kto wyrzeźbił „Myśliciela”?', 'Auguste Rodin', ['Rodin']],
  ['Jak nazywa się część teatru przeznaczona dla widowni?', 'Widownia', ['audytorium']],
  ['Który polski malarz stworzył „Bitwę pod Grunwaldem”?', 'Jan Matejko', ['Matejko']],
];

export const CULTURE_QUESTIONS = buildQuestions('culture', 'culture', facts);
