export const PRICES = {
  coffee: 2.5,
  lumpiaPerPiece: 1.0,
  equipmentPerHour: {
    GoPro: 5,
    'DJI Pocket 3': 8,
  },
};

export function equipmentHours(from, to) {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  const ms = end - start;
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / (1000 * 60 * 60);
}

export function calculateTotal(order) {
  let total = 0;

  if (order.coffee?.wanted) {
    total += PRICES.coffee;
  }

  if (order.lumpia?.wanted) {
    total += (order.lumpia.quantity || 0) * PRICES.lumpiaPerPiece;
  }

  if (order.equipment?.wanted) {
    const hourlyRate = PRICES.equipmentPerHour[order.equipment.type] || 0;
    const hours = equipmentHours(order.equipment.from, order.equipment.to);
    total += hours > 0 ? hours * hourlyRate : hourlyRate;
  }

  return Math.round(total * 100) / 100;
}
