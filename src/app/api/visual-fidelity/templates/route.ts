import {NextResponse} from 'next/server';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES} from '@/lib/builder/storefront-template-catalog';
import {STOREFRONT_TEMPLATE_QUALITY_MANIFESTS,evaluateStorefrontTemplateQualityGate} from '@/lib/builder/storefront-template-quality-gate';
import {STOREFRONT_TEMPLATE_QUALITY_CANDIDATES} from '@/lib/builder/storefront-template-quality-candidates';
import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS} from '@/lib/builder/storefront-foundation';
import {STOREFRONT_TEMPLATE_FACTORY_RECIPES,buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {evaluateTemplateFactoryPreflight,replayTemplateFactoryKnownFailures} from '@/lib/builder/template-factory/procedural-memory';

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
  const qualityCandidates=STOREFRONT_TEMPLATE_QUALITY_CANDIDATES.map(({template,manifest})=>{
    const structural=evaluateStorefrontTemplateQualityGate({template,manifest});
    return{
      templateKey:template.manifest.templateKey,
      templateVersion:template.manifest.templateVersion,
      status:manifest.status,
      qualityCandidate:true,
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
    if(!build.report.productOwnerReady)return[];
    const technicalIssues=build.report.issues.filter(issue=>issue.code!=='FACTORY_INTERNAL_VISUAL_REVIEW_REQUIRED');
    const preflight=evaluateTemplateFactoryPreflight(recipe);
    const failureReplays=replayTemplateFactoryKnownFailures(build);
    const replayIssues=failureReplays.filter(item=>!item.passed).map(item=>({
      code:'FACTORY_KNOWN_FAILURE_REPLAY',
      path:item.failureId,
      message:`Known failure replay failed: ${item.failureId}`,
      severity:'error' as const,
    }));
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
      structural:{ok:preflight.ok&&replayIssues.length===0&&technicalIssues.every(issue=>issue.severity!=='error'),issues:[...technicalIssues,...replayIssues]},
      productOwnerReady:build.report.productOwnerReady,
      proceduralMemory:{
        preflightOk:preflight.ok,
        preflightIssues:preflight.issues,
        failureReplays,
      },
    }];
  });
  return NextResponse.json({
    contract:'shoporation.template-factory-quality-catalog.v1',
    templates:[...templates,...qualityCandidates,...factoryCandidates],
  });
}
