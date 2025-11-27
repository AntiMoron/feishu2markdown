import handleDoc, { getDocTaskList } from "../index";
import * as fs from "fs";
import * as path from "path";

const Token = JSON.parse(
  fs.readFileSync(path.join(__dirname, "./token.json"), "utf-8"),
);

const { appId, appSecret } = Token;

console.log("App ID:", appId);
console.log("App Secret:", appSecret);

getDocTaskList({
  type: "feishu",
  appId,
  appSecret,
  // docUrl: "https://xqs4y94tkg.feishu.cn/docx/G6bldPfBQo7nZ7xM3urcKtCPn5c",
  // folderToken: 'V3gHf81UtljFX0drD44cZwzmn4b',
  docToken: "G6bldPfBQo7nZ7xM3urcKtCPn5c",
}).then((a) => console.log(a));

handleDoc({
  type: "feishu",
  appId,
  appSecret,
  docUrl: "https://xqs4y94tkg.feishu.cn/docx/G6bldPfBQo7nZ7xM3urcKtCPn5c",
  // folderToken: 'V3gHf81UtljFX0drD44cZwzmn4b',
  handleProgress: (completedCount, errorCount, totalCount) => {
    console.log(
      `Progress: ${completedCount}/${totalCount}, Errors: ${errorCount}`,
    );
  },
  handleImage: (localImgDir) => {
    return localImgDir;
  },
  onDocFinish: (docId, markdown, metdata) => {
    const mdDir = path.resolve(process.cwd(), `./${docId}.md`);
    fs.writeFileSync(mdDir, markdown!);
    console.log(`Document saved: ${mdDir}`);
  },
});
