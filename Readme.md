# 飞书文档转Markdown

---

## 动机

飞书转markdown还挺麻烦的


## 功能：

1. 根据飞书的appId, appSecrete还有文件夹token批量自动处理一组文档；也支持只处理一个文档
2. 支持处理图片
3. 提供接口让你方便处理整出来的图片怎么接着二次加工（如上传自己的CDN等）
4. 复杂的排版不支持，文档最好是从上到下线性的
5. AI编程友好，不会让他读到你得appId, appSecret


### 小巧思

1. 你可以用通过这个库把飞书的文件夹文档作为RAG的知识库

### 使用方法

1. 去飞书开发者后台申请飞书内部应用 https://open.feishu.cn/
2. 申请后，为应用申请以下权限：
   1. docx:document:readonly
   2. drive:drive
   3. space:document:retrieve
3. 如下调用进行测试
   1. 照着 run/example_token.json下的样子，复制一个token.json出来
   2. 把你创建的飞书应用的appId和appSecret都放进去
   3. 执行 `yarn do` 直接做一个测试；
      1. 成功的话会出现doc.md以及一个如`**_images`的文件夹，里面都是图片

```typescript
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
  docUrl: "飞书文档地址"
})?.then((result) => {
  console.log(result);
  const mdDir = path.resolve(process.cwd(),  "./doc.md");
  fs.writeFileSync(mdDir, result);
});
```