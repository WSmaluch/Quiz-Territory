export default function QuestionBankInfo() {
  return (
    <details className="mx-auto mb-5 w-full max-w-4xl rounded-xl border border-slate-700 bg-slate-800 p-4">
      <summary className="cursor-pointer font-bold text-cyan-300">Baza pytań</summary>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><strong className="block text-xl">12</strong>Kategorie</div>
        <div><strong className="block text-xl">360</strong>Pytania</div>
        <div><strong className="block text-xl">96</strong>Pytania obrazkowe</div>
        <div><strong className="block text-xl">0</strong>Wyłączone / brakujące</div>
      </div>
      <h2 className="mt-5 font-bold">Licencje i autorzy zdjęć</h2>
      <p className="mt-1 text-sm text-slate-300">
        Każdy obraz pochodzi z Wikimedia Commons i ma osobno zweryfikowanego autora, stronę źródłową oraz licencję.
        Pełna atrybucja jest widoczna prowadzącemu przy aktualnym pytaniu. Pliki są zapisane lokalnie i podczas gry nie wymagają internetu.
      </p>
    </details>
  );
}
