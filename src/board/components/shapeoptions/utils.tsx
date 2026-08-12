import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Props = {
  debounceMs?: number;
  className?: string;
  standalone?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

export function OptionWrapper({
  standalone,
  icon,
  children,
  className,
  content,
}: {
  standalone?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
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
      <PopoverContent side="top" sideOffset={5} className="w-fit p-1 md:p-2">
        {content}
      </PopoverContent>
    </Popover>
  );
}
