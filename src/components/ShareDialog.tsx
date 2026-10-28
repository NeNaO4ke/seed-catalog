import { useEffect, useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';
import QRCode from 'qrcode';

type ShareDialogProps = {
  url: string;
  onClose: () => void;
};

export default function ShareDialog({ url, onClose }: ShareDialogProps) {
  const [qrCode, setQrCode] = useState('');
  const [qrError, setQrError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 240,
      margin: 1,
      color: { dark: '#243329', light: '#ffffff' }
    }).then(dataUrl => {
      if (active) setQrCode(dataUrl);
    }).catch(error => {
      if (active) setQrError(error instanceof Error ? error.message : String(error));
    });
    return () => {
      active = false;
    };
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage('Посилання скопійовано');
    } catch (error) {
      setCopyMessage(`Не вдалося скопіювати посилання. Скопіюйте його вручну з поля вище. ${error instanceof Error ? error.message : ''}`.trim());
    }
  };

  return (
    <div className="modal-backdrop share-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
        <button type="button" className="close-btn share-dialog-close" onClick={onClose} aria-label="Закрити діалог">
          <X size={20} />
        </button>
        <div className="share-dialog-heading">
          <span className="share-dialog-icon"><Share2 size={20} /></span>
          <p>Квіткова комора</p>
          <h2 id="share-dialog-title">Насіння квітів</h2>
        </div>
        <label className="share-link-label" htmlFor="share-site-url">Посилання на сайт</label>
        <div className="share-link-row">
          <input
            id="share-site-url"
            type="url"
            value={url}
            readOnly
            onFocus={event => event.currentTarget.select()}
          />
          <button type="button" className="btn btn-primary share-copy-button" onClick={() => void copyLink()}>
            {copyMessage === 'Посилання скопійовано' ? <Check size={16} /> : <Copy size={16} />}
            <span>Скопіювати</span>
          </button>
        </div>
        {copyMessage && <p className="share-status" role="status">{copyMessage}</p>}
        <div className="share-qr-section">
          <h3>Відкрийте сайт камерою</h3>
          {qrCode
            ? <img className="share-qr-code" src={qrCode} alt={`QR-код посилання ${url}`} />
            : qrError
              ? <p className="share-qr-error" role="alert">Не вдалося створити QR-код: {qrError}</p>
              : <div className="share-qr-loading" aria-label="Створюємо QR-код" />}
          <p>Відскануйте QR-код, щоб перейти до каталогу.</p>
        </div>
      </section>
    </div>
  );
}
