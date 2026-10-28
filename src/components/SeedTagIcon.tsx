import { Droplets, Flower2, Scissors, ShieldAlert, Shovel, Snowflake, Sprout, Sun, ThermometerSun } from 'lucide-react';
import { getSeedTagKind } from '../types/seed';

type SeedTagIconProps = { tag: string };

export default function SeedTagIcon({ tag }: SeedTagIconProps) {
  const kind = getSeedTagKind(tag);
  const iconProps = { size: 13, 'aria-hidden': true as const };

  switch (kind) {
    case 'frost-resistant':
      return <Snowflake {...iconProps} />;
    case 'dried-flower':
      return <Flower2 {...iconProps} />;
    case 'self-seeding':
      return <Sprout {...iconProps} />;
    case 'drought-tolerant':
      return <Sun {...iconProps} />;
    case 'heat-loving':
      return <ThermometerSun {...iconProps} />;
    case 'moisture-loving':
      return <Droplets {...iconProps} />;
    case 'cold-loving':
      return <Snowflake {...iconProps} />;
    case 'cut-flower':
      return <Scissors {...iconProps} />;
    case 'first-year-flowering':
      return <Flower2 {...iconProps} />;
    case 'winter-sowing':
      return <Shovel {...iconProps} />;
    case 'poor-wintering':
      return <ShieldAlert {...iconProps} />;
    default:
      return null;
  }
}
