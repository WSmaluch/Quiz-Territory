import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Jakie wydarzenie symbolizuje data na ilustracji?', 'Chrzest Polski', ['chrzest polski w 966 roku'], 'Chrzest Mieszka I jest tradycyjnie datowany na 966 rok.', '966'],
  ['Jak nazywała się bitwa oznaczona datą na ilustracji?', 'Bitwa pod Grunwaldem', ['Grunwald'], 'Wojska polsko-litewskie zwyciężyły zakon krzyżacki w 1410 roku.', '1410'],
  ['Która rewolucja rozpoczęła się w roku pokazanym na ilustracji?', 'Rewolucja francuska', ['rewolucja we Francji'], undefined, '1789'],
  ['Jak nazywał się dokument uchwalony w Polsce w dacie z ilustracji?', 'Konstytucja 3 maja', ['Konstytucja Trzeciego Maja'], undefined, '3 MAJA 1791'],
  ['Jakie wydarzenie rozpoczęło się 1 września roku z ilustracji?', 'II wojna światowa', ['druga wojna światowa'], undefined, '1939'],
  ['Który mur europejski upadł w roku pokazanym na ilustracji?', 'Mur Berliński', ['mur berliński'], undefined, '1989'],
  ['Jak nazywało się starożytne państwo kojarzone z symbolem SPQR?', 'Cesarstwo Rzymskie', ['Imperium Rzymskie', 'starożytny Rzym'], undefined, 'SPQR'],
  ['Która cywilizacja posługiwała się pismem hieroglificznym?', 'Starożytny Egipt', ['Egipt'], undefined, 'HIEROGLIFY'],
  ['Kto był pierwszym koronowanym królem Polski?', 'Bolesław Chrobry'],
  ['W którym wieku Krzysztof Kolumb dotarł do Ameryki?', 'XV wiek', ['15 wiek', 'piętnasty wiek']],
  ['Jak nazywała się wojna między Atenami a Spartą?', 'Wojna peloponeska'],
  ['Który polski król przeniósł dwór z Krakowa do Warszawy?', 'Zygmunt III Waza', ['Zygmunt Trzeci Waza']],
  ['Jak nazywano epokę odrodzenia kultury antycznej?', 'Renesans', ['odrodzenie']],
  ['Kto dowodził wojskami polskimi pod Wiedniem w 1683 roku?', 'Jan III Sobieski', ['Jan Sobieski']],
  ['Jak nazywał się statek Karola Darwina?', 'HMS Beagle', ['Beagle']],
  ['W którym roku Polska odzyskała niepodległość po zaborach?', '1918', ['11 listopada 1918']],
  ['Jak nazywało się powstanie rozpoczęte w Warszawie 1 sierpnia 1944 roku?', 'Powstanie Warszawskie'],
  ['Która dynastia panowała w Polsce przed Jagiellonami?', 'Piastowie', ['dynastia Piastów']],
  ['Jak nazywał się pierwszy cesarz rzymski?', 'Oktawian August', ['August', 'Cezar August']],
  ['Które miasto zostało zasypane przez Wezuwiusz w 79 roku?', 'Pompeje'],
  ['Kto był przywódcą wyprawy, która jako pierwsza opłynęła Ziemię?', 'Ferdynand Magellan', ['Magellan']],
  ['Jak nazywał się traktat kończący I wojnę światową z Niemcami?', 'Traktat wersalski', ['pokój wersalski']],
  ['Który władca wydał Wielką Kartę Swobód w 1215 roku?', 'Jan bez Ziemi', ['król Jan']],
  ['Jak nazywała się stolica Imperium Bizantyjskiego?', 'Konstantynopol', ['Bizancjum']],
  ['Który zakon zbudował zamek w Malborku?', 'Krzyżacy', ['zakon krzyżacki']],
  ['Jak nazywała się polityka przebudowy ZSRR Michaiła Gorbaczowa?', 'Pierestrojka', ['perestrojka']],
  ['Kto ogłosił 95 tez w Wittenberdze?', 'Marcin Luter', ['Martin Luther']],
  ['Jak nazywano szlak handlowy łączący Chiny z Europą?', 'Jedwabny Szlak', ['Szlak Jedwabny']],
  ['Które miasto było stolicą Polski przed Krakowem?', 'Gniezno'],
  ['Jak nazywał się plan odbudowy Europy po II wojnie światowej finansowany przez USA?', 'Plan Marshalla', ['Marshall Plan']],
];

export const HISTORY_QUESTIONS = buildQuestions('history', 'history', facts);
