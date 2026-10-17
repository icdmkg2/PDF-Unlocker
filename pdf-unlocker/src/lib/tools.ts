import {
  GitMerge, Scissors, LayoutGrid, Minimize2, Wrench,
  ImageIcon, Globe, Camera, Images, Archive,
  PenTool, RotateCw, Hash, Droplets, Crop,
  Unlock, Lock, PenLine, EyeOff, GitCompare,
  FileType, Tags, ClipboardList, Image as ImageLucide,
  type LucideIcon,
} from "lucide-react";

export type Tool = {
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
};

export type ToolSection = {
  category: string;
  tools: Tool[];
};

/** Single source for the sidebar and the landing catalog. */
export const toolSections: ToolSection[] = [
  {
    category: "Organize",
    tools: [
      { label: "Merge", desc: "Combine PDFs into one file", href: "/merge", icon: GitMerge },
      { label: "Split", desc: "Extract pages or ranges", href: "/split", icon: Scissors },
      { label: "Organize", desc: "Reorder and delete pages", href: "/organize", icon: LayoutGrid },
      { label: "Compress", desc: "Shrink file size", href: "/compress", icon: Minimize2 },
      { label: "Repair", desc: "Rebuild broken structure", href: "/repair", icon: Wrench },
    ],
  },
  {
    category: "Edit",
    tools: [
      { label: "Edit", desc: "Annotate, draw and sign", href: "/edit", icon: PenTool },
      { label: "Rotate", desc: "Fix page orientation", href: "/rotate", icon: RotateCw },
      { label: "Page numbers", desc: "Stamp numbers anywhere", href: "/page-numbers", icon: Hash },
      { label: "Watermark", desc: "Text or image overlay", href: "/watermark", icon: Droplets },
      { label: "Crop", desc: "Trim page margins", href: "/crop", icon: Crop },
      { label: "Fill forms", desc: "Fill and flatten fields", href: "/forms", icon: ClipboardList },
      { label: "Metadata", desc: "Title, author, keywords", href: "/metadata", icon: Tags },
    ],
  },
  {
    category: "Security",
    tools: [
      { label: "Unlock", desc: "Decrypt password-protected files", href: "/unlock", icon: Unlock },
      { label: "Protect", desc: "Encrypt with a password", href: "/protect", icon: Lock },
      { label: "Sign", desc: "Stamp a drawn signature", href: "/sign", icon: PenLine },
      { label: "Redact", desc: "Burn out sensitive content", href: "/redact", icon: EyeOff },
      { label: "Compare", desc: "Visual and text diff", href: "/compare", icon: GitCompare },
    ],
  },
  {
    category: "Convert to PDF",
    tools: [
      { label: "JPG to PDF", desc: "Images into a document", href: "/jpg-to-pdf", icon: ImageIcon },
      { label: "HTML to PDF", desc: "Render HTML to pages", href: "/html-to-pdf", icon: Globe },
      { label: "Scan", desc: "Camera or photos to PDF", href: "/scan", icon: Camera },
    ],
  },
  {
    category: "Convert from PDF",
    tools: [
      { label: "PDF to JPG", desc: "Pages as images", href: "/pdf-to-jpg", icon: Images },
      { label: "Extract text", desc: "Save text as .txt", href: "/extract-text", icon: FileType },
      { label: "Extract images", desc: "Pages as a PNG ZIP", href: "/extract-images", icon: ImageLucide },
      { label: "PDF/A metadata", desc: "Experimental XMP tags", href: "/pdf-to-pdfa", icon: Archive },
    ],
  },
];

export const TOOL_COUNT = toolSections.reduce((n, s) => n + s.tools.length, 0);
