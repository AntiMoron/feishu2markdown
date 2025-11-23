import handleFeishuDoc from "./impl/feishu";
import { HandleDocParams } from "./type";


export default function handleDoc(params: HandleDocParams) {
    const { type } = params;
    if (type === 'feishu') {
        return handleFeishuDoc(params);
    }
}