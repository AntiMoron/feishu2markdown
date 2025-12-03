# 飞书文档转Markdown

Keywords: 

飞书文档; 飞书转Markdown; 飞书转MD; nodejs; feishu to markdown; feishu doc to markdown

---

## 动机(Motivation)

飞书转markdown还挺麻烦的

## 功能(Features)

1. 根据飞书的appId, appSecrete还有文件夹token批量自动处理一组文档；也支持只处理一个文档
2. 支持处理图片
3. 提供接口让你方便处理整出来的图片怎么接着二次加工（如上传自己的CDN等）
4. 复杂的排版不支持，文档最好是从上到下线性的
5. AI编程友好，不会让他读到你得appId, appSecret

### 小巧思(Usages)

1. 你可以用通过这个库把飞书的文件夹文档作为RAG的知识库

### 安装方法(Installation)

NPM: 

```bash
npm i --save feishu2markdown
```

Yarn:

```bash
yarn add feishu2markdown
```

### 使用方法(How to use)

1. 去飞书开发者后台申请飞书内部应用 https://open.feishu.cn/
2. 申请后，为应用申请以下权限：
   1. docx:document:readonly
   2. drive:drive
   3. space:document:retrieve
3. 如下调用进行测试
   1. 照着 run/example_token.json下的样子，复制一个token.json出来
   2. 把你创建的飞书应用的appId和appSecret都放进去
   3. 执行 `npm run test` 直接做一个测试；
      1. 成功的话会出现doc.md以及一个如`**_images`的文件夹，里面都是图片

```typescript
import handleDoc from "feishu2markdown";
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
  docUrl: 'https://xqs4y94tkg.feishu.cn/docx/G6bldPfBQo7nZ7xM3urcKtCPn5c',
  // folderToken: 'V3gHf81UtljFX0drD44cZwzmn4b',
  handleProgress: (completedCount, errorCount, totalCount) => {
    console.log(
      `Progress: ${completedCount}/${totalCount}, Errors: ${errorCount}`,
    );
  },
  handleImage: (url: string) { // local file dir
    return url;
  },
  onDocFinish: (docId, markdown, metdata) => {
    const mdDir = path.resolve(process.cwd(), `./${docId}.md`);
    fs.writeFileSync(mdDir, markdown!);
    console.log(`Document saved: ${mdDir}`, metdata);
  },
});
```

获取文档列表

```typescript
import handleDoc, { getDocTaskList } from "feishu2markdwon";


getDocTaskList({
  type: "feishu",
  appId,
  appSecret,
  docUrl: "https://xqs4y94tkg.feishu.cn/docx/G6bldPfBQo7nZ7xM3urcKtCPn5c",
}).then((a) => console.log(a));
```

---
### Roadmap

不是，我发现百来人过来 clone，倒是直接过来贡献代码啊；未来我会加一个 contributor 榜单的

|平台|完成情况|
|---|---|
|Google Doc|X|
|Dingtalk Doc|X|
|Feishu Doc|✅|
