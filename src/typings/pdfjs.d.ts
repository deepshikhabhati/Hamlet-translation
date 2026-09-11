declare module 'pdfjs-dist' {
    // loose typings to avoid friction
    const pdfjs: any;
    export = pdfjs;
  }
  
  declare module 'pdfjs-dist/build/pdf' {
    const pdfjsLib: any;
    export = pdfjsLib;
  }
  
  declare module 'pdfjs-dist/web/pdf_viewer' {
    const pdfjsViewer: any;
    export = pdfjsViewer;
  }
  