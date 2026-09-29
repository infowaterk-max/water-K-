import{describe,expect,it}from'vitest';
import{inspectStorefrontShopperContent,normalizeStorefrontShopperText}from'@/lib/builder/storefront-content-sanity';
import{buildRegisteredStorefrontTemplateFactoryCandidate}from'@/lib/builder/template-factory/recipe-registry';

describe('storefront shopper content sanity',()=>{
  it('normalizes literal escape sequences before shopper rendering',()=>{
    expect(normalizeStorefrontShopperText('Első\\n\\nMásodik\\térték')).toBe("Első\n\nMásodik érték");
  });

  it.each(['undefined','null','[object Object]','{"broken":"serialized"}','{{ unresolved }}'])('does not render serialization garbage or unresolved placeholders: %s',value=>{
    expect(normalizeStorefrontShopperText(value,'')).toBe('');
  });

  it('reports literal escape, serialization and placeholder failures with exact paths',()=>{
    const issues=inspectStorefrontShopperContent({a:'rossz\\nérték',b:'[object Object]',c:'{{ token }}'},'fixture');
    expect(issues.map(item=>item.code)).toEqual(expect.arrayContaining(['LITERAL_ESCAPE_TOKEN','SERIALIZATION_GARBAGE','UNRESOLVED_PLACEHOLDER']));
    expect(issues.map(item=>item.path)).toEqual(expect.arrayContaining(['fixture.a','fixture.b','fixture.c']));
  });

  it('keeps the Loot Vault Factory package free from shopper-visible content garbage',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(inspectStorefrontShopperContent(build.package)).toEqual([]);
    expect(build.report.issues.filter(item=>item.code==='FACTORY_SHOPPER_CONTENT_SANITY_BLOCK')).toEqual([]);
  });
});
