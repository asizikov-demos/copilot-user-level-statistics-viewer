import { getIDEMetadata, normalizeIDEKey } from '../../../utils/ideMetadata';

export function getClientPatternIndex(clientKey: string): number {
  const canonical = getIDEMetadata(clientKey)?.canonicalKey ?? normalizeIDEKey(clientKey);
  const visualKey = canonical === 'github_app' ? 'copilot_app' : canonical;
  let hash = 0;
  for (const character of visualKey) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 6;
}

export function createClientPattern(
  context: Pick<CanvasRenderingContext2D, 'createPattern'>,
  color: string,
  clientKey: string,
): CanvasPattern {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 8;
  const pen = tile.getContext('2d');
  if (!pen) throw new Error('Client chart patterns require Canvas 2D support.');
  pen.fillStyle = color;
  pen.fillRect(0, 0, 8, 8);
  pen.strokeStyle = pen.fillStyle = 'rgba(255,255,255,0.8)';
  pen.lineWidth = 1;
  pen.beginPath();
  switch (getClientPatternIndex(clientKey)) {
    case 0:
      pen.moveTo(-2, 2); pen.lineTo(2, -2);
      pen.moveTo(0, 8); pen.lineTo(8, 0);
      pen.moveTo(6, 10); pen.lineTo(10, 6);
      break;
    case 1:
      pen.moveTo(-2, 6); pen.lineTo(2, 10);
      pen.moveTo(0, 0); pen.lineTo(8, 8);
      pen.moveTo(6, -2); pen.lineTo(10, 2);
      break;
    case 2: pen.moveTo(0, 4); pen.lineTo(8, 4); break;
    case 3: pen.moveTo(4, 0); pen.lineTo(4, 8); break;
    case 4: pen.arc(4, 4, 1, 0, Math.PI * 2); pen.fill(); break;
    default:
      pen.moveTo(0, 4); pen.lineTo(8, 4);
      pen.moveTo(4, 0); pen.lineTo(4, 8);
  }
  pen.stroke();
  const pattern = context.createPattern(tile, 'repeat');
  if (!pattern) throw new Error('Unable to create the client chart pattern.');
  return pattern;
}
