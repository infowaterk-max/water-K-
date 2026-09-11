import { describe, expect, it } from 'vitest';
import { essentialOrderConfirmation, renderEmail, validateEmailDocument, type EmailDocument, type EmailRenderContext } from '../src/lib/email-builder';

const clone=()=>JSON.parse(JSON.stringify(essentialOrderConfirmation)) as EmailDocument;
const baseContext:EmailRenderContext={
  store:{name:'Demo Shop',siteUrl:'https://shop.example.com',logoUrl:null,supportEmail:'hello@example.com'},
  customer:{firstName:'<Richárd>',lastName:'Teszt',fullName:'<Richárd> Teszt',email:'buyer@example.com',type:'b2c'},
  order:{number:'WK-1001',subtotal:14990,shipping:1490,discount:1000,tax:0,total:15480,currency:'HUF',invoiceUrl:'https://shop.example.com/invoices/WK-1001',items:[{name:'Water-K <750 g>',variant:'Doboz',quantity:1,unitPrice:14990,lineTotal:14990}]},
  payment:{method:'bank_transfer',accountHolder:'Demo Kft.',bankName:'Teszt Bank',bankAccount:'HU12 <unsafe>',note:'Kérjük, a rendelési számot add meg.'},
  shipping:{method:'gls',carrier:'GLS',trackingNumber:'TRACK-1',trackingUrl:'https://tracking.example.com/TRACK-1',address:'Teszt utca 1.\n1234 Budapest'},
  billing:{address:'Számla utca 2.\n1234 Budapest'},
};

describe('Email Builder Foundation A',()=>{
  it('validates the Essential reference template',()=>{
    const result=validateEmailDocument(essentialOrderConfirmation);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('renders resolved transactional HTML and plain text while escaping dynamic content',()=>{
    const rendered=renderEmail(essentialOrderConfirmation,baseContext);
    expect(rendered.subject).toBe('Demo Shop · Rendelés visszaigazolása – WK-1001');
    expect(rendered.html).toContain('data-email-binding-key="customer.firstName"');
    expect(rendered.html).toContain('&lt;Richárd&gt;');
    expect(rendered.html).not.toContain('<Richárd>');
    expect(rendered.html).toContain('Water-K &lt;750 g&gt;');
    expect(rendered.html).not.toContain('Water-K <750 g>');
    expect(rendered.html).toContain('Banki átutalás adatai');
    expect(rendered.html).toContain('HU12 &lt;unsafe&gt;');
    expect(rendered.text).toContain('Kedves <Richárd>!');
    expect(rendered.text).toContain('Banki átutalás adatai');
    expect(rendered.text).not.toContain('<table');
  });

  it('hides conditionally disabled payment blocks',()=>{
    const context:EmailRenderContext={...baseContext,payment:{method:'card'}};
    const rendered=renderEmail(essentialOrderConfirmation,context);
    expect(rendered.html).not.toContain('Banki átutalás adatai');
  });

  it('fails validation for bindings outside the registry',()=>{
    const document=clone();
    const intro=document.blocks.find(block=>block.id==='intro');
    if(!intro)throw new Error('fixture missing intro');
    intro.content={...intro.content,text:'Titkos adat: {{internal.secret}}'};
    const result=validateEmailDocument(document);
    expect(result.ok).toBe(false);
    expect(result.errors.some(error=>error.includes('Unknown binding: internal.secret'))).toBe(true);
  });

  it('rejects unsupported block types at the document schema boundary',()=>{
    const document=JSON.parse(JSON.stringify(essentialOrderConfirmation)) as {blocks:Array<Record<string,unknown>>};
    document.blocks.push({id:'x',type:'custom-html',version:1,content:{html:'<script>alert(1)</script>'},style:{},responsive:{}});
    expect(validateEmailDocument(document).ok).toBe(false);
  });

  it('rejects unsafe CTA protocols during rendering',()=>{
    const document=clone();
    const account=document.blocks.find(block=>block.id==='account');
    if(!account)throw new Error('fixture missing account');
    account.content={...account.content,href:'javascript:alert(1)'};
    expect(()=>renderEmail(document,baseContext)).toThrow('UNSAFE_EMAIL_URL');
  });
});
