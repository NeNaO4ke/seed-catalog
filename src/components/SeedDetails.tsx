import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FileText, ShoppingCart, Sprout, Sun, X } from 'lucide-react';
import SeedTagIcon from './SeedTagIcon';
import { formatFloweringPeriod, formatSowingPeriods, getSeedCutHarvest, getSeedGrowingDifficulty, getSeedImageEntries, getSeedPriceOptions, getSeedSecondaryTags, getSeedTagKind, getSeedTags, seedGrowingDifficultyLabels, type Seed } from '../types/seed';
import { getCartQuantity, type CartLine } from '../types/cart';

type TaxonomyField = 'family' | 'subfamily' | 'tribe' | 'genus';
type SeedDetailsProps = {
  seed: Seed;
  onClose: () => void;
  formatPrice: (price: number) => string;
  onTaxonomyFilter: (field: TaxonomyField, seed: Seed) => void;
  onTagFilter: (tag: string) => void;
  cartLines: CartLine[];
  onAddToCart: (seed: Seed, optionIndex: number) => void;
  allowOrdering: boolean;
};

const formatPhotoDate = (date: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : new Intl.DateTimeFormat('uk-UA').format(parsedDate);
};

export default function SeedDetails({ seed, onClose, formatPrice, onTaxonomyFilter, onTagFilter, cartLines, onAddToCart, allowOrdering }: SeedDetailsProps) {
  const images = getSeedImageEntries(seed);
  const priceOptions = getSeedPriceOptions(seed);
  const tags = [
    ...getSeedTags(seed).map(tag => ({ tag, secondary: false })),
    ...getSeedSecondaryTags(seed).map(tag => ({ tag, secondary: true }))
  ];
  const floweringPeriod = formatFloweringPeriod(seed);
  const sowingPeriods = formatSowingPeriods(seed);
  const cutHarvest = getSeedCutHarvest(seed);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isPhotoDescriptionExpanded, setIsPhotoDescriptionExpanded] = useState(false);
  const [expandedSowingPeriods, setExpandedSowingPeriods] = useState<number[]>([]);
  const selectedPhoto = images[selectedImage];
  const thumbnailStart = Math.min(Math.max(0, selectedImage - 5), Math.max(0, images.length - 6));

  useEffect(() => {
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isImageExpanded) setIsImageExpanded(false);
        else onClose();
      } else if (isImageExpanded && images.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        setSelectedImage(current => (current + (event.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length);
        setIsPhotoDescriptionExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, isImageExpanded, onClose]);

  const expandImage = () => {
    if (window.matchMedia('(min-width: 701px)').matches) setIsImageExpanded(true);
  };

  const changeImage = (direction: number) => {
    setSelectedImage(current => (current + direction + images.length) % images.length);
    setIsPhotoDescriptionExpanded(false);
  };

  return (
    <div className="modal-backdrop details-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <button type="button" className="close-btn details-close" onClick={onClose} aria-label="Закрити перегляд">
          <X size={20}/>
        </button>
        <div className="details-gallery">
          {images.length ? (
            <>
              <button type="button" className="details-image-trigger" onClick={expandImage} aria-label="Збільшити фото">
                <img className="details-main-image" src={selectedPhoto.url} alt={`${seed.name}, фото ${selectedImage + 1}`}/>
                <span className="image-expand-hint">Натисніть, щоб збільшити</span>
              </button>
              {(selectedPhoto.date || selectedPhoto.shortDescription || selectedPhoto.description) && (
                <div className={`details-photo-caption${images.length > 1 ? ' has-thumbnails' : ''}`}>
                  {selectedPhoto.date && (
                    <span><CalendarDays size={13} aria-hidden="true" />{formatPhotoDate(selectedPhoto.date)}</span>
                  )}
                  {selectedPhoto.description ? (
                    <button
                      type="button"
                      onClick={() => setIsPhotoDescriptionExpanded(current => !current)}
                      aria-expanded={isPhotoDescriptionExpanded}
                    >
                      <FileText size={13} aria-hidden="true" />{selectedPhoto.shortDescription || 'Опис фото'}
                    </button>
                  ) : selectedPhoto.shortDescription ? (
                    <span><FileText size={13} aria-hidden="true" />{selectedPhoto.shortDescription}</span>
                  ) : null}
                  {isPhotoDescriptionExpanded && selectedPhoto.description && <p>{selectedPhoto.description}</p>}
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button type="button" className="gallery-arrow gallery-prev" onClick={() => changeImage(-1)} aria-label="Попереднє фото">
                    <ChevronLeft size={21}/>
                  </button>
                  <button type="button" className="gallery-arrow gallery-next" onClick={() => changeImage(1)} aria-label="Наступне фото">
                    <ChevronRight size={21}/>
                  </button>
                  <div className="gallery-thumbnails" aria-label="Фотографії насіння">
                    {images.slice(thumbnailStart, thumbnailStart + 6).map((image, thumbnailIndex) => {
                      const index = thumbnailStart + thumbnailIndex;
                      return (
                        <button
                          type="button"
                          className={`gallery-thumbnail${selectedImage === index ? ' active' : ''}`}
                          key={`${image.url}-${index}`}
                          onClick={() => {
                            setSelectedImage(index);
                            setIsPhotoDescriptionExpanded(false);
                          }}
                          aria-label={`Показати фото ${index + 1}`}
                          aria-pressed={selectedImage === index}
                        >
                          <img src={image.url} alt=""/>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {images.length > 1 && <span className="gallery-counter">{selectedImage + 1} / {images.length}</span>}
            </>
          ) : (
            <div className={`flower-placeholder details-placeholder p${seed.name.length % 4}`}>
              <span>✿</span>
              <small>{seed.category}</small>
            </div>
          )}
        </div>
        <div className="details-content">
          <div className="details-meta">
            <span className="details-category">{seed.category}</span>
            {seed.featured && <span className="details-featured">Обране</span>}
            <span className="details-growing-difficulty">{seedGrowingDifficultyLabels[getSeedGrowingDifficulty(seed)]}</span>
          </div>
          {(seed.lowStock || seed.topSelling) && (
            <div className="details-status-badges">
              {seed.lowStock && <span className="details-low-stock-badge">Мало залишилось</span>}
              {seed.topSelling && <span className="details-top-selling">Топ продажів</span>}
            </div>
          )}
          <h2 id="details-title">{seed.name}</h2>
          {(seed.variety || seed.latin) && (
            <p className="details-variety">
              {seed.variety}{seed.variety && seed.latin ? ' · ' : ''}<i>{seed.latin}</i>
            </p>
          )}
          {(seed.commonNames?.some(Boolean) || seed.commonNamesEng?.some(Boolean)) && (
            <div className="details-common-names">
              {seed.commonNames?.some(Boolean) ? <p><strong>Інші українські назви:</strong> {seed.commonNames.filter(Boolean).join(', ')}</p> : null}
              {seed.commonNamesEng?.some(Boolean) ? <p><strong>Англійські назви:</strong> {seed.commonNamesEng.filter(Boolean).join(', ')}</p> : null}
            </div>
          )}
          {(seed.family || seed.subfamily || seed.tribe || seed.genus) && (
            <dl className="taxonomy-list" aria-label="Таксономія рослини">
              {seed.family && <div><dt>Родина</dt><dd><button type="button" onClick={() => onTaxonomyFilter('family', seed)}>{seed.family}</button></dd></div>}
              {seed.subfamily && <div><dt>Підродина</dt><dd><button type="button" onClick={() => onTaxonomyFilter('subfamily', seed)}>{seed.subfamily}</button></dd></div>}
              {seed.tribe && <div><dt>Триба</dt><dd><button type="button" onClick={() => onTaxonomyFilter('tribe', seed)}>{seed.tribe}</button></dd></div>}
              {seed.genus && <div><dt>Рід</dt><dd><button type="button" onClick={() => onTaxonomyFilter('genus', seed)}><i>{seed.genus}</i></button></dd></div>}
            </dl>
          )}
          {tags.length > 0 && (
            <div className="details-tags" aria-label="Теги">
              {tags.map(({ tag, secondary }) => (
                <button
                  type="button"
                  className={`tag-chip${secondary ? ' secondary-tag' : ''}${getSeedTagKind(tag) === 'default' ? '' : ` tag-${getSeedTagKind(tag)}`}`}
                  key={`${secondary ? 'secondary' : 'primary'}-${tag}`}
                  onClick={() => onTagFilter(tag)}
                >
                  <SeedTagIcon tag={tag} />{tag}
                </button>
              ))}
            </div>
          )}
          {seed.colors?.some(group => group.length > 0) && (
            <section className="details-colors" aria-label="Кольори">
              <h3>Кольори</h3>
              {seed.colors.filter(group => group.length > 0).map((group, index) => (
                  <div className="details-color-group" key={`details-color-${index}`}>
                    {group.map((color, colorIndex) => (
                      <span className="details-color-item" key={`${color.name}-${colorIndex}`}>
                        <i style={{ backgroundColor: color.hex }} aria-hidden="true" />
                        <span>{color.name}</span>
                      </span>
                    ))}
                  </div>
                ))}
          
                
        
            </section>
          )}
          {(seed.height || seed.diameter || seed.daysToMature !== undefined || seed.vaseLife) && (
            <dl className="details-size-info" aria-label="Розміри рослини">
              {seed.height && <div><dt>Висота</dt><dd>{seed.height}</dd></div>}
              {seed.daysToMature !== undefined && <div><dt>Днів до достигання</dt><dd>{seed.daysToMature}</dd></div>}
              {seed.diameter && <div><dt>Ширина</dt><dd>{seed.diameter}</dd></div>}
              {seed.vaseLife && <div><dt>Вазостійкість</dt><dd>{seed.vaseLife}</dd></div>}
            </dl>
          )}
          <section className="details-price-options" aria-label="Варіанти фасування та ціни">
            <h3>Фасування та ціни</h3>
            {priceOptions.map((option, index) => (
              <div className="details-price-option" key={`${option.packaging}-${index}`}>
                <div>
                  <span>{option.packaging}</span>
                  <small className={seed.lowStock ? 'details-low-stock' : ''}>
                    {allowOrdering
                      ? `${Math.max(0, option.quantity - getCartQuantity(cartLines, seed.id, option.packaging))} порцій доступно`
                      : `${option.quantity} порцій у наявності`}
                  </small>
                </div>
                <strong>{formatPrice(option.price)}</strong>
                {allowOrdering && <button
                  type="button"
                  className="details-cart-button"
                  onClick={() => onAddToCart(seed, index)}
                  disabled={getCartQuantity(cartLines, seed.id, option.packaging) >= option.quantity}
                ><ShoppingCart size={14} /> Додати</button>}
              </div>
            ))}
          </section>
          {seed.varietalPurity && (
            <div className="details-varietal-purity">
              <strong>Чистота (відповідність сорту)</strong><span>{seed.varietalPurity}</span>
            </div>
          )}
          {floweringPeriod && <div className="details-flowering-period"><CalendarDays size={17} /><span><small>Період цвітіння</small><strong>{floweringPeriod}</strong></span></div>}
          {sowingPeriods.length > 0 && (
            <div className="details-sowing-period">
              <Sprout size={17} />
              <span className="details-sowing-period-content">
                <small>Період висіву</small>
                {sowingPeriods.map((period, index) => (
                  <span className="details-sowing-period-entry" key={`${period.interval}-${index}`}>
                    {period.description ? (
                      <>
                        <button
                          type="button"
                          className="details-sowing-period-toggle"
                          aria-expanded={expandedSowingPeriods.includes(index)}
                          aria-controls={`sowing-period-description-${index}`}
                          aria-label={`${expandedSowingPeriods.includes(index) ? 'Сховати' : 'Показати'} опис періоду ${period.interval}`}
                          onClick={() => setExpandedSowingPeriods(current => current.includes(index)
                            ? current.filter(periodIndex => periodIndex !== index)
                            : [...current, index])}
                        >
                          <strong>{period.interval}</strong>
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                        <p
                          className="details-sowing-period-description"
                          id={`sowing-period-description-${index}`}
                          hidden={!expandedSowingPeriods.includes(index)}
                        >
                          {period.description}
                        </p>
                      </>
                    ) : <strong>{period.interval}</strong>}
                    {period.details && <small>{period.details}</small>}
                  </span>
                ))}
              </span>
            </div>
          )}
          {seed.lighting && (
            <div className="details-sowing-period details-lighting">
              <Sun size={17} />
              <span>
                <small>Освітлення</small>
                <strong>{seed.lighting}</strong>
              </span>
            </div>
          )}
          {seed.frostHardiness && (
            <div className="details-frost-hardiness">
              <strong>Морозостійкість</strong><span>{seed.frostHardiness}</span>
            </div>
          )}
          {(seed.springFrostTolerance || seed.autumnFrostTolerance) && (
            <div className="details-frost-hardiness">
              {seed.springFrostTolerance && <div><strong>Стійкість до весняних приморозків</strong><span>{seed.springFrostTolerance}</span></div>}
              {seed.autumnFrostTolerance && <div><strong>Стійкість до осінніх приморозків</strong><span>{seed.autumnFrostTolerance}</span></div>}
            </div>
          )}
          {(cutHarvest || seed.seedHarvestAdvice) && (
            <section className="details-harvest-advice">
              {cutHarvest && <div><h3>Зріз</h3><p>{cutHarvest}</p></div>}
              {seed.seedHarvestAdvice && <div><h3>Збір насіння</h3><p>{seed.seedHarvestAdvice}</p></div>}
            </section>
          )}
          {seed.description && <div className="details-description"><h3>Опис</h3><p>{seed.description}</p></div>}
          {images.length > 1 && <p className="details-photo-count">{images.length} фото в галереї</p>}
        </div>
      </section>
      {isImageExpanded && (
        <div className="image-lightbox" onMouseDown={event => {
          if (event.target === event.currentTarget) setIsImageExpanded(false);
        }}>
          <button type="button" className="close-btn image-lightbox-close" onClick={() => setIsImageExpanded(false)} aria-label="Закрити збільшене фото">
            <X size={20}/>
          </button>
          <img src={selectedPhoto.url} alt={`${seed.name}, збільшене фото ${selectedImage + 1}`}/>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="image-lightbox-arrow image-lightbox-prev"
                onClick={() => changeImage(-1)}
                aria-label="Попереднє фото"
              ><ChevronLeft size={28} /></button>
              <button
                type="button"
                className="image-lightbox-arrow image-lightbox-next"
                onClick={() => changeImage(1)}
                aria-label="Наступне фото"
              ><ChevronRight size={28} /></button>
              <span className="image-lightbox-counter">{selectedImage + 1} / {images.length}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
