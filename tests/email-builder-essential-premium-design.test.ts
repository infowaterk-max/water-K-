import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
import{renderEmail}from'../src/lib/email-builder/render/render-email';
import{essentialOrderConfirmation}from'../src/lib/email-builder/templates/essential/order-confirmation';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const context={store:{name:'Water-K',siteUrl:'https://example.com',supportEmail:'support@example.com'},customer:{firstName:'Anna'},order:{number:'SHOP-1',subtotal:10000,shipping:1000,discount:500,tax:0,total:10500,currency:'HUF',items:[{name:'Termék',variant:'750 g',quantity:1,unitPrice:10000,lineTotal:10000}]},payment:{method:'bank_transfer',accountHolder:'Minta Kft.',bankName:'Minta Bank',bankAccount:'HU00 0000 0000 0000 0000 0000 0000',note:'Teszt'},shipping:{address:'Minta Anna\n2760 Nagykáta'},billing:{address:'Minta Anna\n2760 Nagykáta'}};

describe('Email Builder premium Essential design',()=>{
  it('renders the premium shell, summary surface and mobile-safe IBAN class',()=>{
    const rendered=renderEmail(essentialOrderConfirmation,context);
    expect(rendered.html).toContain('border-top:4px solid');
    expect(rendered.html).toContain('class="email-iban"');
    expect(rendered.html).toContain('word-break:break-all!important');
    expect(rendered.html).toContain('#e9efe9');
    expect(rendered.html).toContain('Segítség:');
  });

  it('keeps live preview tenant-scoped and layers Brand Kit tokens at render time',()=>{
    const source=read('src/app/api/admin/email-builder/preview/route.ts');
    expect(source).toContain(".eq('instance_id',scope.instanceId)");
    expect(source).toContain(".eq('template_key',document.templateKey)");
    expect(source).toContain('applyEmailBrandDesign(document,brandKit.tokens)');
    expect(source).toContain('logoUrl:brandKit.logo_url');
  });

  it('provides a Brand Kit admin surface without activation side effects',()=>{
    const page=read('src/app/admin/email-sablonok/brand-kit/page.tsx');
    const editor=read('src/components/admin/email-brand-kit-editor.tsx');
    const library=read('src/app/admin/email-sablonok/page.tsx');
    expect(page).toContain('EmailBrandKitEditor');
    expect(editor).toContain("fetch('/api/admin/email-builder/brand-kit'");
    expect(editor).toContain('A mentés nem aktivál és nem küld e-mailt.');
    expect(editor).not.toContain('/activate');
    expect(library).toContain('/admin/email-sablonok/brand-kit');
  });
});
