import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Jak nazywa się układ zapobiegający blokowaniu kół podczas hamowania?', 'ABS', ['system ABS'], undefined, 'KOŁO + HAMOWANIE'],
  ['Jaki typ napędu oznacza skrót 4×4?', 'Napęd na cztery koła', ['napęd 4x4', 'AWD'], undefined, '4 × 4'],
  ['Jak nazywa się silnik, w którym zapłon następuje od sprężenia?', 'Silnik Diesla', ['diesel', 'silnik wysokoprężny'], undefined, 'ZAPŁON SAMOCZYNNY'],
  ['Który przyrząd pokazuje prędkość pojazdu?', 'Prędkościomierz', ['szybkościomierz'], undefined, 'km/h'],
  ['Jak nazywa się część tłumiąca nierówności wraz ze sprężyną?', 'Amortyzator', [], undefined, 'TŁUMIENIE DRGAŃ'],
  ['Co oznacza kontrolka z symbolem oliwiarki?', 'Niskie ciśnienie oleju', ['problem z ciśnieniem oleju', 'olej silnikowy'], undefined, 'OLIWIARKA'],
  ['Jak nazywa się urządzenie doładowujące silnik energią spalin?', 'Turbosprężarka', ['turbo'], undefined, 'SPALINY → WIĘCEJ POWIETRZA'],
  ['Która firma stworzyła model 911?', 'Porsche', [], undefined, 'MODEL 911'],
  ['Jak nazywa się pedał sterujący dopływem paliwa lub mocą silnika?', 'Pedał przyspieszenia', ['gaz', 'pedał gazu']],
  ['Który element magazynuje energię elektryczną potrzebną do rozruchu?', 'Akumulator'],
  ['Jak nazywa się mieszanina płynu chłodniczego odporna na zamarzanie?', 'Płyn niezamarzający', ['antifreeze', 'płyn chłodniczy']],
  ['Co mierzy licznik obrotów?', 'Obroty silnika', ['prędkość obrotową silnika', 'RPM']],
  ['Jak nazywa się część łącząca silnik ze skrzynią biegów w aucie manualnym?', 'Sprzęgło'],
  ['Która marka produkowała model Garbus?', 'Volkswagen', ['VW']],
  ['Jak nazywa się rodzaj nadwozia z dużą klapą bagażnika i składanymi siedzeniami?', 'Hatchback'],
  ['Co oznacza skrót VIN?', 'Vehicle Identification Number', ['numer identyfikacyjny pojazdu']],
  ['Jak nazywa się tor wyścigowy o zamkniętej pętli?', 'Autodrom', ['tor wyścigowy']],
  ['Który element oczyszcza spaliny z części szkodliwych związków?', 'Katalizator', ['konwerter katalityczny']],
  ['Jak nazywa się zjawisko utraty przyczepności na warstwie wody?', 'Aquaplaning', ['akwaplanacja']],
  ['Która marka stworzyła model Mustang?', 'Ford'],
  ['Jak nazywa się paliwo oznaczane skrótem LPG?', 'Autogaz', ['gaz płynny', 'propan-butan']],
  ['Co oznacza litera P na automatycznej skrzyni biegów?', 'Parkowanie', ['parking']],
  ['Jak nazywa się element układu kierowniczego przekazujący ruch na koła?', 'Przekładnia kierownicza', ['maglownica']],
  ['Który konstruktor założył firmę produkującą Model T?', 'Henry Ford', ['Ford']],
  ['Jak nazywa się samochód łączący silnik spalinowy i elektryczny?', 'Hybryda', ['samochód hybrydowy']],
  ['Co oznacza skrót ESP w samochodzie?', 'Elektroniczny program stabilizacji', ['system stabilizacji toru jazdy']],
  ['Jak nazywa się przestrzeń silnika, do której trafia mieszanka przed zapłonem?', 'Komora spalania'],
  ['Która marka produkuje model Corolla?', 'Toyota'],
  ['Jak nazywa się metalowy element felgi i opony tworzący koło?', 'Felga'],
  ['Który parametr silnika mierzy się w niutonometrach?', 'Moment obrotowy', ['moment silnika']],
];

export const AUTOMOTIVE_QUESTIONS = buildQuestions('automotive', 'automotive', facts);
