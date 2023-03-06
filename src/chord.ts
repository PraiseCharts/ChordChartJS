import { parse } from './parser/chord_peg_parser';
import Key from './key';
import SUFFIX_MAPPING from './normalize_mappings/suffix-normalize-mapping';
import { deprecate, isMinor } from './utilities';
import {
  ChordType, Modifier, NUMERAL, NUMERIC, SYMBOL,
} from './constants';

function normalizeChordSuffix(suffix: string | null): string | null {
  if (suffix === null) {
    return null;
  }

  if (SUFFIX_MAPPING[suffix] === '[blank]') {
    return null;
  }

  return SUFFIX_MAPPING[suffix] || suffix;
}

interface ChordProperties {
  root?: Key | null;
  suffix?: string | null;
  bass?: Key | null;
}

/**
 * Represents a Chord, consisting of a root, suffix (quality) and bass
 */
class Chord implements ChordProperties {
  bass: Key | null;

  root: Key | null;

  suffix: string | null;

  /**
   * Tries to parse a chord string into a chord
   * Any leading or trailing whitespace is removed first, so a chord like `  \n  E/G# \r ` is valid.
   * @param chordString the chord string, eg `Esus4/G#` or `1sus4/#3`.
   * @returns {Chord|null}
   */
  static parse(chordString: string): Chord | null {
    try {
      return this.parseOrFail(chordString);
    } catch (_error) {
      return null;
    }
  }

  static parseOrFail(chordString: string): Chord {
    const ast = parse(chordString.trim());
    return new Chord(ast);
  }

  /**
   * Returns a deep copy of the chord
   * @returns {Chord}
   */
  clone(): Chord {
    return this.set({});
  }

  /**
   * Converts the chord to a chord symbol, using the supplied key as a reference.
   * For example, a numeric chord `#4` with reference key `E` will return the chord symbol `A#`.
   * When the chord is already a chord symbol, it will return a clone of the object.
   * @param {Key|string|null} [referenceKey=null] the reference key. The key is required when converting a
   * numeric or numeral.
   * @returns {Chord} the chord symbol
   */
  toChordSymbol(referenceKey: Key | string | null = null): Chord {
    if (this.isChordSymbol()) {
      return this.clone();
    }

    const keyObj = Key.wrapOrFail(referenceKey);

    let chordSymbolChord = new Chord({
      suffix: this.suffix ? normalizeChordSuffix(this.suffix) : null,
      root: this.root?.toChordSymbol(keyObj) || null,
      bass: this.bass?.toChordSymbol(keyObj) || null,
    });

    if (this.root?.isMinor()) {
      chordSymbolChord = chordSymbolChord.makeMinor();
    }

    chordSymbolChord = chordSymbolChord.normalize(referenceKey);
    return chordSymbolChord;
  }

  /**
   * Converts the chord to a chord symbol string, using the supplied key as a reference.
   * For example, a numeric chord `#4` with reference key `E` will return the chord symbol `A#`.
   * When the chord is already a chord symbol, it will return a string version of the chord.
   * @param {Key|string|null} [referenceKey=null] the reference key. The key is required when converting a
   * numeric or numeral.
   * @returns {string} the chord symbol string
   * @see {toChordSymbol}
   */
  toChordSymbolString(referenceKey: Key | string | null = null): string {
    return this.toChordSymbol(referenceKey).toString();
  }

  /**
   * Determines whether the chord is a chord symbol
   * @returns {boolean}
   */
  isChordSymbol(): boolean {
    return this.is(SYMBOL);
  }

  /**
   * Converts the chord to a numeric chord, using the supplied key as a reference.
   * For example, a chord symbol A# with reference key E will return the numeric chord #4.
   * @param {Key|string|null} [referenceKey=null] the reference key. The key is required when converting a chord symbol
   * @returns {Chord} the numeric chord
   */
  toNumeric(referenceKey: Key | string | null = null): Chord {
    if (this.isNumeric()) {
      return this.clone();
    }

    if (this.isNumeral()) {
      return this.transform((key) => key.toNumeric());
    }

    const keyObj: Key | null = Key.wrap(referenceKey);

    return new Chord({
      suffix: normalizeChordSuffix(this.suffix),
      root: this.root?.toNumeric(keyObj) || null,
      bass: this.bass?.toNumeric(keyObj) || null,
    });
  }

