const fs = require('fs');

let code = fs.readFileSync('src/board/components/shapeoptions.tsx', 'utf8');

// 1. Remove debounce wrapper entirely for StrokeSize
code = code.replace(
  'const handleStrokeSize = debounce((n: number) => {', 
  'const handleStrokeSize = (n: number) => {'
);
code = code.replace(
  '    canvas?.render();\n    update();\n  }, debounceMs)', 
  '    canvas?.render();\n    update();\n  }'
);

// 2. StrokeSize active state
code = code.replace(
  ' === s ? "bg-muted/20" : "",',
  ' === s ? "bg-accent text-accent-foreground border-border" : "border-transparent",'
);

// 3. StrokeOption
code = code.replace(
  'const applyStroke = debounce((val: string) => {',
  'const applyStrokeSync = (val: string) => {\n'
);
code = code.replace(
  /applyStroke\(c\);/g,
  'applyStrokeSync(c);'
);
// FillOption
code = code.replace(
  'const applyFill = debounce((color: string) => {',
  'const applyFillSync = (color: string) => {\n'
);
code = code.replace(
  /applyFill\(c\);/g,
  'applyFillSync(c);'
);
code = code.replace(
  /applyFill\("#00000000"\)/g,
  'applyFillSync("#00000000")'
);

// RoughnessOption
code = code.replace(
  'const handleSetRoughness = debounce((v: number) => {',
  'const handleSetRoughness = (v: number) => {\n'
);
code = code.replace(
  '    canvas?.render();\n    update();\n  }, debounceMs)',
  '    canvas?.render();\n    update();\n  }'
);

// FillStyleOption
code = code.replace(
  'const handleSetFillStyle = debounce((v: string) => {',
  'const handleSetFillStyle = (v: string) => {\n'
);

// StrokeDash
code = code.replace(
  'const handleSetStrokeDash = debounce((v: [number, number]) => {',
  'const handleSetStrokeDash = (v: [number, number]) => {\n'
);

// AlignOptions
code = code.replace(
  'const handleAlign = debounce((alignment: string) => {',
  'const handleAlign = (alignment: string) => {\n'
);

// VerticalAlignOptions
code = code.replace(
  'const handleVerticalAlign = debounce((alignment: string) => {',
  'const handleVerticalAlign = (alignment: string) => {\n'
);

// Replace updates for all these methods (debounce removal)
code = code.replace(
  /    canvas\?\.render\(\);\n    update\(\);\n  \}, debounceMs\);?/g,
  '    canvas?.render();\n    update();\n  };'
);

// Re-add applyStroke and applyFill debounce wrappers for color inputs
code = code.replace(
  /(const applyStrokeSync =.*?update\(\);\n  \};)/s,
  '$1\n  const applyStroke = debounce(applyStrokeSync, debounceMs);'
);
code = code.replace(
  /(const applyFillSync =.*?update\(\);\n  \};)/s,
  '$1\n  const applyFill = debounce(applyFillSync, debounceMs);'
);

// Mobile shape options portal
code = code.replace(
  '<PopoverContent className={cn("w-[85vw] max-w-[320px] p-3 mb-2 mr-2 bg-background border rounded-xl shadow-2xl", className)} side="top" align="end" sideOffset={10}>',
  '<PopoverContent className={cn("w-[90vw] max-w-[360px] p-3 mb-2 mr-2 bg-background border rounded-xl shadow-2xl max-h-[70vh] overflow-y-auto", className)} side="top" align="end" sideOffset={10}>'
);

// Stroke and Fill active state styling fix
code = code.replace(
  /\? "ring-2 ring-primary ring-offset-1" : "",/g,
  '? "ring-2 ring-primary bg-primary/10 border-primary" : "",'
);

fs.writeFileSync('src/board/components/shapeoptions.tsx', code);
