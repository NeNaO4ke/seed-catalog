export type CartLine = {
  seedId: string;
  packaging: string;
  quantity: number;
};

export const getCartQuantity = (lines: CartLine[], seedId: string, packaging: string): number =>
  lines
    .filter(line => line.seedId === seedId && line.packaging === packaging)
    .reduce((sum, line) => sum + line.quantity, 0);