  /**
   * Converts the chord to a numeral chord, using the supplied key as a reference.
   * For example, a chord symbol A# with reference key E will return the numeral chord #IV.
   * @param {Key|string|null} [referenceKey=null] the reference key. The key is required when converting a chord symbol
   * @returns {Chord} the numeral chord
   */
  toNumeral(referenceKey: Key | string | null = null): Chord {
    if (this.isNumeral()) {
      return this.clone();
    }

    if (this.isNumeric()) {
      return this.transform((key) => key.toNumeral());
    }

    const keyObj = Key.wrapOrFail(referenceKey);

    return new Chord({
      suffix: normalizeChordSuffix(this.suffix),
      root: (keyObj && this.root) ? this.root.toNumeral(keyObj) : null,
      bass: this.bass?.toNumeral(keyObj) || null,
    });
  }

  /**
   * Converts the chord to a numeral chord string, using the supplied kye as a reference.
   * For example, a chord symbol A# with reference key E will return the numeral chord #4.
   * @param {Key|string|null} [referenceKey=null] the reference key. The key is required when converting a chord symbol
   * @returns {string} the numeral chord string
   * @see {toNumeral}
   */
  toNumeralString(referenceKey: Key | string | null = null): string {
    return this.toNumeral(referenceKey).toString();
  }

  /**
   * Determines whether the chord is numeric
   * @returns {boolean}
   */
  isNumeric(): boolean {
    return this.is(NUMERIC);
  }

  /**
   * Converts the chord to a numeric chord string, using the supplied kye as a reference.
   * For example, a chord symbol A# with reference key E will return the numeric chord #4.
   * @param {Key|string|null} [referenceKey=null] the reference key. The key is required when converting a chord symbol
   * @returns {string} the numeric chord string
   * @see {toNumeric}
   */
  toNumericString(referenceKey: Key | string | null = null): string {
    return this.toNumeric(referenceKey).toString();
  }

  /**
   * Determines whether the chord is a numeral
   * @returns {boolean}
   */
  isNumeral(): boolean {
    return this.is(NUMERAL);
  }

  /**
   * Converts the chord to a string, eg `Esus4/G#` or `1sus4/#3`
   * @returns {string} the chord string
   */
  toString(): string {
    let chordString = '';
    const suffix = this.suffix || '';
    const showMinor = suffix[0] !== 'm';

    if (this.root) {
      chordString = this.root.toString({ showMinor }) + (this.suffix || '');
    }

    if (this.bass) {
      return `${chordString}/${this.bass.toString()}`;
    }

    return chordString;
  }

  /**
   * Normalizes the chord root and bass notes:
   * - Fb becomes E
   * - Cb becomes B
   * - B# becomes C
   * - E# becomes F
   * - 4b becomes 3
   * - 1b becomes 7
   * - 7# becomes 1
   * - 3# becomes 4
   *
   * Besides that it normalizes the suffix if `normalizeSuffix` is `true`.
   * For example, `sus2` becomes `2`, `sus4` becomes `sus`.
   * All suffix normalizations can be found in `src/normalize_mappings/suffix-mapping.txt`.
   *
   * When the chord is minor, bass notes are normalized off of the relative major
   * of the root note. For example, `Em/A#` becomes `Em/Bb`.
   * @param {Key|string} [key=null] the key to normalize to
   * @param {Object} [options={}] options
   * @param {boolean} [options.normalizeSuffix=true] whether to normalize the chord suffix after transposing
   * @returns {Chord} the normalized chord
   */
  normalize(key: Key | string | null = null, { normalizeSuffix = true } = {}): Chord {
    const suffix = normalizeSuffix ? normalizeChordSuffix(this.suffix) : this.suffix;
    let normalizedRoot = this.root;

    if (this.root) {
      normalizedRoot = this.root.normalize();

      if (key) {
        normalizedRoot = normalizedRoot.normalizeEnharmonics(key);
      }
    }

    return this.set({
      suffix,
      root: normalizedRoot,
      bass: this.bass ? this.bass.normalize().normalizeEnharmonics(normalizedRoot) : null,
    });
  }

