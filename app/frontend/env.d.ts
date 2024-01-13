// this file complements vite/client types
// based on custom plugins
declare module "*.svg" {
  export const ReactComponent: import("react").DetailedHTMLProps<SVGElement>;
  const path: string;
  export default path;
}
