const fs = require('fs');

let code = fs.readFileSync('src/board/components/shapeoptions.tsx', 'utf8');

// 1. Remove debounce wrapper entirely for StrokeSize
code = code.replace(/const handleStrokeSize = debounce\(\(n: number\) => \{/, 'const handleStrokeSize = (n: number) => {');
code = code.replace(/update\(\);\n  \}, debounceMs\)/, 'update();\n  }');

// 2. StrokeSize active state
code = code.replace(
  /\(activeShape \? activeShape\.get\("strokeWidth"\) : \(canvas\?\.defaultShapeProps\.strokeWidth \|\| 2\)\) === s \? "bg-muted\/20" : "",/g,
  '(activeShape ? activeShape.get("strokeWidth") : (canvas?.defaultShapeProps.strokeWidth || 2)) === s ? "bg-accent text-accent-foreground border border-border" : "border border-transparent",'
);

// 3. StrokeOption
code = code.replace(
  /const applyStroke = debounce\(\(val: string\) => \{/,
  'const applyStrokeSync = (val: string) => {\n'
);
code = code.replace(
  /update\(\);\n  \}, debounceMs\);/g,
  'update();\n  };\n  const applyStroke = debounce(applyStrokeSync, debounceMs);'
);
code = code.replace(
  /applyStroke\(c\);/g,
  'applyStrokeSync(c);'
);
code = code.replace(
  /\(activeShape \? activeShape\.get\("stroke"\) : canvas\?\.defaultShapeProps\.stroke\) === c \? "ring-2 ring-primary ring-offset-1" : "",/g,
  '(activeShape ? activeShape.get("stroke") : canvas?.defaultShapeProps.stroke) === c ? "ring-2 ring-primary ring-offset-1 border-primary bg-primary/10" : "",'
);

// 4. FillOption
code = code.replace(
  /const applyFill = debounce\(\(color: string\) => \{/,
  'const applyFillSync = (color: string) => {\n'
);
code = code.replace( // applyFill uses update(); }, debounceMs); but we just replaced it. Wait, the global replace for update(); }, debounceMs); already did it!
  // Wait, let's just do it manually for FillOption if it got replaced.
  // Actually, I need to be careful with global replacements.
  // I will just write a more robust script.
);
