export function duelActionErrorMessage(actionError: any, actionName: string): string {
  const message = String(actionError?.message || '');
  if (actionName === 'markWrong') {
    const code = String(actionError?.code || '').replace(/^functions\//, '');
    const developmentCode = import.meta.env.DEV && code ? ` (${code})` : '';
    return `Nie udało się oznaczyć odpowiedzi jako błędnej. Spróbuj ponownie.${developmentCode}`;
  }
  if (message.includes('No current question') || message.includes('No remaining question')) {
    return 'Brak dostępnego pytania dla tego pojedynku. Zakończ pojedynek lub wybierz inną kategorię.';
  }
  if (message.includes('timer')) {
    return 'Stan zegara pojedynku jest nieprawidłowy. Wstrzymaj pojedynek i spróbuj ponownie.';
  }
  if (message.includes('not active')) return 'Pojedynek nie jest już aktywny.';
  return message || `Nie udało się wykonać ${actionName}.`;
}
