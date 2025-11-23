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
}
