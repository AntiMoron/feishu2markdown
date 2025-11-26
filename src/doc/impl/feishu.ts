import axios from "axios";
import { HandleDocParams } from "../type";
import * as fs from "fs";
import * as path from "path";
import { Doc2MarkdownBase } from "../base";

export const type: HandleDocParams["type"] = "feishu";

interface ImageContentType {
  align: number;
  height: number;
  scale: number;
  token: string;
  width: number;
}

interface BlockContentType {
  elements: Array<{
    text_run: {
      content: string;
      text_element_style: {
        bold: boolean;
        inline_code: boolean;
        italic: boolean;
        strikethrough: boolean;
        underline: boolean;
      };
    };
  }>;
}

interface BlockType {
  block_id: string;
  block_type: number;
  children?: string[];
  table: {
    cells: string[];
    property: {
      column_size: number;
      row_size: number;
      header_row: boolean;
      merge_info: Array<{
        col_span: number;
        row_span: number;
      }>;
    };
  };
  image?: ImageContentType;
  text?: BlockContentType;
  heading1?: BlockContentType;
  heading2?: BlockContentType;
  heading3?: BlockContentType;
  heading4?: BlockContentType;
  heading5?: BlockContentType;
  parent_id: string;
}

export class FeishuDoc2Markdown extends Doc2MarkdownBase {
  static type = type;

  constructor(protected readonly params: HandleDocParams) {
    super(params);
    if (params.type !== type) {
      throw new Error(`Invalid doc type: ${params.type}`);
    }
  }

