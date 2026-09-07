import type { EmailDocument } from '../../types';

export const essentialOrderConfirmation:EmailDocument={
  schemaVersion:1,
  templateKey:'essential.order_confirmation',
  family:'essential',
  purpose:'transactional',
  language:'hu',
  subject:'{{store.name}} · Rendelés visszaigazolása – {{order.number}}',
  preheader:'Köszönjük a rendelésed, {{customer.firstName}}! A(z) {{order.number}} rendelést rögzítettük.',
  design:{},
  metadata:{systemTemplate:true,label:'Essential / Rendelés visszaigazolása'},
  blocks:[
    {id:'header',type:'header',version:1,content:{showLogo:true},style:{},responsive:{}},
    {id:'title',type:'heading',version:1,content:{text:'Köszönjük a rendelésed!',level:'h1',align:'left'},style:{},responsive:{}},
    {id:'intro',type:'text',version:1,content:{text:'Kedves {{customer.firstName}}! A(z) {{order.number}} rendelésed sikeresen rögzítettük.',align:'left'},style:{},responsive:{}},
    {id:'items',type:'order-items',version:1,content:{title:'A rendelés tartalma'},style:{},responsive:{}},
    {id:'summary',type:'order-summary',version:1,content:{title:'Összesítés'},style:{},responsive:{}},
    {id:'bank-transfer',type:'payment-info',version:1,content:{title:'Banki átutalás adatai'},style:{},responsive:{},conditions:{mode:'all',rules:[{field:'payment.method',operator:'equals',value:'bank_transfer'}]}},
    {id:'shipping-address',type:'address',version:1,content:{kind:'shipping',title:'Szállítási cím'},style:{},responsive:{}},
    {id:'billing-address',type:'address',version:1,content:{kind:'billing',title:'Számlázási cím'},style:{},responsive:{}},
    {id:'invoice',type:'button',version:1,content:{label:'Számla megnyitása',href:'{{order.invoiceUrl}}',align:'left'},style:{},responsive:{},conditions:{mode:'all',rules:[{field:'order.invoiceUrl',operator:'exists'}]}},
    {id:'account',type:'button',version:1,content:{label:'Rendeléseim megnyitása',href:'{{store.siteUrl}}/fiokom',align:'left'},style:{},responsive:{}},
    {id:'footer',type:'footer',version:1,content:{text:'{{store.name}} · tranzakciós értesítés'},style:{},responsive:{}},
  ],
};
