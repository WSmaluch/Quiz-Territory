import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuestionMediaView from './QuestionMediaView';

const media = { url: '/question-images/1234567890abcdef.webp', alt: 'Neutralna ilustracja do pytania' };

describe('QuestionMediaView', () => {
  it('renders image on a player phone and supports zoom', () => {
    render(<QuestionMediaView media={media} variant="player" />);
    const image = screen.getByAltText(media.alt);
    fireEvent.load(image);
    expect(screen.getByText('Dotknij zdjęcia, aby je powiększyć.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Powiększ zdjęcie' }));
    expect(screen.getByRole('button', { name: 'Zamknij powiększenie' })).toBeInTheDocument();
  });

  it('shows a finite Polish error state and informs the host callback', () => {
    const onImageError = vi.fn();
    render(<QuestionMediaView media={media} variant="host" onImageError={onImageError} />);
    fireEvent.error(screen.getByAltText(media.alt));
    expect(screen.getByText('Nie udało się wyświetlić zdjęcia.')).toBeInTheDocument();
    expect(screen.queryByText('Ładowanie zdjęcia…')).not.toBeInTheDocument();
    expect(onImageError).toHaveBeenCalledOnce();
  });

  it('does not reserve empty space for a text-only question', () => {
    const { container } = render(<QuestionMediaView />);
    expect(container).toBeEmptyDOMElement();
  });
});
