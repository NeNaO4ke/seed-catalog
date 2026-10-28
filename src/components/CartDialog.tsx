import { useEffect, useState } from 'react';
import { ArrowLeft, Clipboard, Mail, Minus, Phone, Plus, Send, ShoppingCart, Trash2, X } from 'lucide-react';
import { getSeedPriceOptions, type Seed } from '../types/seed';
import type { CartLine } from '../types/cart';

type CartDialogProps = {
  seeds: Seed[];
  lines: CartLine[];
  formatPrice: (price: number) => string;
  recipientEmail: string;
  orderSubject: string;
  telegramChatUrl: string;
  onClose: () => void;
  onQuantityChange: (seedId: string, packaging: string, quantity: number) => void;
  onRemove: (seedId: string, packaging: string) => void;
};

export default function CartDialog({
  seeds,
  lines,
  formatPrice,
  recipientEmail,
  orderSubject,
  telegramChatUrl,
  onClose,
  onQuantityChange,
  onRemove
}: CartDialogProps) {
  const [copyMessage, setCopyMessage] = useState('');
  const [orderMethod, setOrderMethod] = useState<'email' | 'telegram' | null>(null);
  const [showOrderText, setShowOrderText] = useState(false);
  const [contactMethods, setContactMethods] = useState<Array<'Telegram' | 'Viber'>>([]);
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      root.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const items = lines.flatMap(line => {
    const seed = seeds.find(item => item.id === line.seedId);
    const option = seed && getSeedPriceOptions(seed).find(item => item.packaging === line.packaging);
    return seed && option ? [{ line, seed, option }] : [];
  });
  const total = items.reduce((sum, item) => sum + item.option.price * item.line.quantity, 0);
  const normalizedPhone = contactPhone.trim();
  const orderLines = [
    'Замовлення насіння',
    '',
    ...items.flatMap(({ line, seed, option }, index) => [
      `${index + 1}. ${seed.name} — ${line.packaging}`,
      `   Кількість: ${line.quantity} порцій`,
      `   Ціна за порцію: ${formatPrice(option.price)}`,
      `   Сума: ${formatPrice(option.price * line.quantity)}`,
      ''
    ]),
    `Разом: ${formatPrice(total)}`
  ];
  const orderText = orderLines.join('\n');
  const emailOrderText = [
    ...orderLines.slice(0, -1),
    ...(contactMethods.length ? [`Зв’язатися зі мною: ${contactMethods.join(', ')}`] : []),
    ...(contactMethods.length && normalizedPhone ? [`Телефон для зв’язку: ${normalizedPhone}`] : []),
    ...(contactMethods.length ? [''] : []),
    orderLines[orderLines.length - 1]
  ].join('\n');
  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(orderSubject)}&body=${encodeURIComponent(emailOrderText)}`;

  const copyOrderText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Текст замовлення скопійовано. Вставте його у повідомлення.');
    } catch {
      setCopyMessage('Не вдалося скопіювати. Перевірте дозвіл браузера на доступ до буфера обміну.');
    }
  };

  return (
    <div className="modal-backdrop cart-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="cart-modal cart-view-modal" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="modal-head">
          <div><h2 id="cart-title">Кошик</h2><p>{items.reduce((sum, item) => sum + item.line.quantity, 0)} порцій у кошику</p></div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Закрити кошик"><X size={20} /></button>
        </div>
        {items.length ? (
          <>
            <div className="cart-items">
              {items.map(({ line, seed, option }) => {
                const available = option.quantity;
                const overStock = line.quantity > available;
                return (
                  <article className="cart-item" key={`${line.seedId}-${line.packaging}`}>
                    <div className="cart-item-copy">
                      <strong>{seed.name}</strong>
                      <span>{line.packaging} · {formatPrice(option.price)} за порцію</span>
                      <small className={overStock ? 'cart-stock-warning' : ''}>
                        {overStock ? `Доступно лише ${available} порцій — зменште кількість` : `${available} порцій у наявності`}
                      </small>
                    </div>
                    <div className="cart-item-actions">
                      <div className="cart-quantity-controls">
                        <button type="button" aria-label={`Зменшити ${seed.name}`} onClick={() => onQuantityChange(seed.id, line.packaging, line.quantity - 1)}><Minus size={14} /></button>
                        <input type="number" min="1" max={available} value={line.quantity} onChange={event => {
                          if (event.target.value) onQuantityChange(seed.id, line.packaging, Number(event.target.value));
                        }} aria-label={`Кількість ${seed.name}`} />
                        <button type="button" aria-label={`Збільшити ${seed.name}`} onClick={() => onQuantityChange(seed.id, line.packaging, line.quantity + 1)} disabled={line.quantity >= available}><Plus size={14} /></button>
                      </div>
                      <strong className="cart-item-total">{formatPrice(option.price * line.quantity)}</strong>
                      <button type="button" className="cart-remove-button" aria-label={`Прибрати ${seed.name} з кошика`} onClick={() => onRemove(seed.id, line.packaging)}><Trash2 size={16} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="cart-total"><span>Разом</span><strong>{formatPrice(total)}</strong></div>
            {!orderMethod ? (
              <section className="order-method-picker" aria-label="Оберіть спосіб замовлення">
                <h3>Як оформити замовлення?</h3>
                <button type="button" className="order-method-option" onClick={() => { setOrderMethod('email'); setCopyMessage(''); }}>
                  <Mail size={19} /><span><strong>Замовити через електронну пошту</strong><small>Відкриється лист із готовим замовленням</small></span>
                </button>
                <button type="button" className="order-method-option" onClick={() => { setOrderMethod('telegram'); setCopyMessage(''); }}>
                  <Send size={19} /><span><strong>Замовити через Telegram</strong><small>Скопіюйте текст і надішліть його в чат</small></span>
                </button>
              </section>
            ) : (
              <section className="order-method-panel">
                <button type="button" className="order-back-button" onClick={() => { setOrderMethod(null); setShowOrderText(false); setCopyMessage(''); }}>
                  <ArrowLeft size={15} /> Обрати інший спосіб
                </button>
                {orderMethod === 'email' ? (
                  <>
                    <p className="cart-note">Лист буде підготовлено для адресата <strong>{recipientEmail}</strong>. Перевірте його та надішліть зі своєї поштової програми.</p>
                    <section className="contact-preferences" aria-labelledby="contact-preferences-title">
                      <h3 id="contact-preferences-title">Зворотній зв'язок</h3>
                      <p>Вкажіть бажаний спосіб зв’язку — це необов’язково.</p>
                      <div className="contact-method-buttons">
                        {(['Telegram', 'Viber'] as const).map(method => {
                          const selected = contactMethods.includes(method);
                          return (
                            <button
                              key={method}
                              type="button"
                              className={`contact-method-toggle${selected ? ' selected' : ''}`}
                              aria-pressed={selected}
                              onClick={() => {
                                setContactMethods(current => selected
                                  ? current.filter(item => item !== method)
                                  : [...current, method]);
                                setCopyMessage('');
                              }}
                            >
                              {method === 'Telegram' ? <Send size={15} /> : <Phone size={15} />}
                              {method}
                            </button>
                          );
                        })}
                      </div>
                      {contactMethods.length > 0 && (
                        <label className="contact-phone-field">
                          Номер телефону для зв’язку (необов’язково)
                          <input
                            type="tel"
                            autoComplete="tel"
                            value={contactPhone}
                            onChange={event => {
                              setContactPhone(event.target.value);
                              setCopyMessage('');
                            }}
                            placeholder="+380…"
                          />
                          <small>Номер буде додано до тексту замовлення для продавця.</small>
                        </label>
                      )}
                    </section>
                    <div className="order-actions email-order-actions">
                      <button type="button" className="btn btn-light" onClick={() => void copyOrderText(emailOrderText)}><Clipboard size={15} /> Скопіювати текст</button>
                      <a className="btn btn-primary" href={mailtoUrl}><Mail size={15} /> Відкрити пошту</a>
                    </div>
                    <button type="button" className="order-text-toggle" onClick={() => setShowOrderText(current => !current)}>
                      {showOrderText ? 'Сховати текст замовлення' : 'Показати текст замовлення'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="cart-note">Скопіюйте текст замовлення, відкрийте чат Telegram і вставте його у повідомлення.</p>
                    <div className="order-actions">
                      <button type="button" className="btn btn-light" onClick={() => void copyOrderText(orderText)}><Clipboard size={15} /> Скопіювати текст замовлення</button>
                      <a className="btn btn-primary" href={telegramChatUrl} target="_blank" rel="noreferrer"><Send size={15} /> Відкрити чат Telegram</a>
                    </div>
                  </>
                )}
                {showOrderText && (
                  <div className="order-text-container">
                    <label className="order-text-label" htmlFor="cart-order-text">Текст замовлення</label>
                    <textarea id="cart-order-text" className="order-text-preview" readOnly value={emailOrderText} />
                  </div>
                )}
                {copyMessage && <p className="copy-message" role="status">{copyMessage}</p>}
              </section>
            )}
          </>
        ) : (
          <div className="cart-empty"><ShoppingCart size={30} /><p>Кошик порожній</p></div>
        )}
        <div className="cart-modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>{items.length ? 'Продовжити перегляд' : 'До каталогу'}</button>
        </div>
      </section>
    </div>
  );
}
