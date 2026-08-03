declare module "pdfmake/build/pdfmake" {
  import type pdfMake from "pdfmake";
  const instance: typeof pdfMake;
  export default instance;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
