import{inflateRawSync}from'node:zlib';

const MAX_ARCHIVE_BYTES=8*1024*1024,MAX_ENTRY_BYTES=10*1024*1024,MAX_TOTAL_BYTES=25*1024*1024,MAX_ENTRIES=250,MAX_ROWS=501,MAX_COLS=80;

type ZipEntry={name:string;method:number;compressedSize:number;uncompressedSize:number;localOffset:number};
export type CatalogWorkbook={sheetNames:string[];selectedSheetIndex:number;selectedSheetName:string;csv:string};

const xmlDecode=(value:string)=>value.replace(/&#(x?[0-9a-f]+);|&(amp|lt|gt|quot|apos);/gi,(match,num,named)=>{if(num){const hex=String(num).toLowerCase().startsWith('x');const code=Number.parseInt(hex?String(num).slice(1):String(num),hex?16:10);return Number.isFinite(code)?String.fromCodePoint(code):match}return named==='amp'?'&':named==='lt'?'<':named==='gt'?'>':named==='quot'?'"':named==='apos'?"'":match});
const attr=(tag:string,name:string)=>{const match=tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`,'i'));return xmlDecode(match?.[1]??match?.[2]??'')};
const safePath=(name:string)=>{const clean=name.replace(/\\/g,'/').replace(/^\.\//,'');if(!clean||clean.startsWith('/')||clean.split('/').includes('..'))throw new Error('Az XLSX veszélyes fájlútvonalat tartalmaz.');return clean};

function zipEntries(bytes:Uint8Array){
 const buffer=Buffer.from(bytes);if(buffer.length<22||buffer.length>MAX_ARCHIVE_BYTES)throw new Error('Az XLSX fájl mérete nem megfelelő.');
 let eocd=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){eocd=i;break}if(eocd<0)throw new Error('Az XLSX ZIP szerkezete nem olvasható.');
 const count=buffer.readUInt16LE(eocd+10),centralOffset=buffer.readUInt32LE(eocd+16);if(count<1||count>MAX_ENTRIES||centralOffset>=buffer.length)throw new Error('Az XLSX túl sok vagy érvénytelen bejegyzést tartalmaz.');
 const entries=new Map<string,ZipEntry>();let cursor=centralOffset,total=0;
 for(let i=0;i<count;i++){
  if(cursor+46>buffer.length||buffer.readUInt32LE(cursor)!==0x02014b50)throw new Error('Az XLSX központi könyvtára sérült.');
  const flags=buffer.readUInt16LE(cursor+8),method=buffer.readUInt16LE(cursor+10),compressedSize=buffer.readUInt32LE(cursor+20),uncompressedSize=buffer.readUInt32LE(cursor+24),nameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32),localOffset=buffer.readUInt32LE(cursor+42);
  if(flags&1)throw new Error('Titkosított XLSX nem importálható.');if(![0,8].includes(method))throw new Error('Az XLSX nem támogatott ZIP tömörítést használ.');if(uncompressedSize>MAX_ENTRY_BYTES)throw new Error('Az XLSX egyik belső fájlja túl nagy.');
  total+=uncompressedSize;if(total>MAX_TOTAL_BYTES)throw new Error('Az XLSX kibontott mérete túl nagy.');if(compressedSize>0&&uncompressedSize/compressedSize>250)throw new Error('Az XLSX tömörítési aránya nem biztonságos.');
  const start=cursor+46,end=start+nameLength;if(end>buffer.length)throw new Error('Az XLSX fájlnév sérült.');const name=safePath(buffer.subarray(start,end).toString('utf8'));entries.set(name,{name,method,compressedSize,uncompressedSize,localOffset});cursor=end+extraLength+commentLength;
 }
 for(const name of entries.keys()){const lower=name.toLowerCase();if(lower.includes('vbaproject')||lower.includes('/embeddings/')||lower.includes('/activex/'))throw new Error('Makrót vagy beágyazott aktív tartalmat tartalmazó XLSX nem importálható.');}
 return{buffer,entries};
}
function readEntry(ctx:ReturnType<typeof zipEntries>,name:string){
 const entry=ctx.entries.get(name);if(!entry)return null;const{buffer}=ctx,o=entry.localOffset;if(o+30>buffer.length||buffer.readUInt32LE(o)!==0x04034b50)throw new Error('Az XLSX helyi ZIP fejléce sérült.');const nameLength=buffer.readUInt16LE(o+26),extraLength=buffer.readUInt16LE(o+28),start=o+30+nameLength+extraLength,end=start+entry.compressedSize;if(end>buffer.length)throw new Error('Az XLSX tömörített adata hiányos.');const raw=buffer.subarray(start,end),out=entry.method===0?Buffer.from(raw):inflateRawSync(raw);if(out.length!==entry.uncompressedSize||out.length>MAX_ENTRY_BYTES)throw new Error('Az XLSX kibontott adata nem igazolható.');return out.toString('utf8');
}
function sharedStrings(xml:string|null){if(!xml)return[];const values:string[]=[];for(const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)){let text='';for(const t of match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi))text+=xmlDecode(t[1]);values.push(text)}return values}
function columnIndex(ref:string){const letters=(ref.match(/^[A-Z]+/i)?.[0]??'').toUpperCase();let value=0;for(const ch of letters)value=value*26+(ch.charCodeAt(0)-64);return Math.max(0,value-1)}
function sheetMatrix(xml:string,shared:string[]){
 const rows:string[][]=[];for(const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)){const cells:string[]=[];let sequential=0;for(const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)){const tag=cellMatch[1],body=cellMatch[2],ref=attr(tag,'r'),type=attr(tag,'t'),index=ref?columnIndex(ref):sequential;sequential=index+1;if(index>=MAX_COLS)throw new Error(`Az XLSX legfeljebb ${MAX_COLS} oszlopot tartalmazhat.`);const raw=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1]??'';let value='';if(type==='s'){const n=Number(raw);value=Number.isInteger(n)?shared[n]??'':''}else if(type==='inlineStr'){for(const t of body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi))value+=xmlDecode(t[1])}else if(type==='b')value=raw==='1'?'TRUE':'FALSE';else value=xmlDecode(raw);cells[index]=value}if(cells.some(cell=>(cell??'').trim()!==''))rows.push(Array.from({length:Math.max(0,cells.length)},(_,i)=>cells[i]??''));if(rows.length>MAX_ROWS)throw new Error(`Az XLSX egy munkalapján legfeljebb ${MAX_ROWS-1} adatsor importálható.`)}return rows;
}
const csvCell=(value:string)=>/[;"\r\n]/.test(value)?`"${value.replace(/"/g,'""')}"`:value;
const matrixToCsv=(rows:string[][])=>rows.map(row=>row.map(csvCell).join(';')).join('\n');

