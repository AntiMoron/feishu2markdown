/**
 * Parameters for handling documents from different platforms.
 */
export interface HandleDocParams {
  type: "feishu";
  appId: string;
  appSecret: string;
  docUrl?: string;
  folderToken?: string;
  handleImage?: (imageUrl: string) => string | Promise<string>;
  handleProgress?: (doneCount: number, errorCount: number, allCount: number) => void;
  onDocFinish?: (
    docId: string,
    markdown: string,
    metadata?: any,
  ) => void | Promise<void>;
}
