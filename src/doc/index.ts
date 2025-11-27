import Feishu2Markdown from "./impl/feishu";
import { HandleDocParams } from "./type";

const HandlerClasses = [Feishu2Markdown];

function getHandlerClass(type: string) {
  return HandlerClasses.find((clx) => clx.type === type);
}

function checkParams(params: HandleDocParams) {
  const { type: t, docUrl, docToken, folderToken } = params;
  if (!docUrl && !folderToken && !docToken) {
    throw new Error("Feishu docUrl, docToken or folderToken is required");
  }
  const HandlerClass = getHandlerClass(t);
  if (!HandlerClass) {
    throw new Error(`Unsupported document type: ${t}`);
  }
}

/**
 * Get tasks from folder, if only url provided, a single task in an array will be returned
 * @param params
 * @returns
 */
export async function getDocTaskList(params: HandleDocParams) {
  checkParams(params);
  const { type: t } = params;
  const HandlerClass = getHandlerClass(t);
  const handler = new HandlerClass!(params);
  await handler.getCachedAccessToken();
  const tasks = await handler.getDocTaskList();
  return tasks;
}

/**
 * Convert documents to markdown and assets
 * @param params
 */
export default async function handleDoc(params: HandleDocParams) {
  checkParams(params);
  const { type: t, handleProgress, onDocFinish, shouldHandleUrl } = params;
  const HandlerClass = getHandlerClass(t);
  const handler = new HandlerClass!(params);
  await handler.getCachedAccessToken();
  const tasks = await handler.getDocTaskList();
  let totalCount = tasks.length;
  let errorCount = 0;
  let doneCount = 0;
  const metdatas: any[] = tasks;
  if (typeof handleProgress === "function") {
    handleProgress(0, errorCount, totalCount);
  }
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const { id: docId, url: taskUrl } = task;
    let shouldHandle = false;
    try {
      shouldHandle = Boolean((await shouldHandleUrl?.(taskUrl)) ?? true);
    } catch {}
    if (!shouldHandle) {
      continue;
    }
    try {
      await handler.getCachedAccessToken();
      const result = await handler.handleDocTask(task);
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