export function parseCatalogXlsx(bytes:Uint8Array,sheetIndex=0):CatalogWorkbook{
 if(bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error('A fájl tartalma nem XLSX/ZIP formátum.');const zip=zipEntries(bytes),workbook=readEntry(zip,'xl/workbook.xml');if(!workbook)throw new Error('Az XLSX munkafüzet leírója hiányzik.');const rels=readEntry(zip,'xl/_rels/workbook.xml.rels')??'';
 const relMap=new Map<string,string>();for(const match of rels.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi)){const id=attr(match[1],'Id'),target=attr(match[1],'Target');if(id&&target){const normalized=safePath(target.startsWith('/')?target.slice(1):target.startsWith('xl/')?target:`xl/${target.replace(/^\.\//,'')}`);relMap.set(id,normalized)}}
 const sheets:Array<{name:string;path:string}>=[];for(const match of workbook.matchAll(/<sheet\b([^>]*)\/?\s*>/gi)){const name=attr(match[1],'name')||`Munkalap ${sheets.length+1}`,rid=attr(match[1],'r:id'),path=relMap.get(rid);if(path&&zip.entries.has(path))sheets.push({name,path})}
 if(!sheets.length)for(const path of [...zip.entries.keys()].filter(name=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort())sheets.push({name:`Munkalap ${sheets.length+1}`,path});if(!sheets.length)throw new Error('Az XLSX nem tartalmaz olvasható munkalapot.');if(!Number.isInteger(sheetIndex)||sheetIndex<0||sheetIndex>=sheets.length)throw new Error('A kiválasztott XLSX munkalap nem létezik.');
 const selected=sheets[sheetIndex],sheetXml=readEntry(zip,selected.path);if(!sheetXml)throw new Error('Az XLSX kiválasztott munkalapja nem olvasható.');const matrix=sheetMatrix(sheetXml,sharedStrings(readEntry(zip,'xl/sharedStrings.xml')));if(matrix.length<1)throw new Error('A kiválasztott munkalap üres.');const csv=matrixToCsv(matrix);if(Buffer.byteLength(csv,'utf8')>1000000)throw new Error('A normalizált munkalap túl nagy az importhoz.');return{sheetNames:sheets.map(sheet=>sheet.name),selectedSheetIndex:sheetIndex,selectedSheetName:selected.name,csv};
}
