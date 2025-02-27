import { FingerNumber, FretNumber, StringNumber } from '../constants';
import { Renderer } from './renderer';

export interface Barre {
  from: StringNumber;
  to: StringNumber;
  fret: FretNumber;
}

type StringList = StringNumber[];
export interface StringMarker {
  string: StringNumber;
  fret: FretNumber;
  finger?: FingerNumber;
}

export interface ChordDiagramDefinition {
  barres: Barre[];
  chord: string;
  fretCount: number;
  markers: StringMarker[];
  openStrings: StringList;
  stringCount: number;
  unusedStrings: StringList;
  baseFret: number;
}

export interface ChordDiagramRenderingConfig {
  titleY: number;
  neckWidth: number;
  neckHeight: number;
  nutThickness: number;
  nutColor: number|string;
  fretThickness: number;
  fretColor: number|string;
  stringColor: number|string;
  stringIndicatorSize: number;
  fingerIndicatorSize: number;
  fingerIndicatorOffset: number;
  stringThickness: number;
  fretLineThickness: number;
  openStringIndicatorThickness: number;
  unusedStringIndicatorThickness: number;
  markerThickness: number;
  barreThickness: number;
  titleFontSize: number;
  baseFretFontSize: number;
  fingerNumberFontSize: number;
  showFingerNumbers: boolean;
  diagramSpacing: number;
  maxDiagramsPerRow?: number|null;
}

const defaultChordDiagramDefinition: ChordDiagramDefinition = {
  barres: [],
  chord: '',
  fretCount: 4,
  markers: [],
  openStrings: [],
  stringCount: 6,
  unusedStrings: [],
  baseFret: 0,
};

export const DefaultChordDiagramRenderingConfig: ChordDiagramRenderingConfig = {
  titleY: 28,
  neckWidth: 120,
  neckHeight: 160,
  nutThickness: 10,
  fretThickness: 4,
  nutColor: 0,
  fretColor: '#929292',
  stringIndicatorSize: 14,
  fingerIndicatorSize: 16,
  stringColor: 0,
  fingerIndicatorOffset: 0,
  stringThickness: 3,
  fretLineThickness: 4,
  openStringIndicatorThickness: 2,
  unusedStringIndicatorThickness: 2,
  markerThickness: 2,
  barreThickness: 2,
  titleFontSize: 48,
  baseFretFontSize: 8,
  fingerNumberFontSize: 28,
  showFingerNumbers: true,
  diagramSpacing: 7,
};

function repeat(count: number, callback: (i: number) => void): void {
  Array.from({ length: count }).forEach((_, i) => callback(i));
}

class ChordDiagram {
  chordDiagramDefinition: ChordDiagramDefinition;

  renderer?: Renderer;

  config: ChordDiagramRenderingConfig;

  constructor(chordDiagramDefinition: Partial<ChordDiagramDefinition>, config?: Partial<ChordDiagramRenderingConfig>) {
    this.chordDiagramDefinition = { ...defaultChordDiagramDefinition, ...chordDiagramDefinition };
    this.config = { ...DefaultChordDiagramRenderingConfig, ...config };
  }

  get neckX() {
    return (this.config.stringIndicatorSize / 2) + 1;
  }

  get neckY() {
    return this.stringIndicatorY + this.config.stringIndicatorSize + 3;
  }

  get stringIndicatorY() {
    return this.config.titleY + (this.config.titleFontSize / 2);
  }

  get fingerNumberIndicatorsY() {
    return this.neckY +
    this.config.neckHeight +
    this.config.fingerNumberFontSize +
    (this.config.fingerNumberFontSize / 2);
  }

  get nutThicknessCorrection() {
    return this.config.nutThickness - this.config.fretThickness;
  }

  render(renderer: Renderer) {
    this.renderer = renderer;
    this.renderTitle(renderer);
    this.renderFrets(renderer);
    this.renderStrings(renderer);
    this.renderNut(renderer);
    this.renderOpenStringIndicators(renderer);
    this.renderUnusedStringIndicators(renderer);
    this.renderStringMarkers(renderer);
    this.renderBarres(renderer);
    this.renderFingerNumberIndicators(renderer);
  }

  renderTitle(renderer: Renderer) {
    const { chord } = this.chordDiagramDefinition;

    renderer.text(
      chord,
      {
        fontSize: this.config.titleFontSize,
        x: (this.neckX + (this.config.neckWidth / 2)),
        y: this.config.titleY,
      },
    );
  }

  renderStrings(renderer: Renderer) {
    const { stringCount } = this.chordDiagramDefinition;

    repeat(stringCount, (stringIndex) => {
      renderer.line({
        x1: this.neckX + (stringIndex * (this.config.neckWidth / (stringCount - 1))),
        y1: this.neckY,
        x2: this.neckX + (stringIndex * (this.config.neckWidth / (stringCount - 1))),
        y2: this.neckY + this.config.neckHeight,
        thickness: this.config.stringThickness,
        color: this.config.stringColor,
      });
    });
  }

