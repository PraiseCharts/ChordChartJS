import { getKeys } from './helpers';

describe('getKeys', () => {
  it('returns the applicable keys for a major key symbol', () => {
    expect(getKeys('A')).toEqual(['Bb', 'B', 'C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab']);
  });

  it('returns the applicable keys for a minor key symbol', () => {
    expect(getKeys('Dm')).toEqual(['F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'D#m', 'Ebm', 'Em', 'Fm']);
  });
});
