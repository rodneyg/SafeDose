'use strict';
const zlib=require('node:zlib');
// PNG compression can differ between Node/zlib builds even when pixels match.
function sameScreenshot(a,b){
 const decode=png=>{
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG');
  let header;const data=[];
  for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8),body=png.subarray(offset+8,offset+8+length);if(type==='IHDR')header=body;if(type==='IDAT')data.push(body);offset+=length+12;}
  return Buffer.concat([header,zlib.inflateSync(Buffer.concat(data))]);
 };
 return decode(a).equals(decode(b));
}
module.exports={sameScreenshot};
