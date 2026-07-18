import { buildQuestions } from './helpers';
import type { QuestionFact } from './types';

const facts: QuestionFact[] = [
  ['Jak rozwija się skrót widoczny na ilustracji?', 'Central Processing Unit', ['procesor', 'jednostka centralna'], undefined, 'CPU'],
  ['Jaki system liczbowy używa wyłącznie cyfr 0 i 1?', 'System binarny', ['system dwójkowy'], undefined, '0 · 1'],
  ['Jak nazywa się protokół bezpiecznych stron internetowych oznaczony kłódką?', 'HTTPS', [], undefined, '🔒 HTTPS'],
  ['Ile bitów tworzy jeden bajt?', 'Osiem', ['8'], undefined, '1 BAJT = ? BITÓW'],
  ['Jak nazywa się kod graficzny złożony z czarnych i białych modułów?', 'Kod QR', ['QR code'], undefined, '▦'],
  ['Jak nazywa się urządzenie widoczne na zdjęciu, które tworzy obiekty warstwa po warstwie?', 'Drukarka 3D', ['drukarka trójwymiarowa'], undefined, 'DRUK WARSTWOWY'],
  ['Jak nazywa się pamięć robocza komputera oznaczana skrótem z ilustracji?', 'RAM', ['pamięć RAM'], undefined, 'RAM'],
  ['Który język służy do opisywania struktury stron WWW?', 'HTML', [], undefined, '<HTML>'],
  ['Kto jest twórcą World Wide Web?', 'Tim Berners-Lee', ['Tim Berners Lee']],
  ['Jak nazywa się urządzenie kierujące pakiety między sieciami?', 'Router'],
  ['Co oznacza skrót USB?', 'Universal Serial Bus'],
  ['Jak nazywa się system operacyjny z maskotką pingwinem Tux?', 'Linux'],
  ['Która firma opracowała system Android?', 'Google'],
  ['Jak nazywa się szyfrowanie, w którym używa się pary kluczy publicznego i prywatnego?', 'Szyfrowanie asymetryczne', ['kryptografia asymetryczna']],
  ['Co mierzy częstotliwość taktowania procesora?', 'Liczbę cykli na sekundę', ['cykle na sekundę']],
  ['Jak nazywa się kopia danych służąca do ich odtworzenia?', 'Kopia zapasowa', ['backup']],
  ['Który protokół służy do tłumaczenia nazw domen na adresy IP?', 'DNS'],
  ['Jak nazywa się oprogramowanie o publicznie dostępnym kodzie źródłowym?', 'Open source', ['otwarte oprogramowanie', 'oprogramowanie otwartoźródłowe']],
  ['Co oznacza skrót AI?', 'Sztuczna inteligencja', ['Artificial Intelligence']],
  ['Jak nazywa się najmniejszy element obrazu rastrowego?', 'Piksel', ['pixel']],
  ['Który format archiwum zwykle ma rozszerzenie .zip?', 'ZIP', ['archiwum ZIP']],
  ['Jak nazywa się usługa przechowywania danych na zdalnych serwerach?', 'Chmura obliczeniowa', ['chmura', 'cloud computing']],
  ['Jaki język stylów współpracuje z HTML?', 'CSS'],
  ['Jak nazywa się złośliwe oprogramowanie żądające okupu?', 'Ransomware'],
  ['Co oznacza skrót GPS?', 'Global Positioning System', ['globalny system pozycjonowania']],
  ['Jak nazywa się kontrolowany zbiór zmian w kodzie przechowywany w Git?', 'Commit', ['zatwierdzenie']],
  ['Jaka jednostka jest tysiąc razy większa od megabajta w systemie dziesiętnym?', 'Gigabajt', ['GB']],
  ['Jak nazywa się bezprzewodowy standard krótkiego zasięgu używany przez słuchawki?', 'Bluetooth'],
  ['Który element komputera długotrwale przechowuje pliki: RAM czy dysk?', 'Dysk', ['dysk twardy', 'SSD']],
  ['Jak nazywa się metoda uwierzytelniania wymagająca dwóch niezależnych składników?', 'Uwierzytelnianie dwuskładnikowe', ['2FA', 'uwierzytelnianie dwuczynnikowe']],
];

export const TECHNOLOGY_QUESTIONS = buildQuestions('technology', 'technology', facts);
