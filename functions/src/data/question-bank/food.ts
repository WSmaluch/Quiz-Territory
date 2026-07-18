import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Z którego kraju pochodzi potrawa kojarzona z ryżem, szafranem i szeroką patelnią?', 'Hiszpania', [], undefined, 'RYŻ + SZAFRAN + PATELNIA'],
  ['Jak nazywa się japońska potrawa z zaprawionego ryżu, często podawana z rybą?', 'Sushi', [], undefined, 'RYŻ + NORI'],
  ['Który włoski deser przygotowuje się z mascarpone i kawy?', 'Tiramisu', [], undefined, 'MASCARPONE + KAWA'],
  ['Jak nazywa się meksykański sos z awokado?', 'Guacamole', [], undefined, 'AWOKADO + LIMONKA'],
  ['Z jakiego kraju pochodzi ser feta?', 'Grecja', [], undefined, 'FETA'],
  ['Jak nazywa się indyjska mieszanka przypraw często zawierająca kumin, kolendrę i kardamon?', 'Garam masala', [], undefined, 'KUMIN + KOLENDRA + KARDAMON'],
  ['Która francuska potrawa jest duszoną mieszanką warzyw z Prowansji?', 'Ratatouille', [], undefined, 'PROWANSJA + WARZYWA'],
  ['Jak nazywa się bliskowschodnia pasta z ciecierzycy i tahini?', 'Hummus', ['humus'], undefined, 'CIECIERZYCA + TAHINI'],
  ['Jak nazywa się włoski makaron w kształcie długich cienkich nitek?', 'Spaghetti'],
  ['Który składnik odpowiada za wyrastanie tradycyjnego chleba?', 'Drożdże', ['zakwas']],
  ['Jak nazywa się hiszpańska zimna zupa z pomidorów?', 'Gazpacho'],
  ['Z czego produkuje się tofu?', 'Z soi', ['soja', 'ziarna soi']],
  ['Jak nazywa się metoda gotowania żywności w szczelnej torebce w niskiej temperaturze?', 'Sous-vide', ['sous vide']],
  ['Który ser jest tradycyjnym składnikiem sałatki caprese?', 'Mozzarella'],
  ['Jak nazywa się koreańska kiszonka najczęściej przygotowywana z kapusty?', 'Kimchi'],
  ['Z jakiego zboża powstaje tradycyjna polenta?', 'Kukurydza', ['mąka kukurydziana']],
  ['Jak nazywa się przyprawa otrzymywana z wysuszonych znamion krokusa?', 'Szafran'],
  ['Która potrawa składa się z tortilli zawiniętej wokół nadzienia?', 'Burrito'],
  ['Jak nazywa się francuski sos z żółtek i masła klarowanego?', 'Sos holenderski', ['hollandaise']],
  ['Z jakiego kraju pochodzi pho?', 'Wietnam'],
  ['Jak nazywa się włoska kawa z espresso i spienionego mleka w zbliżonych proporcjach?', 'Cappuccino'],
  ['Która część rośliny cynamonowca jest przyprawą?', 'Kora'],
  ['Jak nazywa się greckie danie z warstw bakłażana i mięsa?', 'Musaka', ['moussaka']],
  ['Z czego powstaje marcepan?', 'Z migdałów i cukru', ['migdały i cukier', 'migdały']],
  ['Jak nazywa się proces brązowienia cukrów pod wpływem ciepła?', 'Karmelizacja'],
  ['Który owoc jest podstawą sosu mole poblano obok chili i przypraw: banan czy jabłko?', 'Banan', ['plantan']],
  ['Jak nazywa się arabska sałatka z natki pietruszki, bulguru i pomidorów?', 'Tabbouleh', ['tabule']],
  ['Który rodzaj ryżu jest tradycyjnie używany do risotto?', 'Arborio', ['ryż arborio']],
  ['Jak nazywa się portugalski deser w formie kruchej babeczki z kremem jajecznym?', 'Pastel de nata', ['pastéis de nata']],
  ['Z jakiego kraju pochodzi potrawa ceviche?', 'Peru'],
];

export const FOOD_QUESTIONS = buildQuestions('food', 'food', facts);
