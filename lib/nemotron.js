import {aiJSON} from "./ai.js";
export async function nemotronJSON(messages,options={}){return aiJSON(messages,{provider:"nvidia",...options});}