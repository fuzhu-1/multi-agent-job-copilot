/// <reference types="next" />
/// <reference types="next/image-types/global" />

// CSS 模块类型声明
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
