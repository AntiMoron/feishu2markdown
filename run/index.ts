import handleDoc from "../src/doc";
import Token from "./token.json";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const { appId, appSecret } = Token;

console.log("App ID:", appId);
console.log("App Secret:", appSecret);

handleDoc({
  type: "feishu",
  appId,
  appSecret,
  folderToken: 'V3gHf81UtljFX0drD44cZwzmn4b',
  handleProgress: (completedCount, errorCount, totalCount) => {
    console.log(
      `Progress: ${completedCount}/${totalCount}, Errors: ${errorCount}`,
    );
  },
  onDocFinish: (docId, markdown, metdata) => {
    const mdDir = path.resolve(process.cwd(), `./${docId}.md`);
    fs.writeFileSync(mdDir, markdown!);
    console.log(`Document saved: ${mdDir}`, metdata);
  },
});
