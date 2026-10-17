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
  /** One line on what the group is for. */
  blurb: string;
  tools: Tool[];
};

/**
 * Single source for the sidebar and the landing catalog, grouped by what
 * you are trying to do rather than by file format.
 */
export const toolSections: ToolSection[] = [
  {
    category: "Pages",
    blurb: "Combine, cut, reorder and straighten",
    tools: [
      { label: "Merge", desc: "Combine PDFs into one file", href: "/merge", icon: GitMerge },
      { label: "Split", desc: "Pull out pages or cut into parts", href: "/split", icon: Scissors },
      { label: "Organize", desc: "Reorder and delete pages", href: "/organize", icon: LayoutGrid },
      { label: "Rotate", desc: "Fix page orientation", href: "/rotate", icon: RotateCw },
      { label: "Crop", desc: "Trim page margins", href: "/crop", icon: Crop },
    ],
  },
  {
    category: "Edit & sign",
    blurb: "Write on it, fill it in, sign it",
    tools: [
      { label: "Edit", desc: "Write, highlight, draw and sign", href: "/edit", icon: PenTool },
      { label: "Sign", desc: "Draw a signature and place it", href: "/sign", icon: PenLine },
      { label: "Fill forms", desc: "Type into a form's fields", href: "/forms", icon: ClipboardList },
      { label: "Page numbers", desc: "Number every page", href: "/page-numbers", icon: Hash },
      { label: "Watermark", desc: "Stamp text or an image", href: "/watermark", icon: Droplets },
    ],
  },
  {
    category: "Secure",
    blurb: "Lock, unlock and black out",
    tools: [
      { label: "Protect", desc: "Lock with a password", href: "/protect", icon: Lock },
      { label: "Unlock", desc: "Remove a password", href: "/unlock", icon: Unlock },
      { label: "Redact", desc: "Black out private details for good", href: "/redact", icon: EyeOff },
    ],
  },
  {
    category: "Convert",
    blurb: "Into PDF and out of it",
    tools: [
      { label: "JPG to PDF", desc: "Images into a document", href: "/jpg-to-pdf", icon: ImageIcon },
      { label: "Scan", desc: "Camera or photos to PDF", href: "/scan", icon: Camera },
      { label: "HTML to PDF", desc: "Render HTML to pages", href: "/html-to-pdf", icon: Globe },
      { label: "PDF to JPG", desc: "Pages as images", href: "/pdf-to-jpg", icon: Images },
      { label: "Extract text", desc: "Save text as .txt", href: "/extract-text", icon: FileType },
      { label: "Extract images", desc: "Embedded images, original quality", href: "/extract-images", icon: ImageLucide },
    ],
  },
  {
    category: "Optimize & check",
    blurb: "Shrink, fix and inspect",
    tools: [
      { label: "Compress", desc: "Shrink size, keep text", href: "/compress", icon: Minimize2 },
      { label: "Repair", desc: "Rebuild a broken file", href: "/repair", icon: Wrench },
      { label: "Compare", desc: "See what changed between versions", href: "/compare", icon: GitCompare },
      { label: "Metadata", desc: "Title, author, keywords", href: "/metadata", icon: Tags },
      { label: "PDF/A metadata", desc: "Experimental archive tags", href: "/pdf-to-pdfa", icon: Archive },
    ],
  },
];

export const allTools: Tool[] = toolSections.flatMap((s) => s.tools);
export const toolByHref = new Map(allTools.map((t) => [t.href, t]));

export const TOOL_COUNT = toolSections.reduce((n, s) => n + s.tools.length, 0);
