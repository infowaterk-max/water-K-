import {NextResponse} from 'next/server';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES} from '@/lib/builder/storefront-template-catalog';
import {STOREFRONT_TEMPLATE_QUALITY_MANIFESTS,evaluateStorefrontTemplateQualityGate} from '@/lib/builder/storefront-template-quality-gate';

export const dynamic='force-dynamic';

export async function GET(){
  if(process.env.VISUAL_FIDELITY_QA!=='1')return new NextResponse(null,{status:404});
  const templates=STOREFRONT_TEMPLATE_QUALITY_MANIFESTS.map(manifest=>{
    const template=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.find(item=>item.manifest.templateKey===manifest.templateKey);
    if(!template)throw new Error(`QUALITY_TEMPLATE_PACKAGE_MISSING:${manifest.templateKey}`);
    const structural=evaluateStorefrontTemplateQualityGate({template,manifest});
    return{
      templateKey:template.manifest.templateKey,
      templateVersion:template.manifest.templateVersion,
      status:manifest.status,
      sourcePrefixes:[...manifest.sourcePrefixes],
      pageTypes:[...manifest.pageTypes],
      viewports:[...manifest.viewports],
      shell:manifest.shell,
      content:manifest.content,
      browser:manifest.browser,
      golden:manifest.golden,
      structural,
    };
  });
  return NextResponse.json({
    contract:'shoporation.template-factory-quality-catalog.v1',
    templates,
  });
}