  renderNut(renderer: Renderer) {
    if (this.chordDiagramDefinition.baseFret === 1) {
      renderer.line({
        x1: this.neckX - this.config.stringThickness,
        y1: this.neckY,
        x2: this.neckX + this.config.neckWidth + this.config.stringThickness,
        y2: this.neckY,
        thickness: this.config.nutThickness,
      });
    } else {
      renderer.text(
        this.chordDiagramDefinition.baseFret.toString(),
        {
          fontSize: this.config.baseFretFontSize,
          x: this.neckX - this.config.fretThickness - (this.config.baseFretFontSize * 3),
          y: this.neckY + (this.config.neckHeight / this.chordDiagramDefinition.fretCount),
        },
      );
      renderer.line({
        x1: this.neckX - this.config.fretThickness,
        y1: this.neckY + this.nutThicknessCorrection + 1,
        x2: this.neckX - this.config.fretThickness + this.config.neckWidth + (2 * this.config.fretThickness),
        y2: this.neckY + this.nutThicknessCorrection,
        thickness: this.config.fretThickness,
        color: this.config.nutColor,
      });
    }
  }

  renderFrets(renderer: Renderer) {
    const { fretCount } = this.chordDiagramDefinition;
    const fretSpacing = (this.config.neckHeight - this.nutThicknessCorrection) / fretCount;

    repeat(fretCount, (fretIndex) => {
      renderer.line({
        x1: this.neckX - this.config.fretThickness,
        y1: this.neckY + this.nutThicknessCorrection + ((fretIndex + 1) * fretSpacing),
        x2: this.neckX - this.config.fretThickness + this.config.neckWidth + (2 * this.config.fretThickness),
        y2: this.neckY + this.nutThicknessCorrection + ((fretIndex + 1) * fretSpacing),
        thickness: this.config.fretLineThickness,
        color: this.config.fretColor,
      });
    });
  }

  renderOpenStringIndicators(renderer: Renderer) {
    const { openStrings, stringCount } = this.chordDiagramDefinition;

    openStrings.forEach((stringNumber: StringNumber) => {
      renderer.circle({
        size: this.config.stringIndicatorSize,
        x: this.neckX + ((stringNumber - 1) * (this.config.neckWidth / (stringCount - 1))),
        y: this.stringIndicatorY,
        thickness: this.config.openStringIndicatorThickness,
      });
    });
  }

  renderUnusedStringIndicators(renderer: Renderer) {
    const { stringCount, unusedStrings } = this.chordDiagramDefinition;

    unusedStrings.forEach((stringNumber: StringNumber) => {
      const x = this.neckX + ((stringNumber - 1) * (this.config.neckWidth / (stringCount - 1)));
      const y = this.stringIndicatorY;
      const size = this.config.stringIndicatorSize;

      renderer.line({
        x1: x - size / 2,
        y1: y - size / 2,
        x2: x + size / 2,
        y2: y + size / 2,
        thickness: this.config.unusedStringIndicatorThickness,
      });

      renderer.line({
        x1: x + size / 2,
        y1: y - size / 2,
        x2: x - size / 2,
        y2: y + size / 2,
        thickness: this.config.unusedStringIndicatorThickness,
      });
    });
  }

  renderStringMarkers(renderer: Renderer) {
    const { fretCount, markers } = this.chordDiagramDefinition;
    const fretSpacing = (this.config.neckHeight - this.nutThicknessCorrection) / fretCount;

    markers.forEach(({ string, fret }: StringMarker) => {
      renderer.circle({
        x: this.neckX + ((string - 1) * (this.config.neckWidth / 5)),
        y: this.neckY + this.nutThicknessCorrection +
           (fret * fretSpacing) - (fretSpacing / 2) + this.config.fingerIndicatorOffset,
        size: this.config.fingerIndicatorSize,
        fill: true,
        thickness: this.config.markerThickness,
      });
    });
  }

  renderBarres(renderer: Renderer) {
    const { barres, fretCount, stringCount } = this.chordDiagramDefinition;
    const fretSpacing = (this.config.neckHeight - this.nutThicknessCorrection) / fretCount;
    const barreHeight = fretSpacing / 3.0;
    const stringSpacing = this.config.neckWidth / (stringCount - 1);

    barres.forEach(({ from, to, fret }: Barre) => {
      const stringSpaceCount = to - from;

      renderer.rect({
        x: this.neckX + (from - 1.5) * stringSpacing,
        y: this.neckY + this.nutThicknessCorrection + ((fret - 0.5) * fretSpacing) - (barreHeight / 2) +
           this.config.fingerIndicatorOffset,
        width: (stringSpaceCount + 1) * stringSpacing,
        height: barreHeight,
        thickness: this.config.barreThickness,
        radius: 8,
        fill: true,
      });
    });
  }

  renderFingerNumberIndicators(renderer: Renderer) {
    if (!this.config.showFingerNumbers) return;
    const { markers, stringCount } = this.chordDiagramDefinition;
    const stringSpacing = this.config.neckWidth / (stringCount - 1);

    markers.forEach(({ string, finger }: StringMarker) => {
      if (!finger) return;

      renderer.text(
        `${finger}`,
        {
          fontSize: this.config.fingerNumberFontSize,
          x: this.neckX + ((string - 1) * stringSpacing),
          y: this.fingerNumberIndicatorsY,
        },
      );
    });
  }
}

export default ChordDiagram;
