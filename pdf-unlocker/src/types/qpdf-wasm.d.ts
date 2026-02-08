declare module "@jspawn/qpdf-wasm" {
    interface QpdfModule {
        FS: {
            writeFile: (path: string, data: Uint8Array) => void;
            readFile: (path: string) => Uint8Array;
        };
        callMain: (args: string[]) => number;
    }

    export default function createQpdf(): Promise<QpdfModule>;
}
