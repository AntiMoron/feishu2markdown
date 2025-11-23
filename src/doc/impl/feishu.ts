import axios from "axios";
import { HandleDocParams } from "../type";
import * as fs from "fs";
import * as path from "path";

export const type = "feishu";

let tokenData = {
  expireTime: 0,
  accessToken: "",
};

function getDocumentIdFromUrl(url: string) {
  const match = url.match(/docx\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error("Invalid Feishu document URL");
}

/**
 * 获取飞书访问令牌
 * @doc https://open.feishu.cn/document/faq/trouble-shooting/how-to-choose-which-type-of-token-to-use
 * @param appId
 * @param appSecret
 */
async function getFeishuAccessToken(appId: string, appSecret: string) {
  const { expireTime, accessToken: cachedAT } = tokenData;

  if (Date.now() < expireTime && cachedAT) {
    return { accessToken: cachedAT, expireTime };
  }

  const apiUrl =
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";
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
  tokenData = {
    expireTime: Date.now() + expire * 1000 - 3000, // Milliseconds
    accessToken,
  };
  return {
    ...tokenData,
  };
}

async function getFeishuDocContent(documentId: string, accessToken: string) {
  // Impl
  const apiUrl = `https://open.feishu.cn/open-apis/docx/v1/documents/${documentId}/blocks`;
  const data = await axios.get(apiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return data.data?.data;
}

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

async function handleFeishuImage(
  documentId: string,
  resourceToken: string,
  accessToken: string,
  width: number,
  height: number,
  blockId: string,
) {
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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

async function blockToMarkdown(
  documentId: string,
  block: BlockType,
  blockMap: Record<string, BlockType>,
  params: HandleDocParams,
): Promise<string> {
  let str = "";
  let content = "";
  const { handleImage } = params;
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
        imageUrl = await handleFeishuImage(
          documentId,
          token,
          tokenData.accessToken,
          width,
          height,
          block_id,
        );
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

        tbStr += await blockToMarkdown(documentId, cellBlock, blockMap, params);
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
      str += await blockToMarkdown(
        documentId,
        blockMap[childId],
        blockMap,
        params,
      );
      if (block_type !== 32) {
        str += "\n";
      }
    }
  }
  return str;
}

export async function getFeishuFolderDocList(
  folderToken: string,
  accessToken: string,
  pageSize: number,
) {
  const api = "https://open.feishu.cn/open-apis/drive/v1/files";
  const request = await axios.get(api, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      folder_token: folderToken,
      page_size: pageSize || 50,
    },
  });
  return request.data?.data;
}

export default async function handleFeishuDoc(params: HandleDocParams) {
  const {
    type: t,
    docUrl,
    appId,
    appSecret,
    handleProgress,
    onDocFinish,
    folderToken,
  } = params;
  if (t !== type) {
    return;
  }
  if (!docUrl && !folderToken) {
    throw new Error("Feishu docUrl or folderToken is required");
  }
  let totalCount = 1;
  let errorCount = 0;
  let doneCount = 0;
  let metdatas: any[] = [];
  let taskUrls: string[] = [];
  const { accessToken } = await getFeishuAccessToken(appId, appSecret);
  if (folderToken) {
    const { files } = await getFeishuFolderDocList(
      folderToken || "",
      accessToken,
      1,
    );
    metdatas = files;
    taskUrls = files.map((a: any) => a.url);
    totalCount = files.length;
  } else {
    totalCount = 1;
    taskUrls = [docUrl!];
  }

  if (typeof handleProgress === "function") {
    handleProgress(0, errorCount, totalCount);
  }
  for (let i = 0; i < taskUrls.length; i++) {
    const taskUrl = taskUrls[i];
    try {
      const { accessToken } = await getFeishuAccessToken(appId, appSecret);
      const docId = getDocumentIdFromUrl(taskUrl);
      const data = await getFeishuDocContent(docId, accessToken);
      const { items } = data;
      const result = await blockToMarkdown(
        docId,
        items[0],
        items.reduce((pre: any, obj: any) => {
          pre[obj.block_id] = obj;
          return pre;
        }, {}),
        params,
      );
      doneCount += 1;
      try {
        if (typeof handleProgress === "function") {
          handleProgress(doneCount, errorCount, totalCount);
        }
      } catch {}
      try {
        const relief = onDocFinish?.(docId, result, metdatas[i]);
        if (
          relief instanceof Promise ||
          typeof (relief as any).then === "function"
        ) {
          await (relief as Promise<void>);
        }
      } catch {}
    } catch {
      errorCount += 1;
    }
  }
}
