import {NextResponse} from 'next/server';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES} from '@/lib/builder/storefront-template-catalog';
import {STOREFRONT_TEMPLATE_QUALITY_MANIFESTS,evaluateStorefrontTemplateQualityGate} from '@/lib/builder/storefront-template-quality-gate';
import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS} from '@/lib/builder/storefront-foundation';
import {STOREFRONT_TEMPLATE_FACTORY_RECIPES,buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';

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
  const factoryCandidates=STOREFRONT_TEMPLATE_FACTORY_RECIPES.flatMap(recipe=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate(recipe.templateKey);
    if(!build.report.technicalReady)return[];
    const technicalIssues=build.report.issues.filter(issue=>issue.code!=='FACTORY_INTERNAL_VISUAL_REVIEW_REQUIRED');
    return[{
      templateKey:recipe.templateKey,
      templateVersion:recipe.templateVersion,
      status:'candidate',
      factoryCandidate:true,
      sourcePrefixes:[
        'src/lib/builder/template-factory/recipes/'+recipe.templateKey.split('.').at(-1),
        'src/lib/builder/template-factory/scaffold.ts',
      ],
      pageTypes:[...STOREFRONT_PAGE_TYPES],
      viewports:[...STOREFRONT_VIEWPORTS],
      shell:{canonical:true,allowedHeaderComponentKeys:['system.commerce-header'],mobileNavigation:'hamburger'},
      content:{informationPageRequired:true},
      browser:{maxHorizontalOverflowPx:2,minimumTouchTargetPx:32,recommendedTouchTargetPx:44,requireMobileMenu:true,requireFooter:true},
      golden:{required:false,baselineDirectory:`tests/visual-baselines/${recipe.templateKey}/v${recipe.templateVersion}`,maxPixelMismatchRatio:.005},
      structural:{ok:true,issues:technicalIssues},
      productOwnerReady:build.report.productOwnerReady,
    }];
  });
  return NextResponse.json({
    contract:'shoporation.template-factory-quality-catalog.v1',
    templates:[...templates,...factoryCandidates],
  });
}
