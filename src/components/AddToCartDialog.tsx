import { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { getSeedPriceOptions, type Seed } from '../types/seed';
import type { CartLine } from '../types/cart';

type AddToCartDialogProps = {
  seed: Seed;
  initialOptionIndex: number;
  cartLines: CartLine[];
  formatPrice: (price: number) => string;
  onClose: () => void;
  onAdd: (packaging: string, quantity: number) => void;
};

export default function AddToCartDialog({
  seed,
  initialOptionIndex,
  cartLines,
  formatPrice,
  onClose,
  onAdd
}: AddToCartDialogProps) {
  const priceOptions = getSeedPriceOptions(seed);
  const [optionIndex, setOptionIndex] = useState(Math.min(initialOptionIndex, priceOptions.length - 1));
  const [quantity, setQuantity] = useState(1);
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
  const option = priceOptions[optionIndex];
  const available = Math.max(0, option.quantity - cartLines
    .filter(line => line.seedId === seed.id && line.packaging === option.packaging)
    .reduce((sum, line) => sum + line.quantity, 0));
  const count = Math.min(Math.max(1, quantity), available);

  return (
    <div className="modal-backdrop cart-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="cart-modal add-cart-modal" role="dialog" aria-modal="true" aria-labelledby="add-cart-title">
        <div className="modal-head">
          <div><h2 id="add-cart-title">Додати до кошика</h2><p>{seed.name}</p></div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Закрити"><X size={20} /></button>
        </div>
        <label className="cart-field">
          Фасування
          <select value={optionIndex} onChange={event => {
            setOptionIndex(Number(event.target.value));
            setQuantity(1);
          }}>
            {priceOptions.map((item, index) => (
              <option key={`${item.packaging}-${index}`} value={index}>
                {item.packaging} · {formatPrice(item.price)} · {item.quantity} порцій у наявності
              </option>
            ))}
          </select>
        </label>
        <div className="cart-selection-meta">
          <span>Ціна за порцію</span><strong>{formatPrice(option.price)}</strong>
          <span>Доступно для додавання</span><strong>{available} порцій</strong>
        </div>
        <div className="cart-quantity-picker">
          <span>Кількість</span>
          <div>
            <button type="button" aria-label="Зменшити кількість" onClick={() => setQuantity(current => Math.max(1, current - 1))} disabled={quantity <= 1}><Minus size={15} /></button>
            <input type="number" min="1" max={available} step="1" value={available ? count : 0} onChange={event => setQuantity(Number(event.target.value))} aria-label="Кількість порцій" disabled={!available} />
            <button type="button" aria-label="Збільшити кількість" onClick={() => setQuantity(current => Math.min(available, current + 1))} disabled={!available || quantity >= available}><Plus size={15} /></button>
          </div>
        </div>
        <div className="cart-modal-footer">
          <button type="button" className="btn btn-light" onClick={onClose}>Скасувати</button>
          <button type="button" className="btn btn-primary" disabled={!available} onClick={() => onAdd(option.packaging, count)}>
            <ShoppingCart size={16} /> Додати · {formatPrice(option.price * count)}
          </button>
        </div>
      </section>
    </div>
  );
}
