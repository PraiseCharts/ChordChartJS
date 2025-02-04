import { Renderer } from './renderer';

type FingerNumber = 1 | 2 | 3 | 4 | 5;
type FretNumber = 1 | 2 | 3 | 4 | 5;
type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

interface Barre { from: StringNumber, to: StringNumber, fret: FretNumber }
type StringList = StringNumber[];
interface StringMarker { string: StringNumber, fret: FretNumber, finger?: FingerNumber }

interface ChordDiagramOptions {
  barres: Barre[];
  chord: string;
  fretCount: number;
  markers: StringMarker[];
  openStrings: StringList;
  stringCount: number;
  unusedStrings: StringList;
}

function repeat(count: number, callback: (i: number) => void): void {
  Array.from({ length: count }).forEach((_, i) => callback(i));
}

class ChordDiagram {
  options: ChordDiagramOptions;

  renderer?: Renderer;

  titleY = 36;

  neckWidth = 240;

  neckHeight = 426;

  nutThickness = 10;

  fretThickness = 2;

  stringIndicatorSize = 28.8;

  constructor(options: ChordDiagramOptions) {
    this.options = options;
  }

  get neckX() {
    return (this.stringIndicatorSize / 2) + 1;
  }

  get neckY() {
    return this.stringIndicatorY + 29.3;
  }

  get stringIndicatorY() {
    return this.titleY + 38.7;
  }

  get fingerNumberIndicatorsY() {
    return this.neckY + this.neckHeight + 36;
  }

  get nutThicknessCorrection() {
    return this.nutThickness - this.fretThickness;
  }

  render(renderer: Renderer) {
    this.renderTitle(renderer);
    this.renderStrings(renderer);
    this.renderNut(renderer);
    this.renderFrets(renderer);
    this.renderOpenStringIndicators(renderer);
    this.renderUnusedStringIndicators(renderer);
    this.renderStringMarkers(renderer);
    this.renderBarres(renderer);
    this.renderFingerNumberIndicators(renderer);
  }

  renderTitle(renderer: Renderer) {
    const { chord } = this.options;

    renderer.text(
      chord,
      {
        fontSize: 48,
        x: (this.neckX + (this.neckWidth / 2)),
        y: this.titleY,
      },
    );
  }

  renderStrings(renderer: Renderer) {
    const { stringCount } = this.options;

    repeat(stringCount, (stringIndex) => {
      renderer.line({
        x1: this.neckX + (stringIndex * (this.neckWidth / (stringCount - 1))),
        y1: this.neckY,
        x2: this.neckX + (stringIndex * (this.neckWidth / (stringCount - 1))),
        y2: this.neckY + this.neckHeight,
        thickness: 2,
      });
    });
  }

  renderNut(renderer: Renderer) {
    renderer.line({
      x1: this.neckX,
      y1: this.neckY,
      x2: this.neckX + this.neckWidth,
      y2: this.neckY,
      thickness: this.nutThickness,
    });
  }

  renderFrets(renderer: Renderer) {
    const { fretCount } = this.options;
    const fretSpacing = (this.neckHeight - this.nutThicknessCorrection) / fretCount;

    repeat(fretCount, (fretIndex) => {
      renderer.line({
        x1: this.neckX - this.fretThickness,
        y1: this.neckY + this.nutThicknessCorrection + ((fretIndex + 1) * fretSpacing),
        x2: this.neckX - this.fretThickness + this.neckWidth + (2 * this.fretThickness),
        y2: this.neckY + this.nutThicknessCorrection + ((fretIndex + 1) * fretSpacing),
        thickness: this.fretThickness,
      });
    });
  }

  renderOpenStringIndicators(renderer: Renderer) {
    const { openStrings, stringCount } = this.options;

    openStrings.forEach((stringNumber: StringNumber) => {
      renderer.circle({
        size: this.stringIndicatorSize,
        x: this.neckX + ((stringNumber - 1) * (this.neckWidth / (stringCount - 1))),
        y: this.stringIndicatorY,
        thickness: 2,
      });
    });
  }

  renderUnusedStringIndicators(renderer: Renderer) {
    const { stringCount, unusedStrings } = this.options;

    unusedStrings.forEach((stringNumber: StringNumber) => {
      const x = this.neckX + ((stringNumber - 1) * (this.neckWidth / (stringCount - 1)));
      const y = this.stringIndicatorY;
      const size = this.stringIndicatorSize;

      renderer.line({
        x1: x - size / 2,
        y1: y - size / 2,
        x2: x + size / 2,
        y2: y + size / 2,
        thickness: 2,
      });

      renderer.line({
        x1: x + size / 2,
        y1: y - size / 2,
        x2: x - size / 2,
        y2: y + size / 2,
        thickness: 2,
      });
    });
  }

  renderStringMarkers(renderer: Renderer) {
    const { fretCount, markers } = this.options;
    const fretSpacing = (this.neckHeight - this.nutThicknessCorrection) / fretCount;

    markers.forEach(({ string, fret }: StringMarker) => {
      renderer.circle({
        x: this.neckX + ((string - 1) * (this.neckWidth / 5)),
        y: this.neckY + this.nutThicknessCorrection + (fret * fretSpacing) - (fretSpacing / 2),
        size: 31.2,
        fill: true,
        thickness: 2,
      });
    });
  }

  renderBarres(renderer: Renderer) {
    const { barres, fretCount, stringCount } = this.options;
    const fretSpacing = (this.neckHeight - this.nutThicknessCorrection) / fretCount;
    const barreHeight = fretSpacing / 3.0;
    const stringSpacing = this.neckWidth / (stringCount - 1);

    barres.forEach(({ from, to, fret }: Barre) => {
      const stringSpaceCount = to - from;

      renderer.rect({
        x: this.neckX + ((from - 0.5) * stringSpacing),
        y: this.neckY + this.nutThicknessCorrection + ((fret - 0.5) * fretSpacing) - (barreHeight / 2),
        width: stringSpaceCount * stringSpacing,
        height: barreHeight,
        thickness: 2,
        radius: 15.6,
        fill: true,
      });
    });
  }

  renderFingerNumberIndicators(renderer: Renderer) {
    const { markers, stringCount } = this.options;
    const stringSpacing = this.neckWidth / (stringCount - 1);

    markers.forEach(({ string, finger }: StringMarker) => {
      renderer.text(
        `${finger}`,
        {
          fontSize: 28,
          x: this.neckX + ((string - 1) * stringSpacing),
          y: this.fingerNumberIndicatorsY,
        },
      );
    });
  }
}

export default ChordDiagram;