  /**
   * Switches to the specified modifier
   * @param newModifier the modifier to use: `'#'` or `'b'`
   * @returns {Chord} the new, changed chord
   */
  useModifier(newModifier: Modifier): Chord {
    return this.transform((key) => key.useModifier(newModifier));
  }

  /**
   * Transposes the chord up by 1 semitone. Eg. A becomes A#, Eb becomes E
   * @returns {Chord} the new, transposed chord
   */
  transposeUp(): Chord {
    return this.transform((key) => key.transposeUp());
  }

  /**
   * Transposes the chord down by 1 semitone. Eg. A# becomes A, E becomes Eb
   * @returns {Chord} the new, transposed chord
   */
  transposeDown(): Chord {
    return this.transform((key) => key.transposeDown());
  }

  /**
   * Transposes the chord by the specified number of semitones
   * @param delta de number of semitones
   * @returns {Chord} the new, transposed chord
   */
  transpose(delta: number): Chord {
    return this.transform((key) => key.transpose(delta));
  }

  constructor(
    {
      base = null,
      modifier = null,
      suffix = null,
      bassBase = null,
      bassModifier = null,
      root = null,
      bass = null,
      chordType = null,
    }: {
      base?: string | number | null,
      modifier?: Modifier | null,
      suffix?: string | null,
      bassBase?: string | number | null,
      bassModifier?: Modifier | null,
      root?: Key | null,
      bass?: Key | null,
      chordType?: ChordType | null,
    },
  ) {
    this.suffix = suffix || null;
    this.root = this.determineRoot({
      root, base, modifier, suffix, chordType,
    });
    this.bass = this.determineBass({
      bass, bassBase, bassModifier, chordType,
    });
  }

  equals(otherChord: Chord): boolean {
    return this.suffix === otherChord.suffix
      && Key.equals(this.root, otherChord.root)
      && Key.equals(this.bass, otherChord.bass);
  }

  determineRoot(
    {
      root,
      base,
      modifier,
      suffix,
      chordType,
    }: {
      root: Key | null,
      base: string | number | null,
      modifier: Modifier | null,
      suffix: string | null,
      chordType: ChordType | null,
    },
  ): Key | null {
    if (root) {
      return root;
    }

    if (!base) {
      return null;
    }

    if (!chordType) {
      throw new Error('Can\'t resolve at this point without a chord type');
    }

    return Key.resolve({
      key: base,
      keyType: chordType,
      minor: isMinor(base, chordType, suffix),
      modifier,
    });
  }

  determineBass(
    {
      bass,
      bassBase,
      bassModifier,
      chordType,
    }: {
      bass: Key | null,
      bassBase: string | number | null,
      bassModifier: Modifier | null,
      chordType: ChordType | null,
    },
  ): Key | null {
    if (bass) {
      return bass;
    }

    if (!bassBase) {
      return null;
    }

    if (!chordType) {
      throw new Error('Can\'t resolve at this point without a chord type');
    }

    return Key.resolve({
      key: bassBase,
      modifier: bassModifier || null,
      minor: false,
      keyType: chordType,
    });
  }

  isMinor(): boolean {
    return this.root?.isMinor() || false;
  }

  makeMinor(): Chord {
    return this.set({
      root: this.root?.makeMinor() || null,
    });
  }

  set(properties: ChordProperties): Chord {
    return new Chord(
      {
        root: this.root?.clone() || null,
        suffix: this.suffix,
        bass: this.bass?.clone() || null,
        ...properties,
      },
    );
  }

  private is(type: ChordType): boolean {
    return (!this.root || this.root.is(type)) && (!this.bass || this.bass.is(type));
  }

  private transform(transformFunc: (_key: Key) => Key): Chord {
    return this.set({
      root: this.root ? transformFunc(this.root) : null,
      bass: this.bass ? transformFunc(this.bass) : null,
    });
  }
}

/**
 * Tries to parse a chord string into a chord
 * @param chordString the chord string, eg Esus4/G# or 1sus4/#3
 * @deprecated Please use {@link Chord.parse} instead
 * @returns {Chord|null}
 */
export function parseChord(chordString: string): Chord | null {
  deprecate('parseChord() is deprecated, please use Chord.parse() instead');
  return Chord.parse(chordString);
}

export default Chord;
