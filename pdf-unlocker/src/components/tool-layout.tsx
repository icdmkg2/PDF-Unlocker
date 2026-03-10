import { type LucideIcon } from "lucide-react";

interface ToolLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function ToolLayout({ title, description, icon: Icon, children }: ToolLayoutProps) {
  return (
    <div className="min-h-full p-6 lg:p-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
