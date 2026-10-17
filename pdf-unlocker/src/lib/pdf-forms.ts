import {
  PDFDocument,
  PDFButton,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  type PDFField,
} from "pdf-lib";

/**
 * Field type by instanceof, not constructor.name: production builds minify
 * class names, which made every field look like an unknown type.
 */
function fieldType(field: PDFField): string {
  if (field instanceof PDFTextField) return "Text";
  if (field instanceof PDFCheckBox) return "CheckBox";
  if (field instanceof PDFRadioGroup) return "RadioGroup";
  if (field instanceof PDFDropdown) return "Dropdown";
  if (field instanceof PDFOptionList) return "OptionList";
  if (field instanceof PDFButton) return "Button";
  if (field instanceof PDFSignature) return "Signature";
  return "Field";
}

export interface FieldWidget {
  pageIndex: number;
  /** PDF points, origin at the page's top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FormFieldInfo {
  name: string;
  type: string;
  value: string;
  readOnly: boolean;
  /** Choices for dropdowns, lists and radio groups. */
  options?: string[];
  /** Where the field appears. Empty when the PDF doesn't say. */
  widgets: FieldWidget[];
}

export async function listFormFields(file: File): Promise<FormFieldInfo[]> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  try {
    const form = doc.getForm();
    const fields = form.getFields();
    const pages = doc.getPages();
    // Map each annotation object to its page so widgets without a /P entry can still be placed.
    const pageOfAnnot = new Map<unknown, number>();
    pages.forEach((page, i) => {
      const annots = page.node.Annots();
      if (!annots) return;
      for (let a = 0; a < annots.size(); a++) pageOfAnnot.set(annots.get(a), i);
    });
    return fields.map((field) => {
      const name = field.getName();
      const type = fieldType(field);
      let value = "";
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyField = field as any;
        if (typeof anyField.getText === "function") value = anyField.getText() ?? "";
        else if (typeof anyField.isChecked === "function") value = anyField.isChecked() ? "Yes" : "No";
        else if (typeof anyField.getSelected === "function") {
          const sel = anyField.getSelected();
          value = Array.isArray(sel) ? sel.join(", ") : String(sel ?? "");
        }
      } catch {
        value = "";
      }
      let readOnly = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        readOnly = Boolean((field as any).isReadOnly?.());
      } catch {
        readOnly = false;
      }
      let options: string[] | undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyField = field as any;
        if (typeof anyField.getOptions === "function") options = anyField.getOptions();
      } catch {
        options = undefined;
      }
      const widgets: FieldWidget[] = [];
      for (const widget of field.acroField.getWidgets()) {
        const ref = doc.context.getObjectRef(widget.dict);
        let pageIndex = ref ? pageOfAnnot.get(ref) : undefined;
        if (pageIndex === undefined) {
          const pRef = widget.P();
          pageIndex = pRef ? pages.findIndex((pg) => pg.ref === pRef) : -1;
        }
        if (pageIndex === undefined || pageIndex < 0) continue;
        const r = widget.getRectangle();
        const ph = pages[pageIndex].getHeight();
        widgets.push({ pageIndex, x: r.x, y: ph - r.y - r.height, width: r.width, height: r.height });
      }
      return { name, type, value, readOnly, options, widgets };
    });
  } catch {
    return [];
  }
}

export async function fillFormFields(
  file: File,
  values: Record<string, string>,
  flatten = false
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const form = doc.getForm();

  for (const [name, value] of Object.entries(values)) {
    try {
      const field = form.getField(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyField = field as any;
      if (typeof anyField.setText === "function") {
        anyField.setText(value);
      } else if (typeof anyField.check === "function") {
        const on = /^(1|true|yes|on|checked)$/i.test(value.trim());
        if (on) anyField.check();
        else if (typeof anyField.uncheck === "function") anyField.uncheck();
      } else if (typeof anyField.select === "function") {
        anyField.select(value);
      }
    } catch {
      // skip fields that can't be set
    }
  }

  if (flatten) {
    form.flatten();
  }

  return doc.save();
}
