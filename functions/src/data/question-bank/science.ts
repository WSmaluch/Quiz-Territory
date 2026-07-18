import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Jaki pierwiastek ma symbol pokazany na ilustracji?', 'Złoto', [], undefined, 'Au'],
  ['Która planeta jest oznaczona jako czwarta od Słońca?', 'Mars', [], undefined, '4. PLANETA'],
  ['Jak nazywa się cząsteczka przedstawiona wzorem H₂O?', 'Woda', ['tlenek wodoru'], undefined, 'H₂O'],
  ['Jak nazywa się siła oznaczona symbolem g i wartością około 9,81 m/s²?', 'Grawitacja', ['siła grawitacji', 'przyspieszenie ziemskie'], undefined, 'g ≈ 9,81 m/s²'],
  ['Która część komórki zawiera większość materiału genetycznego?', 'Jądro komórkowe', ['jądro'], undefined, 'DNA → ?'],
  ['Jak nazywa się proces oznaczony równaniem CO₂ + H₂O + światło → glukoza + O₂?', 'Fotosynteza', [], undefined, 'CO₂ + H₂O + ŚWIATŁO'],
  ['Który gaz stanowi około 78% ziemskiej atmosfery?', 'Azot', [], undefined, '78% ATMOSFERY'],
  ['Jak nazywa się galaktyka, w której znajduje się Układ Słoneczny?', 'Droga Mleczna', [], undefined, 'NASZA GALAKTYKA'],
  ['Jaka jest jednostka natężenia prądu elektrycznego?', 'Amper', ['A']],
  ['Ile chromosomów ma typowa ludzka komórka somatyczna?', '46', ['czterdzieści sześć']],
  ['Jak nazywa się przejście cieczy w gaz?', 'Parowanie'],
  ['Kto sformułował teorię względności?', 'Albert Einstein', ['Einstein']],
  ['Jaki organ pompuje krew w organizmie człowieka?', 'Serce'],
  ['Jak nazywa się najtwardsza naturalna substancja?', 'Diament'],
  ['Która witamina powstaje w skórze pod wpływem światła słonecznego?', 'Witamina D', ['D']],
  ['Jak nazywa się podstawowa jednostka dziedziczenia?', 'Gen'],
  ['Ile wynosi prędkość światła w próżni w przybliżeniu?', '300 000 km/s', ['300000 km/s', '3 razy 10 do 8 m/s']],
  ['Jaki pierwiastek ma liczbę atomową 1?', 'Wodór'],
  ['Jak nazywa się nauka o trzęsieniach ziemi?', 'Sejsmologia'],
  ['Która planeta ma najbardziej widoczny system pierścieni?', 'Saturn'],
  ['Jak nazywa się podział komórki prowadzący do powstania dwóch identycznych komórek?', 'Mitoza'],
  ['Jaka skala służy do określania kwasowości roztworu?', 'Skala pH', ['pH']],
  ['Jak nazywa się zjawisko rozszczepienia światła białego na barwy?', 'Dyspersja', ['rozszczepienie światła']],
  ['Który metal jest ciekły w temperaturze pokojowej?', 'Rtęć'],
  ['Jak nazywa się najmniejsza kość w ciele człowieka?', 'Strzemiączko'],
  ['Ile księżyców ma Ziemia?', 'Jeden', ['1']],
  ['Jak nazywa się warstwa atmosfery pochłaniająca większość promieniowania UV?', 'Warstwa ozonowa', ['ozonosfera']],
  ['Która zasada dynamiki opisuje akcję i reakcję?', 'Trzecia zasada dynamiki Newtona', ['III zasada Newtona', 'trzecia zasada Newtona']],
  ['Jak nazywa się temperatura, poniżej której nie można schłodzić materii?', 'Zero absolutne', ['zero bezwzględne']],
  ['Jaki typ wiązania powstaje przez wspólną parę elektronową?', 'Wiązanie kowalencyjne', ['kowalencyjne']],
];

export const SCIENCE_QUESTIONS = buildQuestions('science', 'science', facts);
