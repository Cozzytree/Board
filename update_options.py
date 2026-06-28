import re

with open('src/board/components/shapeoptions.tsx', 'r') as f:
    text = f.read()

# Make sure OptionWrapper exists at the top
wrapper = """
function OptionWrapper({
   standalone,
   icon,
   children,
   className,
   contentClassName,
   content,
}: {
   standalone?: boolean;
   icon?: React.ReactNode;
   children?: React.ReactNode;
   className?: string;
   contentClassName?: string;
   content: React.ReactNode;
}) {
   if (standalone) return <>{content}</>;
   return (
      <Popover>
         <PopoverTrigger asChild>
            {children || (
               <Button size="xs" variant="ghost" className={cn("relative", className)}>
                  {icon}
               </Button>
            )}
         </PopoverTrigger>
         <PopoverContent className={contentClassName} sideOffset={5}>
            {content}
         </PopoverContent>
      </Popover>
   );
}
"""

if "function OptionWrapper" not in text:
    # Insert after type Props
    text = text.replace("type Props = {\n   debounceMs?: number;\n   className?: string;\n   standalone?: boolean\n};", "type Props = {\n   debounceMs?: number;\n   className?: string;\n   standalone?: boolean;\n   icon?: React.ReactNode;\n   children?: React.ReactNode;\n};\n" + wrapper)


# Function to refactor a component
def refactor_component(comp_name, icon_jsx, default_content_class):
    global text
    # Find the function signature
    sig_pattern = r'function ' + comp_name + r'\([^)]*\)\s*{'
    match = re.search(sig_pattern, text)
    if not match: return
    
    # Update signature to take Props
    if comp_name in ["RoughnessOption", "FillStyleOption", "StrokeDash", "RotationOption", "FontSizes", "FontFamilyOption"]:
        text = re.sub(r'function ' + comp_name + r'\([^)]*\)', f'function {comp_name}({{ debounceMs = 200, className, standalone, icon, children }}: Props)', text)
    else:
        text = re.sub(r'function ' + comp_name + r'\([^)]*\)', f'function {comp_name}({{ debounceMs, className, standalone, icon, children }}: Props)', text)

    # We need to find the return (<Popover> ... </Popover>)
    # This is a bit tricky with regex, let's just do it manually for each or use a smart replace
    
# Actually, a python regex for balanced parenthesis is hard.
