import{describe,expect,it}from'vitest';
import{renderEmail}from'../src/lib/email-builder/render/render-email';
import{essentialOrderConfirmation}from'../src/lib/email-builder/templates/essential/order-confirmation';

const context={store:{name:'Water-K',siteUrl:'https://example.com',supportEmail:'support@example.com'},customer:{firstName:'Anna'},order:{number:'SHOP-1',subtotal:10000,shipping:1000,discount:500,tax:0,total:10500,currency:'HUF',items:[{name:'Termék',variant:'750 g',quantity:1,unitPrice:10000,lineTotal:10000}]},payment:{method:'bank_transfer',accountHolder:'Minta Kft.',bankName:'Minta Bank',bankAccount:'HU00 0000',note:'Teszt'},shipping:{address:'Minta Anna\n2760 Nagykáta'},billing:{address:'Minta Anna\n2760 Nagykáta'}};

function documentWithRichText(href='https://example.com/segitseg'){
  const document=structuredClone(essentialOrderConfirmation);
  const intro=document.blocks.find(block=>block.id==='intro')!;
  intro.content={
    text:'Kedves {{customer.firstName}}! Segítség',
    align:'center',
    richText:[
      {type:'text',text:'Kedves ',marks:{bold:true}},
      {type:'binding',key:'customer.firstName',marks:{italic:true}},
      {type:'text',text:'! '},
      {type:'text',text:'Segítség',marks:{href}},
    ],
  };
  return document;
}

describe('Email Builder structured rich text',()=>{
  it('renders formatting, resolved bindings, links and alignment from structured data',()=>{
    const rendered=renderEmail(documentWithRichText(),context);
    expect(rendered.html).toContain('<strong style="font-weight:700">Kedves </strong>');
    expect(rendered.html).toContain('data-email-binding-key="customer.firstName"');
    expect(rendered.html).toContain('<em style="font-style:italic">');
    expect(rendered.html).toContain('>Anna</span>');
    expect(rendered.html).toContain('data-email-inline-link="true"');
    expect(rendered.html).toContain('text-align:center');
    expect(rendered.text).toContain('Kedves Anna! Segítség');
  });

  it('rejects unsafe rich-text links before rendering or activation',()=>{
    expect(()=>renderEmail(documentWithRichText('javascript:alert(1)'),context)).toThrow(/EMAIL_DOCUMENT_INVALID/);
  });
});
