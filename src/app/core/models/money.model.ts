export function egpToPiastres(egp: number): number {
  return Math.round(egp * 100);
}

export function piastresToEgp(piastres: number): number {
  return piastres / 100;
}
