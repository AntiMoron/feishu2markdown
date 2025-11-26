/**
 * Parameters for handling documents from different platforms.
 */
export interface HandleDocBaseParams {
  type: "feishu" | "none";
  appId: string;
  appSecret: string;
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
  folderToken?: string;
  docUrl?: string;
}

/**
 * Parameters for handling documents from different platforms.
 */
export interface HandleDocFolderParams extends HandleDocBaseParams {
  folderToken: string;
  /**
   * By default 200
   */
  pageSize?: number;
}

export interface HandleDocUrlParams extends HandleDocBaseParams {
  docUrl: string;
}

/**
 * Parameters for handling documents from different platforms.
 */
export type HandleDocParams = HandleDocFolderParams | HandleDocUrlParams;
