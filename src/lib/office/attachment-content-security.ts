import{createHash}from'node:crypto';
import{Buffer}from'node:buffer';
import type{OfficePrivateAttachmentMimeType}from'./private-attachments';

const MAX_OFFICE_UNCOMPRESSED_BYTES=50*1024*1024;
const MAX_OFFICE_SINGLE_ENTRY_BYTES=25*1024*1024;
const MAX_OFFICE_COMPRESSION_RATIO=100;

const extensionByMime:Record<OfficePrivateAttachmentMimeType,readonly string[]>={
  'image/jpeg':['.jpg','.jpeg'],
  'image/png':['.png'],
  'image/webp':['.webp'],
  'application/pdf':['.pdf'],
  'text/plain':['.txt'],
  'text/csv':['.csv'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
};

export type OfficeAttachmentInspection={
  ok:boolean;
  sha256:string;
  detectedContentType:string;
  reason?:string;
};

function startsWith(buffer:Buffer,bytes:number[]){
  if(buffer.length<bytes.length)return false;
  return bytes.every((value,index)=>buffer[index]===value);
}

function filenameMatches(name:string,mime:OfficePrivateAttachmentMimeType){
  const lower=name.toLowerCase();
  return extensionByMime[mime].some(extension=>lower.endsWith(extension));
}

function inspectText(buffer:Buffer,mime:OfficePrivateAttachmentMimeType):string|null{
  if(buffer.includes(0))return'text_contains_nul';
  let text:string;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch{return'text_not_utf8'}
  if(mime==='text/csv'){
    const lines=text.split(/\r?\n/).slice(0,5000);
    for(const line of lines){
      const cells=line.split(/[,;\t]/);
      for(const rawCell of cells){
        const cell=rawCell.trim().replace(/^"|"$/g,'').trimStart();
        if(!cell)continue;
        if(cell[0]==='='||cell[0]==='+'||cell[0]==='@')return'csv_formula_injection_risk';
        if(cell[0]==='-'&&cell.length>1&&!/[0-9.,]/.test(cell[1]))return'csv_formula_injection_risk';
      }
    }
  }
  return null;
}

function findEocd(buffer:Buffer){
  const min=Math.max(0,buffer.length-65557);
  for(let offset=buffer.length-22;offset>=min;offset-=1){
    if(buffer.readUInt32LE(offset)===0x06054b50)return offset;
  }
  return-1;
}

function inspectOfficeZip(buffer:Buffer,mime:OfficePrivateAttachmentMimeType):string|null{
  if(!startsWith(buffer,[0x50,0x4b,0x03,0x04]))return'office_not_zip_container';
  const eocd=findEocd(buffer);
  if(eocd<0)return'office_zip_eocd_missing';
  const totalEntries=buffer.readUInt16LE(eocd+10);
  const centralSize=buffer.readUInt32LE(eocd+12);
  const centralOffset=buffer.readUInt32LE(eocd+16);
  if(totalEntries===0xffff||centralSize===0xffffffff||centralOffset===0xffffffff)return'office_zip64_not_allowed';
  if(totalEntries<1||totalEntries>5000)return'office_zip_entry_count_invalid';
  if(centralOffset+centralSize>buffer.length)return'office_zip_central_directory_invalid';

  let cursor=centralOffset;
  let totalUncompressed=0;
  const names:string[]=[];
  for(let index=0;index<totalEntries;index+=1){
    if(cursor+46>buffer.length||buffer.readUInt32LE(cursor)!==0x02014b50)return'office_zip_central_entry_invalid';
    const compressed=buffer.readUInt32LE(cursor+20);
    const uncompressed=buffer.readUInt32LE(cursor+24);
    const filenameLength=buffer.readUInt16LE(cursor+28);
    const extraLength=buffer.readUInt16LE(cursor+30);
    const commentLength=buffer.readUInt16LE(cursor+32);
    const nameStart=cursor+46;
    const nameEnd=nameStart+filenameLength;
    if(nameEnd>buffer.length)return'office_zip_filename_invalid';
    const name=buffer.subarray(nameStart,nameEnd).toString('utf8');
    if(!name||name.includes('\0')||name.includes('\\')||name.startsWith('/')||name.includes('../')||name.includes(':'))return'office_zip_path_invalid';
    if(uncompressed>MAX_OFFICE_SINGLE_ENTRY_BYTES)return'office_zip_entry_too_large';
    if(compressed===0&&uncompressed>0)return'office_zip_ratio_invalid';
    if(compressed>0&&uncompressed/compressed>MAX_OFFICE_COMPRESSION_RATIO)return'office_zip_ratio_invalid';
    totalUncompressed+=uncompressed;
    if(totalUncompressed>MAX_OFFICE_UNCOMPRESSED_BYTES)return'office_zip_uncompressed_limit';
    names.push(name);
    cursor=nameEnd+extraLength+commentLength;
  }

  const lower=names.map(name=>name.toLowerCase());
  const dangerous=lower.find(name=>
    name.endsWith('/vbaproject.bin')
    ||name.includes('/activex/')
    ||name.includes('/embeddings/')
    ||name.includes('/externallinks/')
    ||/\.(exe|dll|com|scr|msi|bat|cmd|ps1|vbs|js|jar)$/i.test(name)
  );
  if(dangerous)return'office_active_or_embedded_content';

  if(!lower.includes('[content_types].xml'))return'office_content_types_missing';
  if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
    if(!lower.includes('word/document.xml')||lower.includes('xl/workbook.xml'))return'office_docx_structure_invalid';
  }else{
    if(!lower.includes('xl/workbook.xml')||lower.includes('word/document.xml'))return'office_xlsx_structure_invalid';
  }
  return null;
}

