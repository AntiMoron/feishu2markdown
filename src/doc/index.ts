import Feishu2Markdown from "./impl/feishu";
import { HandleDocParams } from "./type";

const HandlerClasses = [Feishu2Markdown];

function getHandlerClass(type: string) {
  return HandlerClasses.find((clx) => clx.type === type);
}

export default async function handleDoc(params: HandleDocParams) {
  const {
    type: t,
    docUrl,
    handleProgress,
    onDocFinish,
    folderToken,
    shouldHandleUrl,
  } = params;
  if (!docUrl && !folderToken) {
    throw new Error("Feishu docUrl or folderToken is required");
  }
  const HandlerClass = getHandlerClass(t);
  if (!HandlerClass) {
    throw new Error(`Unsupported document type: ${t}`);
  }
  const handler = new HandlerClass(params);
  let totalCount = 1;
  let errorCount = 0;
  let doneCount = 0;
  let metdatas: any[] = [];
  await handler.getCachedAccessToken();
  const tasks = await handler.getDocTaskList();
  totalCount = tasks.length;
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
