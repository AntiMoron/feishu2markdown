/**
 * Parameters for handling documents from different platforms.
 */
export interface HandleDocParams {
  type: "feishu" | "none";
  appId: string;
  appSecret: string;
  docUrl?: string;
  folderToken?: string;
  shouldHandleUrl?: (url: string) => Promise<boolean>;
  handleImage?: (imageUrl: string) => string | Promise<string>;
  handleProgress?: (
    doneCount: number,
    errorCount: number,
    allCount: number,
  ) => void;
  onDocFinish?: (
    docId: string,
    markdown: string,
    metadata?: any,
  ) => void | Promise<void>;
}
