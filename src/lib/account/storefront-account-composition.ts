import type{StorefrontComponentNode,StorefrontPageDocument}from'@/lib/builder/storefront-runtime';

const idMarker=(id:string,kind:'header'|'footer')=>new RegExp(`(^|[-_.])${kind}($|[-_.])`,'i').test(id);
function contains(node:StorefrontComponentNode,predicate:(node:StorefrontComponentNode)=>boolean):boolean{return predicate(node)||(node.children??[]).some(child=>contains(child,predicate))}
const isHeader=(node:StorefrontComponentNode)=>contains(node,item=>item.componentKey==='system.commerce-header'||item.componentKey==='editorial.header'||item.componentKey.endsWith('.header')||idMarker(item.id,'header'));
const isFooter=(node:StorefrontComponentNode)=>contains(node,item=>item.componentKey==='system.footer'||item.componentKey==='editorial.footer'||item.componentKey.endsWith('.footer')||idMarker(item.id,'footer'));
const isAuthPublic=(section:StorefrontComponentNode)=>(section.config as Record<string,unknown>).authPublic===true;

export function splitStorefrontAccountTemplateSections(page:StorefrontPageDocument){
 const headerSections=page.sections.filter(isHeader);
 const footerSections=page.sections.filter(isFooter);
 const publicAuthSections=page.sections.filter(isAuthPublic);
 const authenticatedSections=page.sections.filter(section=>!isHeader(section)&&!isFooter(section)&&!isAuthPublic(section));
 return{headerSections,footerSections,publicAuthSections,authenticatedSections};
}

export function sliceStorefrontAccountTemplatePage(page:StorefrontPageDocument,sections:StorefrontComponentNode[]):StorefrontPageDocument{
 return{...page,sections};
}
