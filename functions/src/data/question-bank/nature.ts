import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Jakie zwierzę jest największym żyjącym ssakiem?', 'Płetwal błękitny', ['wieloryb błękitny'], undefined, 'NAJWIĘKSZY SSAK'],
  ['Który ptak nie lata, ale jest doskonałym pływakiem i żyje na półkuli południowej?', 'Pingwin', [], undefined, 'PTAK + PŁYWANIE'],
  ['Jak nazywa się proces zrzucania starego pancerza przez stawonogi?', 'Linienie', [], undefined, 'NOWY PANCERZ'],
  ['Które drzewo rodzi żołędzie?', 'Dąb', [], undefined, 'ŻOŁĘDZIE'],
  ['Jak nazywa się zwierzę znane z czarno-białych pasów?', 'Zebra', [], undefined, 'CZARNE + BIAŁE PASY'],
  ['Który owad wytwarza miód?', 'Pszczoła miodna', ['pszczoła'], undefined, 'MIÓD'],
  ['Jak nazywa się największy kot żyjący współcześnie?', 'Tygrys', [], undefined, 'NAJWIĘKSZY KOT'],
  ['Która roślina pustynna magazynuje wodę w grubych łodygach?', 'Kaktus', [], undefined, 'WODA W ŁODYDZE'],
  ['Jak nazywa się przemiana gąsienicy w motyla?', 'Metamorfoza', ['przeobrażenie zupełne']],
  ['Który ssak składa jaja i ma kaczy dziób?', 'Dziobak'],
  ['Jak nazywa się warstwa lasu tworzona przez korony najwyższych drzew?', 'Korona drzew', ['warstwa koron', 'okap']],
  ['Który kontynent jest naturalnym środowiskiem żyraf?', 'Afryka'],
  ['Jak nazywa się symbioza grzyba i glonu?', 'Porost'],
  ['Która ryba potrafi nadmuchać ciało w obronie?', 'Rozdymka'],
  ['Jak nazywa się zimowy sen zwierząt?', 'Hibernacja'],
  ['Który ssak jest jedynym zdolnym do aktywnego lotu?', 'Nietoperz'],
  ['Jak nazywa się największa rafa koralowa świata?', 'Wielka Rafa Koralowa'],
  ['Co jest podstawowym pokarmem pandy wielkiej?', 'Bambus'],
  ['Jak nazywa się grupa wilków?', 'Wataha'],
  ['Który ptak jest symbolem pokoju?', 'Gołąb', ['gołąb biały']],
  ['Jak nazywa się nauka o grzybach?', 'Mykologia'],
  ['Które zwierzę lądowe osiąga największą prędkość?', 'Gepard'],
  ['Jak nazywa się samica jelenia?', 'Łania'],
  ['Który organ rośliny najczęściej odpowiada za fotosyntezę?', 'Liść', ['liście']],
  ['Jak nazywa się okres godowy jeleni?', 'Rykowisko'],
  ['Który gad zmienia barwę skóry m.in. w komunikacji i termoregulacji?', 'Kameleon'],
  ['Jak nazywa się organizm żywiący się martwą materią organiczną?', 'Saprotrof', ['destruent']],
  ['Które zwierzę buduje tamy na rzekach?', 'Bóbr'],
  ['Jak nazywa się największy żyjący ptak?', 'Struś afrykański', ['struś']],
  ['Która część kwiatu wytwarza pyłek?', 'Pręcik', ['pręciki']],
];

export const NATURE_QUESTIONS = buildQuestions('nature', 'nature', facts);
