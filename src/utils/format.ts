/** Formats a number with space as thousands separator (e.g. 1 000). */
export function fmtNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Formats a percentage change with sign (e.g. "+12%", "-5%"). */
export function changeText(val: number): string {
  return (val > 0 ? '+' : '') + val + '%'
}