  async getAccessToken(): Promise<{ expireTime: number; accessToken: string }> {
    /**
     * 获取飞书访问令牌
     * @doc https://open.feishu.cn/document/faq/trouble-shooting/how-to-choose-which-type-of-token-to-use
     * @param appId
     * @param appSecret
     */
    const apiUrl =
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";
    const { appId, appSecret } = this.params;
    const data = await axios.post(
      apiUrl,
      {
        app_id: appId,
        app_secret: appSecret,
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
    const { tenant_access_token: accessToken, code, msg, expire } = data.data;
    if (code !== 0) {
      throw new Error(`Failed to get Feishu access token: ${msg}`);
    }
    return {
      expireTime: Date.now() + expire * 1000 - 3000, // Milliseconds
      accessToken,
    };
  }

  async handleDocTask<T extends { id: string; url: string }>(
    task: T,
  ): Promise<string> {
    const { id: docId, url: docUrl, ...metadata } = task;
    const data = await this.getRawDocContent(docId);
    const { items } = data;
    const result = await this.blockToMarkdown(
      docId,
      items[0],
      items.reduce((pre: any, obj: any) => {
        pre[obj.block_id] = obj;
        return pre;
      }, {}),
    );
    return result;
  }

  private getDocumentIdFromUrl(url: string) {
    const match = url.match(/docx\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error("Invalid Feishu document URL");
  }

  async getDocMetadata(
    documentId: string,
  ): Promise<{ id: string; token: string; name: string }> {
    const api = `https://open.feishu.cn/open-apis/docx/v1/documents/${documentId}`;
    const data = await axios.get(api, {
      headers: this.getHeaders(),
    });
    const metadata = data.data?.data?.document;
    return {
      ...metadata,
      id: metadata.document_id,
      token: metadata.document_id,
      url: metadata.url,
      name: metadata.title,
    };
  }

  async getRawDocContent(documentId: string): Promise<any> {
    // Impl
    const apiUrl = `https://open.feishu.cn/open-apis/docx/v1/documents/${documentId}/blocks`;
    const data = await axios.get(apiUrl, {
      headers: this.getHeaders(),
    });
    return data.data?.data;
  }

  private async handleFeishuImage(documentId: string, resourceToken: string) {
    const location = process.cwd();
    const imagesDir = path.join(location, `${documentId}_images`);
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }
    const imagePath = path.join(imagesDir, `${resourceToken}.jpg`);
    if (fs.existsSync(imagePath)) {
      return imagePath;
    }
    const apiUrl = `https://open.feishu.cn/open-apis/drive/v1/medias/${resourceToken}/download`;
    const request = axios({
      url: apiUrl,
      method: "GET",
      headers: this.getHeaders(),
      responseType: "stream",
    });
    const writer = fs.createWriteStream(imagePath);
    (await request).data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve as any);
      writer.on("error", reject);
    }).catch((err) => {});
    return imagePath;
  }

  async blockToMarkdown(
    documentId: string,
    block: BlockType,
    blockMap: Record<string, BlockType>,
  ): Promise<string> {
    let str = "";
    let content = "";
    const { handleImage } = this.params;
    const { block_id, block_type, children, table } = block;
    switch (block_type) {
      case 1: // overall doc root
        break;
      case 2: // content
        const property = block.text as BlockContentType;
        const style = property.elements[0].text_run.text_element_style;
        const { bold, inline_code, italic, strikethrough, underline } = style;
        content = property.elements[0].text_run.content;
        const composedContent = [content];
        if (bold) {
          composedContent.push("**");
          composedContent.unshift("**");
        }
        if (inline_code) {
          composedContent.push("`");
          composedContent.unshift("`");
        }
        if (italic) {
          composedContent.push("*");
          composedContent.unshift("*");
        }
        if (strikethrough) {
          composedContent.push("~~");
          composedContent.unshift("~~");
        }
        if (underline) {
          composedContent.push("++");
          composedContent.unshift("++");
        }
        str += composedContent.join("");
        break;
      case 3: //
        break;
      case 4: // heading 2
        const properKeys = [1, 2, 3, 4, 5].map((a) => `heading${a}`);
        for (let i = 0; i < properKeys.length; i++) {
          const k = properKeys[i];
          const property = block[k as keyof BlockType] as BlockContentType;
          if (!property) {
            continue;
          }
          content = property.elements[0].text_run.content;
          for (let j = 0; j < i + 1; j++) {
            str += "#";
          }
          str += ` ${content}\n`;
          break;
        }
        break;
      case 27: // image
        const image = block.image;
        if (image) {
          const { token, scale, width, height } = image;
          let imageUrl = token;
          await this.getCachedAccessToken();
          imageUrl = await this.handleFeishuImage(documentId, token);
          if (typeof handleImage === "function") {
            const d = handleImage(imageUrl);
            if (d instanceof Promise || typeof (d as any).then === "function") {
              imageUrl = await (d as Promise<string>);
            } else {
              imageUrl = d as string;
            }
          }
          str += `![image](${imageUrl})`;
        }
        break;
      case 31: // table
      case 32: // table cell
        break;
      default:
        break;
    }
    if (table && table.property) {
      const tableProps = table.property;
      const { cells } = table;
      const { column_size, row_size } = tableProps;
      let tbStr = "";
      let cellIndex = 0;
      for (let j = 0; j < row_size; j++) {
        if (column_size === 0) {
          continue;
        }
        for (let i = 0; i < column_size; i++) {
          const cellBlock = blockMap[cells[cellIndex]];
          if (!cellBlock) {
            if (i === 0) {
              tbStr += "| ";
            }
            tbStr += i === column_size - 1 ? " |\n" : " | ";
            cellIndex += 1;
            continue;
          }
          if (i === 0) {
            tbStr += "| ";
          }

          tbStr += await this.blockToMarkdown(documentId, cellBlock, blockMap);
          tbStr += i === column_size - 1 ? " |\n" : " | ";

          cellIndex += 1;
        }
        if (j === 0) {
          for (let i = 0; i < column_size; i++) {
            tbStr += "|---";
          }
          tbStr += "|\n";
        }
      }
      str += tbStr;
    } else if (children && children.length > 0) {
      for (const childId of children) {
        str += await this.blockToMarkdown(
          documentId,
          blockMap[childId],
          blockMap,
        );
        if (block_type !== 32) {
          str += "\n";
        }
      }
    }
    return str;
  }

  async getDocTaskList(): Promise<
    Array<{
      name: string;
      url: string;
      type: string;
      token: string;
      id: string;
    }>
  > {
    const { folderToken, docUrl } = this.params;
    if (docUrl) {
      const docId = this.getDocumentIdFromUrl(docUrl);
      const singleData = await this.getDocMetadata(docId);
      return [
        {
          ...singleData,
          url: docUrl,
          type: "docx",
        },
      ];
    }
    const api = "https://open.feishu.cn/open-apis/drive/v1/files";
    const request = await axios.get(api, {
      headers: this.getHeaders(),
      params: {
        folder_token: folderToken,
        page_size: 50,
      },
    });
    const metadataList = request.data?.data;
    return metadataList?.files?.map((item: any) => {
      return {
        ...item,
        id: item.token,
      };
    });
  }
}

export default FeishuDoc2Markdown;
