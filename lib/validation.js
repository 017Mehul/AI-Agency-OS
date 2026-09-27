export function body(req){try{return typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});}catch{const e=new Error("Invalid JSON body");e.code="INVALID_JSON";throw e;}}
export function required(value,name){if(value===undefined||value===null||String(value).trim()===""){const e=new Error(name+" is required");e.code="VALIDATION_ERROR";throw e;}return value;}
export function oneOf(value,name,allowed){if(!allowed.includes(value)){const e=new Error(name+" must be one of: "+allowed.join(", "));e.code="VALIDATION_ERROR";throw e;}return value;}
export function limit(value,fallback=50,max=100){const n=Number(value||fallback);return Math.max(1,Math.min(Number.isFinite(n)?Math.floor(n):fallback,max));}
