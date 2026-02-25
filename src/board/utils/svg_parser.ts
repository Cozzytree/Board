import type { SvgShapeProps } from "../shapes/svg_shape";

/**
 * Parses an SVG string and extracts combined path data and viewBox dimensions.
 * This is primarily designed for icon packs (like Heroicons or Excalidraw libraries)
 * that utilize <path> elements to draw complex vector icons.
 */
export function parseSvgToShapeProps(svgString: string): SvgShapeProps | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");

  if (!svg) {
    console.error("Invalid SVG string provided.");
    return null;
  }

  let viewBoxWidth = 24;
  let viewBoxHeight = 24;

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[ ,]+/).map(parseFloat);
    if (parts.length === 4) {
      viewBoxWidth = parts[2];
      viewBoxHeight = parts[3];
    }
  } else {
    const w = svg.getAttribute("width");
    const h = svg.getAttribute("height");
    if (w) viewBoxWidth = parseFloat(w);
    if (h) viewBoxHeight = parseFloat(h);
  }

  // If the payload has complex nested SVGs (like Excalidraw libraries converted to SVGs),
  // return the full raw payload so SvgShape can bind it to an Image source.
  if (svgString.trim().startsWith("<svg")) {
    return {
      svgPath: svgString,
      viewBoxWidth,
      viewBoxHeight,
    };
  }

  // Fallback: Collect all path data
  // Note: For full SVG support, circle/rect/polygon nodes would need to be converted to path strings.
  // We'll stick to <path> elements as they are standard for icon libraries.
  const paths = svg.querySelectorAll("path");
  let combinedPath = "";

  paths.forEach((p) => {
    const d = p.getAttribute("d");
    if (d) {
      combinedPath += d + " ";
    }
  });

  if (!combinedPath.trim()) {
    console.warn("No <path> elements found in the SVG.");
    return null;
  }

  return {
    svgPath: combinedPath.trim(),
    viewBoxWidth,
    viewBoxHeight,
  };
}
