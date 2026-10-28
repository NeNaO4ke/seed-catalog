import { useEffect } from 'react';
import { Check, Cloud, HardDrive, LoaderCircle, X } from 'lucide-react';

export type CatalogMode = 'local' | 'online';

type CatalogModeDialogProps = {
  mode: CatalogMode;
  isLoading: boolean;
  error: string;
  onClose: () => void;
  onSelect: (mode: CatalogMode) => void;
};

export default function CatalogModeDialog({ mode, isLoading, error, onClose, onSelect }: CatalogModeDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onClose]);

  return (
    <div className="modal-backdrop catalog-mode-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !isLoading) onClose();
    }}>
      <section className="catalog-mode-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-mode-title">
        <div className="catalog-mode-header">
          <div><h2 id="catalog-mode-title">Режим каталогу</h2><p>Поточний режим: <strong>{mode === 'local' ? 'Локальний' : 'Онлайн'}</strong></p></div>
          <button type="button" className="close-btn" onClick={onClose} disabled={isLoading} aria-label="Закрити"><X size={20} /></button>
        </div>
        <div className="catalog-mode-options">
          <button type="button" className={`catalog-mode-option${mode === 'local' ? ' active' : ''}`} disabled={isLoading || mode === 'local'} onClick={() => onSelect('local')}>
            <HardDrive size={20} />
            <span><strong>Локальний</strong><small>Редагування, імпорт і експорт. Поточний каталог зберігається на цьому пристрої.</small></span>
            {mode === 'local' && <Check size={17} />}
          </button>
          <button type="button" className={`catalog-mode-option${mode === 'online' ? ' active' : ''}`} disabled={isLoading || (mode === 'online' && !error)} onClick={() => onSelect('online')}>
            {isLoading ? <LoaderCircle className="mode-spinner" size={20} /> : <Cloud size={20} />}
            <span><strong>Онлайн</strong><small>{mode === 'online' && error ? 'Натисніть, щоб повторити завантаження.' : 'Каталог завантажується з опублікованої Google Таблиці. Редагування вимкнене.'}</small></span>
            {mode === 'online' && !isLoading && !error && <Check size={17} />}
          </button>
        </div>
        {isLoading && <p className="catalog-mode-status" role="status">Завантажую онлайн-каталог…</p>}
        {error && <p className="catalog-mode-error" role="alert">{error}</p>}
        <div className="catalog-mode-footer">
          <button type="button" className="btn btn-light" onClick={onClose} disabled={isLoading}>Закрити</button>
        </div>
      </section>
    </div>
  );
}
