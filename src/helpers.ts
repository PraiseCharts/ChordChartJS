import Chord from './chord';
import Key from './key';
import { capos, majorKeys, minorKeys } from './key_config';
import Song from './chord_sheet/song';
import { CAPO, CHORD_STYLE, ChordType } from './chord_sheet/tag';
import Line from './chord_sheet/line';
import FormattingContext from './formatter/formatting_context';

export function transposeDistance(transposeKey: string, songKey: string): number {
  if (/^\d+$/.test(transposeKey)) {
    return parseInt(transposeKey, 10);
  }

  return Key.distance(songKey, transposeKey);
}

function chordTransposeDistance(
  capo: number | null,
  transposeKey: string | null,
  songKey: string | null,
  renderKey: Key | null | undefined,
) {
  let transpose = -1 * (capo || 0);

  if (songKey) {
    if (transposeKey) {
      transpose += transposeDistance(transposeKey, songKey);
    }

    if (renderKey) {
      transpose += Key.distance(songKey, renderKey);
    }
  }

  return transpose;
}

function changeChordType(
  chord: Chord,
  type: ChordType,
  referenceKey: Key | null,
): Chord {
  switch (type) {
    case 'symbol':
      return chord.toChordSymbol(referenceKey);
    case 'solfege':
      return chord.toChordSolfege(referenceKey);
    case 'numeral':
      return chord.toNumeral(referenceKey);
    case 'number':
      return chord.toNumeric(referenceKey);
    default:
      return chord;
  }
}

interface RenderChordOptions {
  renderKey?: Key | null;
  useUnicodeModifier?: boolean;
  normalizeChords?: boolean;
}

export function renderChord(
  chordString: string,
  line: Line,
  song: Song,
  {
    renderKey = null,
    useUnicodeModifier = false,
    normalizeChords = true,
  }: RenderChordOptions = {},
): string {
  const chord = Chord.parse(chordString);
  const songKey = song.key;
  const capoString = song.metadata.getSingle(CAPO);
  const capo = capoString ? parseInt(capoString, 10) : null;
  const chordStyle = song.metadata.getSingle(CHORD_STYLE) as ChordType;

  if (!chord) {
    return chordString;
  }

  const effectiveTransposeDistance = chordTransposeDistance(capo, line.transposeKey, songKey, renderKey);
  const effectiveKey = renderKey || Key.wrap(line.key || song.key)?.transpose(effectiveTransposeDistance) || null;
  const transposedChord = chord.transpose(effectiveTransposeDistance);
  const normalizedChord = (normalizeChords ? transposedChord.normalize(effectiveKey) : transposedChord);

  return changeChordType(normalizedChord, chordStyle, effectiveKey).toString({ useUnicodeModifier });
}

export function stringSplitReplace(
  string: string,
  search: string | RegExp,
  replaceMatch: (subString: string) => any,
  replaceRest: (subString: string, match: string | null) => any = (subString) => subString,
): any[] {
  const regExp = new RegExp(search, 'g');
  const occurrences = Array.from(string.matchAll(regExp));
  const result: string[] = [];
  let index = 0;

  occurrences.forEach((match) => {
    const before = string.slice(index, match.index);
    const matchedPart = match[0];
    if (before !== '') result.push(replaceRest(before, matchedPart));
    result.push(replaceMatch(matchedPart));
    index = match.index + matchedPart.length;
  });

  const rest = string.slice(index);
  if (rest !== '') result.push(replaceRest(rest, null));

  return result;
}

/**
 * Returns applicable capos for the provided key
 * @param {Key|string} key The key to get capos for
 * @returns {Object.<string, string>} The available capos, where the keys are capo numbers and the
 * values are the effective key for that capo.
 */
export function getCapos(key: Key | string): Record<string, string> {
  const keyObj = Key.wrapOrFail(key);
  const chordType = keyObj.type === 'solfege' ? 'solfege' : 'symbol';
  return capos[chordType][Key.toString(key)];
}

/**
 * Returns applicable keys to transpose to from the provided key
 * @param {Key|string} key The key to get keys for
 * @returns {Array<string>} The available keys
 */
export function getKeys(key: Key | string): string[] {
  const keyObj = Key.wrapOrFail(key);
  const chordType = keyObj.type === 'solfege' ? 'solfege' : 'symbol';
  return keyObj.isMinor() ? minorKeys[chordType] : majorKeys[chordType];
}

export function testSelector(
  { selector, isNegated }: { selector: string, isNegated: boolean },
  { configuration, metadata }: FormattingContext,
) {
  if (selector === configuration.instrument?.type) {
    return !isNegated;
  }

  if (selector === configuration.user?.name) {
    return !isNegated;
  }

  const metadataValue = metadata.getSingle(selector);
  const metadataValueTruthy = metadataValue && metadataValue !== '';

  return isNegated ? !metadataValueTruthy : !!metadataValueTruthy;
}
