import{NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{catalogCsvHeaders,suggestCatalogOnboardingMapping}from'@/lib/catalog-import';
import{parseCatalogXlsx}from'@/lib/catalog-xlsx';

export const runtime='nodejs';
const MAX_CSV_BYTES=1_000_000,MAX_XLSX_BYTES=8*1024*1024;
const CSV_TYPES=new Set(['text/csv','application/csv','text/plain','application/vnd.ms-excel','']);
const XLSX_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function extension(name:string){const at=name.lastIndexOf('.');return at>=0?name.slice(at).toLowerCase():''}
function decodeUtf8(bytes:Uint8Array){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'')}catch{throw new Error('A CSV csak UTF-8 kódolással importálható.')}}

export async function POST(request:Request){
 const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 try{await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 let form:FormData;try{form=await request.formData()}catch{return NextResponse.json({error:'Érvénytelen importfájl.'},{status:400})}
 const file=form.get('file');if(!(file instanceof File)||file.size<1)return NextResponse.json({error:'Válassz CSV vagy XLSX fájlt.'},{status:400});
 const ext=extension(file.name),sheetRaw=form.get('sheetIndex'),sheetIndex=typeof sheetRaw==='string'&&sheetRaw!==''?Number(sheetRaw):0;
 if(!Number.isInteger(sheetIndex)||sheetIndex<0||sheetIndex>99)return NextResponse.json({error:'Érvénytelen munkalap-választás.'},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());
 try{
  if(ext==='.xlsx'||file.type===XLSX_TYPE){
   if(file.size>MAX_XLSX_BYTES)return NextResponse.json({error:'Az XLSX fájl legfeljebb 8 MB lehet.'},{status:413});
   const workbook=parseCatalogXlsx(bytes,sheetIndex),headers=catalogCsvHeaders(workbook.csv);if(!headers.length)return NextResponse.json({error:'A kiválasztott munkalap fejléce nem olvasható.'},{status:422});
   return NextResponse.json({sourceType:'xlsx',csv:workbook.csv,headers,suggestedMapping:suggestCatalogOnboardingMapping(headers),sheetNames:workbook.sheetNames,selectedSheetIndex:workbook.selectedSheetIndex,selectedSheetName:workbook.selectedSheetName,fileName:file.name});
  }
  if(ext!=='.csv'||!CSV_TYPES.has(file.type))return NextResponse.json({error:'Csak CSV vagy XLSX fájl tölthető fel.'},{status:415});
  if(file.size>MAX_CSV_BYTES)return NextResponse.json({error:'A CSV fájl legfeljebb 1 MB lehet.'},{status:413});if(bytes.includes(0))return NextResponse.json({error:'A CSV bináris tartalmat tartalmaz.'},{status:422});
  const csv=decodeUtf8(bytes),headers=catalogCsvHeaders(csv);if(!headers.length)return NextResponse.json({error:'A CSV fejléc nem olvasható.'},{status:422});
  return NextResponse.json({sourceType:'csv',csv,headers,suggestedMapping:suggestCatalogOnboardingMapping(headers),sheetNames:[],selectedSheetIndex:0,selectedSheetName:null,fileName:file.name});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Az importfájl nem dolgozható fel biztonságosan.'},{status:422})}
}
