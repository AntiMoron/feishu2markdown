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
  docUrl: "https://xqs4y94tkg.feishu.cn/docx/G6bldPfBQo7nZ7xM3urcKtCPn5c",
})?.then((result) => {
  console.log(result);
  const mdDir = path.resolve(process.cwd(),  "./doc.md");
  fs.writeFileSync(mdDir, result!);
});
