/** TN5900000000000000004821 -> "TN59 •••• 4821" (même règle que le backend). */
export function maskAccountRef(ref: string | null | undefined): string {
  if (!ref || ref.length < 8) {
    return '••••';
  }
  return `${ref.slice(0, 4)} •••• ${ref.slice(-4)}`;
}
