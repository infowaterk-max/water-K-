import{describe,expect,it}from'vitest';
import{Buffer}from'node:buffer';
import{inspectOfficePrivateAttachmentContent}from'../src/lib/office/attachment-content-security';

function fakeOfficeZip(names:string[],sizes?:Array<{compressed:number;uncompressed:number}>){
  const local=Buffer.from([0x50,0x4b,0x03,0x04]);
  const centralParts:Buffer[]=[];
  names.forEach((name,index)=>{
    const encoded=Buffer.from(name,'utf8');
    const entry=Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50,0);
    const size=sizes?.[index]??{compressed:10,uncompressed:20};
    entry.writeUInt32LE(size.compressed,20);
    entry.writeUInt32LE(size.uncompressed,24);
    entry.writeUInt16LE(encoded.length,28);
    centralParts.push(entry,encoded);
  });
  const central=Buffer.concat(centralParts);
  const eocd=Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0);
  eocd.writeUInt16LE(names.length,8);
  eocd.writeUInt16LE(names.length,10);
  eocd.writeUInt32LE(central.length,12);
  eocd.writeUInt32LE(local.length,16);
  return Buffer.concat([local,central,eocd]);
}

describe('Digital Office attachment content inspection',()=>{
  it('accepts bounded files only when signatures and filename extensions agree',()=>{
    const jpeg=Buffer.from([0xff,0xd8,0xff,0x00,0x01,0xff,0xd9]);
    expect(inspectOfficePrivateAttachmentContent(jpeg,'image/jpeg','foto.jpg').ok).toBe(true);
    expect(inspectOfficePrivateAttachmentContent(jpeg,'image/jpeg','foto.exe')).toMatchObject({ok:false,reason:'filename_extension_mismatch'});

    const png=Buffer.concat([
      Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
      Buffer.alloc(8),
      Buffer.from([0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82]),
    ]);
    expect(inspectOfficePrivateAttachmentContent(png,'image/png','kep.png').ok).toBe(true);
  });

  it('rejects active PDF constructs and malformed PDF signatures',()=>{
    const safe=Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF','latin1');
    const active=Buffer.from('%PDF-1.7\n1 0 obj\n<</JavaScript 2 0 R>>\nendobj\n%%EOF','latin1');
    expect(inspectOfficePrivateAttachmentContent(safe,'application/pdf','dokumentum.pdf').ok).toBe(true);
    expect(inspectOfficePrivateAttachmentContent(active,'application/pdf','dokumentum.pdf')).toMatchObject({ok:false,reason:'pdf_active_content_rejected'});
    expect(inspectOfficePrivateAttachmentContent(Buffer.from('not-a-pdf'),'application/pdf','dokumentum.pdf')).toMatchObject({ok:false,reason:'pdf_signature_invalid'});
  });

  it('rejects binary text and spreadsheet-formula CSV payloads',()=>{
    expect(inspectOfficePrivateAttachmentContent(Buffer.from([0x41,0x00,0x42]),'text/plain','jegyzet.txt')).toMatchObject({ok:false,reason:'text_contains_nul'});
    expect(inspectOfficePrivateAttachmentContent(Buffer.from('nev,ertek\nfoo,=HYPERLINK("http://evil")'),'text/csv','adat.csv')).toMatchObject({ok:false,reason:'csv_formula_injection_risk'});
    expect(inspectOfficePrivateAttachmentContent(Buffer.from('nev,ertek\nfoo,-12'),'text/csv','adat.csv').ok).toBe(true);
  });

  it('accepts minimal DOCX/XLSX structure but rejects macros, embeddings and zip bombs',()=>{
    const docx=fakeOfficeZip(['[Content_Types].xml','word/document.xml']);
    const xlsx=fakeOfficeZip(['[Content_Types].xml','xl/workbook.xml']);
    const macro=fakeOfficeZip(['[Content_Types].xml','word/document.xml','word/vbaProject.bin']);
    const embedded=fakeOfficeZip(['[Content_Types].xml','xl/workbook.xml','xl/embeddings/oleObject1.bin']);
    const bomb=fakeOfficeZip(['[Content_Types].xml','word/document.xml'],[{compressed:1,uncompressed:1000},{compressed:1,uncompressed:1000}]);

    expect(inspectOfficePrivateAttachmentContent(docx,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','szerzodes.docx').ok).toBe(true);
    expect(inspectOfficePrivateAttachmentContent(xlsx,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','tabla.xlsx').ok).toBe(true);
    expect(inspectOfficePrivateAttachmentContent(macro,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','szerzodes.docx')).toMatchObject({ok:false,reason:'office_active_or_embedded_content'});
    expect(inspectOfficePrivateAttachmentContent(embedded,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','tabla.xlsx')).toMatchObject({ok:false,reason:'office_active_or_embedded_content'});
    expect(inspectOfficePrivateAttachmentContent(bomb,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','szerzodes.docx')).toMatchObject({ok:false,reason:'office_zip_ratio_invalid'});
  });

  it('always emits a lowercase SHA-256 evidence hash even when content is rejected',()=>{
    const result=inspectOfficePrivateAttachmentContent(Buffer.from('MZ fake executable'),'application/pdf','dokumentum.pdf');
    expect(result.ok).toBe(false);
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