export function inspectOfficePrivateAttachmentContent(
  bytes:Uint8Array,
  declaredMime:OfficePrivateAttachmentMimeType,
  originalName:string,
):OfficeAttachmentInspection{
  const buffer=Buffer.from(bytes);
  const sha256=createHash('sha256').update(buffer).digest('hex');
  const fail=(reason:string,detectedContentType='application/octet-stream'):OfficeAttachmentInspection=>({ok:false,sha256,detectedContentType,reason});
  if(buffer.length<1)return fail('empty_file');
  if(!filenameMatches(originalName,declaredMime))return fail('filename_extension_mismatch');

  if(declaredMime==='image/jpeg'){
    if(!startsWith(buffer,[0xff,0xd8,0xff])||buffer.length<5||buffer[buffer.length-2]!==0xff||buffer[buffer.length-1]!==0xd9)return fail('jpeg_signature_invalid');
    return{ok:true,sha256,detectedContentType:declaredMime};
  }
  if(declaredMime==='image/png'){
    const pngStart=[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
    const pngEnd=[0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82];
    if(!startsWith(buffer,pngStart)||buffer.length<20||!pngEnd.every((value,index)=>buffer[buffer.length-8+index]===value))return fail('png_signature_invalid');
    return{ok:true,sha256,detectedContentType:declaredMime};
  }
  if(declaredMime==='image/webp'){
    if(buffer.length<12||buffer.subarray(0,4).toString('ascii')!=='RIFF'||buffer.subarray(8,12).toString('ascii')!=='WEBP')return fail('webp_signature_invalid');
    const riffSize=buffer.readUInt32LE(4)+8;
    if(riffSize!==buffer.length)return fail('webp_size_invalid');
    return{ok:true,sha256,detectedContentType:declaredMime};
  }
  if(declaredMime==='application/pdf'){
    if(buffer.subarray(0,5).toString('ascii')!=='%PDF-')return fail('pdf_signature_invalid');
    const tail=buffer.subarray(Math.max(0,buffer.length-2048)).toString('latin1');
    if(!tail.includes('%%EOF'))return fail('pdf_eof_missing');
    const pdfText=buffer.toString('latin1');
    if(/\/(JavaScript|JS\b|Launch\b|EmbeddedFile\b|RichMedia\b)/i.test(pdfText))return fail('pdf_active_content_rejected',declaredMime);
    return{ok:true,sha256,detectedContentType:declaredMime};
  }
  if(declaredMime==='text/plain'||declaredMime==='text/csv'){
    const textProblem=inspectText(buffer,declaredMime);
    if(textProblem)return fail(textProblem,declaredMime);
    return{ok:true,sha256,detectedContentType:declaredMime};
  }
  if(
    declaredMime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ||declaredMime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ){
    const officeProblem=inspectOfficeZip(buffer,declaredMime);
    if(officeProblem)return fail(officeProblem,declaredMime);
    return{ok:true,sha256,detectedContentType:declaredMime};
  }
  return fail('unsupported_declared_type');
}
