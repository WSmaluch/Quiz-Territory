import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Którego aktora kina niemego przedstawia fotografia?', 'Charlie Chaplin', ['Charles Chaplin'], undefined, 'Charlie Chaplin'],
  ['Którą amerykańską aktorkę przedstawia fotografia?', 'Marilyn Monroe', [], undefined, 'Marilyn Monroe'],
  ['Którego reżysera filmu „Psychoza” przedstawia fotografia?', 'Alfred Hitchcock', ['Hitchcock'], undefined, 'Alfred Hitchcock'],
  ['Którego aktora, pierwszego filmowego Jamesa Bonda, przedstawia fotografia?', 'Sean Connery', [], undefined, 'Sean Connery'],
  ['Którego reżysera „Szczęk” i „E.T.” przedstawia fotografia?', 'Steven Spielberg', ['Spielberg'], undefined, 'Steven Spielberg'],
  ['Którego pioniera animacji przedstawia fotografia?', 'Walt Disney', ['Walter Disney'], undefined, 'Walt Disney'],
  ['Jak nazywa się duet komediowy przedstawiony na fotografii?', 'Flip i Flap', ['Laurel i Hardy', 'Stan Laurel i Oliver Hardy'], undefined, 'Laurel and Hardy'],
  ['Którego polskiego reżysera, twórcę „Ziemi obiecanej”, przedstawia fotografia?', 'Andrzej Wajda', ['Wajda'], undefined, 'Andrzej Wajda'],
  ['Kto wyreżyserował film „Pianista”?', 'Roman Polański', ['Roman Polanski']],
  ['Jak nazywa się główny bohater trylogii „Matrix”?', 'Neo', ['Thomas Anderson']],
  ['Który aktor zagrał Forresta Gumpa?', 'Tom Hanks'],
  ['Jak nazywa się hobbit niosący Pierścień do Mordoru?', 'Frodo Baggins', ['Frodo']],
  ['Który film Stevena Spielberga przedstawia park z dinozaurami?', 'Park Jurajski', ['Jurassic Park']],
  ['Jak nazywa się serial o nauczycielu chemii Walterze White?', 'Breaking Bad'],
  ['Kto wyreżyserował „Ojca chrzestnego”?', 'Francis Ford Coppola', ['Coppola']],
  ['Jak ma na imię archeolog grany przez Harrisona Forda?', 'Indiana Jones', ['Indiana']],
  ['Który film zdobył pierwszego Oscara dla polskiego filmu nieanglojęzycznego?', 'Ida'],
  ['Jak nazywa się hotel z filmu „Lśnienie”?', 'Overlook Hotel', ['Hotel Overlook']],
  ['Kto stworzył serial animowany „Simpsonowie”?', 'Matt Groening'],
  ['Jak nazywa się fikcyjny metal w świecie Marvela, z którego wykonano tarczę Kapitana Ameryki?', 'Vibranium'],
  ['W którym filmie pada zdanie „I’ll be back”?', 'Terminator', ['The Terminator']],
  ['Jak nazywa się zielony ogr z filmów studia DreamWorks?', 'Shrek'],
  ['Kto zagrał Jacka Sparrowa?', 'Johnny Depp'],
  ['Jak nazywa się kawiarnia z serialu „Przyjaciele”?', 'Central Perk'],
  ['Który reżyser stworzył filmy „Incepcja” i „Interstellar”?', 'Christopher Nolan', ['Nolan']],
  ['Jak nazywa się robot z filmu Pixara pozostawiony na Ziemi?', 'WALL-E', ['Wall E', 'Walle']],
  ['Który polski reżyser nakręcił „Ziemię obiecaną”?', 'Andrzej Wajda'],
  ['Jak nazywa się planeta zamieszkana przez Na’vi w „Avatarze”?', 'Pandora'],
  ['Który film opowiada o bokserze Rockym Balboa?', 'Rocky'],
  ['Jak nazywa się serialowa rodzina mieszkająca w Springfield?', 'Simpsonowie', ['rodzina Simpsonów']],
];

export const MOVIES_QUESTIONS = buildQuestions('movies', 'movies', facts);
