import { PDFDocument } from "pdf-lib";

export interface FormFieldInfo {
  name: string;
  type: string;
  value: string;
  readOnly: boolean;
}

export async function listFormFields(file: File): Promise<FormFieldInfo[]> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  try {
    const form = doc.getForm();
    const fields = form.getFields();
    return fields.map((field) => {
      const name = field.getName();
      const type = field.constructor.name.replace(/^PDF/, "").replace(/Field$/, "") || "Field";
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
      return { name, type, value, readOnly };
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
