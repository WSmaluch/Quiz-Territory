import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Jaki instrument ma standardowo 88 klawiszy?', 'Fortepian', ['pianino'], undefined, '88 KLAWISZY'],
  ['Który zespół wydał album „Abbey Road”?', 'The Beatles', ['Beatles'], undefined, 'ABBEY ROAD'],
  ['Jak nazywa się klucz muzyczny przypominający ozdobną literę G?', 'Klucz wiolinowy', [], undefined, '𝄞 = G'],
  ['Z którym kompozytorem kojarzy się „Oda do radości”?', 'Ludwig van Beethoven', ['Beethoven'], undefined, 'ODA DO RADOŚCI'],
  ['Jak nazywa się polski taniec narodowy w metrum 3/4, często otwierający bale?', 'Polonez', [], undefined, '3/4 · OTWARCIE BALU'],
  ['Która wokalistka nagrała album „21”?', 'Adele', [], undefined, 'ALBUM 21'],
  ['Jak nazywa się najniższy męski głos wokalny?', 'Bas', [], undefined, 'NAJNIŻSZY GŁOS'],
  ['Z jakiego kraju pochodzi muzyka reggae?', 'Jamajka', [], undefined, 'REGGAE'],
  ['Kto skomponował „Cztery pory roku”?', 'Antonio Vivaldi', ['Vivaldi']],
  ['Jak nazywał się lider zespołu Queen?', 'Freddie Mercury', ['Freddy Mercury']],
  ['Ile linii ma standardowa pięciolinia?', 'Pięć', ['5']],
  ['Który polski kompozytor jest patronem konkursu pianistycznego w Warszawie?', 'Fryderyk Chopin', ['Chopin']],
  ['Jak nazywa się instrument dęty blaszany używany do sygnałów wojskowych?', 'Trąbka'],
  ['Który zespół nagrał „Smells Like Teen Spirit”?', 'Nirvana'],
  ['Jak nazywa się hymn Unii Europejskiej?', 'Oda do radości'],
  ['Kto skomponował operę „Czarodziejski flet”?', 'Wolfgang Amadeus Mozart', ['Mozart']],
  ['Jak nazywa się szybkie powtarzanie jednego dźwięku?', 'Tremolo'],
  ['Która polska wokalistka śpiewała „Nic dwa razy”?', 'Sanah', ['sanah']],
  ['Jak nazywa się sześciostrunowy instrument szarpany popularny w rocku?', 'Gitara'],
  ['Który artysta nagrał album „Thriller”?', 'Michael Jackson'],
  ['Jak nazywa się grupa muzyków grających utwory symfoniczne?', 'Orkiestra symfoniczna', ['orkiestra']],
  ['Z jakim gatunkiem muzycznym kojarzony jest Louis Armstrong?', 'Jazz'],
  ['Jak nazywa się znak podwyższający dźwięk o pół tonu?', 'Krzyżyk', ['diesis']],
  ['Który polski zespół nagrał „Autobiografię”?', 'Perfect'],
  ['Jak nazywa się forma muzyczna przeznaczona dla solisty i orkiestry?', 'Koncert'],
  ['Kto skomponował balet „Jezioro łabędzie”?', 'Piotr Czajkowski', ['Czajkowski']],
  ['Jak nazywa się muzyczny przedział ośmiu kolejnych stopni?', 'Oktawa'],
  ['Który zespół wykonywał „Bohemian Rhapsody”?', 'Queen'],
  ['Jak nazywa się tradycyjny szkocki instrument z workiem powietrznym?', 'Dudy'],
  ['Który polski kompozytor stworzył „Krzesanego”?', 'Wojciech Kilar', ['Kilar']],
];

export const MUSIC_QUESTIONS = buildQuestions('music', 'music', facts);
