import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PERFORMANCE_CONTRACT_VERSION='shoporation.storefront-performance-contract.v1' as const;

export const STOREFRONT_TEMPLATE_PERFORMANCE_BUDGET=Object.freeze({
  soft:Object.freeze({
    sectionCount:24,
    nodeCount:160,
    maxDepth:8,
    eagerImageCount:2,
    visualLayerCount:32,
    styleDeclarationCount:900,
  }),
  hard:Object.freeze({
    sectionCount:36,
    nodeCount:240,
    maxDepth:10,
    eagerImageCount:4,
    visualLayerCount:48,
    styleDeclarationCount:1400,
  }),
  runtime:Object.freeze({
    lcpMs:2500,
    inpMs:200,
    cls:0.1,
    longTaskMs:50,
  }),
} as const);

export type StorefrontPerformanceMetrics={
  sectionCount:number;
  nodeCount:number;
  maxDepth:number;
  imageNodeCount:number;
  eagerImageCount:number;
  artDirectedImageCount:number;
  visualLayerCount:number;
  styleDeclarationCount:number;
};

export type StorefrontPerformanceIssue={
  code:string;
  severity:'warning'|'error';
  metric:keyof Pick<StorefrontPerformanceMetrics,'sectionCount'|'nodeCount'|'maxDepth'|'eagerImageCount'|'visualLayerCount'|'styleDeclarationCount'>;
  actual:number;
  limit:number;
};

const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function countStyleDeclarations(value:unknown):number{
  if(!isRecord(value))return 0;
  return Object.values(value).reduce<number>((sum,child)=>sum+(isRecord(child)?countStyleDeclarations(child):1),0);
}

function nodeStyleDeclarations(node:StorefrontComponentNode):number{
  return Object.entries(node.config).reduce<number>((sum,[key,value])=>sum+((key==='style'||key.endsWith('Style'))?countStyleDeclarations(value):0),0);
}

export function measureStorefrontPerformance(document:StorefrontPageDocument):StorefrontPerformanceMetrics{
  const metrics:StorefrontPerformanceMetrics={
    sectionCount:document.sections.length,
    nodeCount:0,
    maxDepth:0,
    imageNodeCount:0,
    eagerImageCount:0,
    artDirectedImageCount:0,
    visualLayerCount:0,
    styleDeclarationCount:0,
  };
  const walk=(node:StorefrontComponentNode,depth:number)=>{
    metrics.nodeCount+=1;
    metrics.maxDepth=Math.max(metrics.maxDepth,depth);
    metrics.styleDeclarationCount+=nodeStyleDeclarations(node);
    if(node.componentKey==='visual.layer')metrics.visualLayerCount+=1;
    if(node.componentKey==='content.image'){
      metrics.imageNodeCount+=1;
      if(node.config.loading==='eager')metrics.eagerImageCount+=1;
      if(isRecord(node.config.artDirection)&&Object.keys(node.config.artDirection).length>0)metrics.artDirectedImageCount+=1;
    }
    for(const child of node.children??[])walk(child,depth+1);
  };
  for(const section of document.sections)walk(section,1);
  return metrics;
}

const BUDGET_METRICS=['sectionCount','nodeCount','maxDepth','eagerImageCount','visualLayerCount','styleDeclarationCount'] as const;
type BudgetMetric=typeof BUDGET_METRICS[number];

export function evaluateStorefrontPerformance(document:StorefrontPageDocument):{ok:boolean;metrics:StorefrontPerformanceMetrics;issues:StorefrontPerformanceIssue[]}{
  const metrics=measureStorefrontPerformance(document);
  const issues:StorefrontPerformanceIssue[]=[];
  for(const metric of BUDGET_METRICS){
    const actual=metrics[metric];
    const hard=STOREFRONT_TEMPLATE_PERFORMANCE_BUDGET.hard[metric];
    const soft=STOREFRONT_TEMPLATE_PERFORMANCE_BUDGET.soft[metric];
    if(actual>hard){
      issues.push({code:`STOREFRONT_PERFORMANCE_HARD_BUDGET_${metric.toUpperCase()}`,severity:'error',metric,actual,limit:hard});
    }else if(actual>soft){
      issues.push({code:`STOREFRONT_PERFORMANCE_SOFT_BUDGET_${metric.toUpperCase()}`,severity:'warning',metric,actual,limit:soft});
    }
  }
  return{ok:!issues.some(issue=>issue.severity==='error'),metrics,issues};
}

export function assertStorefrontPerformance(document:StorefrontPageDocument):StorefrontPerformanceMetrics{
  const result=evaluateStorefrontPerformance(document);
  const errors=result.issues.filter(issue=>issue.severity==='error');
  if(errors.length)throw new Error(`STOREFRONT_PERFORMANCE_BUDGET_EXCEEDED:${errors.map(issue=>issue.metric).join(',')}`);
  return result.metrics;
}
