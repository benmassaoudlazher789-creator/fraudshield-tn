import { formatDt } from './dt.pipe';

describe('formatDt', () => {
  it('formate au format tunisien avec 3 décimales', () => {
    expect(formatDt(28450)).toBe('28 450,000 DT');
    expect(formatDt('1245.5')).toBe('1 245,500 DT');
    expect(formatDt(0)).toBe('0,000 DT');
  });

  it('affiche un tiret pour une valeur absente ou invalide', () => {
    expect(formatDt(null)).toBe('—');
    expect(formatDt('abc')).toBe('—');
  });
});
