import type { EmailBlock, EmailBlockType, EmailDesignOverride } from './types';

export type EmailBlockBlueprint={
  type:EmailBlockType;
  content?:Record<string,unknown>;
  style?:Record<string,unknown>;
  responsive?:EmailBlock['responsive'];
  conditions?:EmailBlock['conditions'];
};

export type EmailSectionDefinition={
  id:string;
  name:string;
  description:string;
  category:'Tartalom'|'Commerce'|'Rendszer';
  icon:string;
  blocks:EmailBlockBlueprint[];
};

export type EmailPresetDefinition={
  id:string;
  name:string;
  description:string;
  badge:string;
  subject:string;
  preheader:string;
  design:EmailDesignOverride;
  blocks:EmailBlockBlueprint[];
};

const bankTransferCondition:NonNullable<EmailBlock['conditions']>={
  mode:'all',
  rules:[{field:'payment.method',operator:'equals',value:'bank_transfer'}],
};

export const emailSectionLibrary:EmailSectionDefinition[]=[
  {
    id:'essential-intro',
    name:'Köszöntő fejléc',
    description:'Márkázott fejléc, főcím és személyes köszöntő.',
    category:'Tartalom',
    icon:'✦',
    blocks:[
      {type:'header',content:{showLogo:true}},
      {type:'heading',content:{text:'Köszönjük a rendelésed!',level:'h1',align:'left'}},
      {type:'text',content:{text:'Kedves {{customer.firstName}}!\nA(z) {{order.number}} rendelésed sikeresen rögzítettük.',align:'left'}},
    ],
  },
  {
    id:'essential-order',
    name:'Rendelés részletei',
    description:'Rendelési tételek és végösszeg egy egységben.',
    category:'Commerce',
    icon:'▤',
    blocks:[
      {type:'order-items',content:{title:'A rendelés tartalma'}},
      {type:'order-summary',content:{title:'Összesítés'}},
    ],
  },
  {
    id:'essential-payment',
    name:'Banki átutalás',
    description:'Fizetési adatok, csak banki átutalás esetén.',
    category:'Commerce',
    icon:'¤',
    blocks:[
      {type:'payment-info',content:{title:'Banki átutalás adatai'},conditions:bankTransferCondition},
    ],
  },
  {
    id:'essential-addresses',
    name:'Szállítás és számlázás',
    description:'Szállítási és számlázási cím egymás után.',
    category:'Commerce',
    icon:'⌂',
    blocks:[
      {type:'address',content:{kind:'shipping',title:'Szállítási cím'}},
      {type:'address',content:{kind:'billing',title:'Számlázási cím'}},
    ],
  },
  {
    id:'essential-actions',
    name:'Ügyfélműveletek',
    description:'Biztonságos CTA-k a webshophoz és a rendelés kezeléséhez.',
    category:'Tartalom',
    icon:'→',
    blocks:[
      {type:'button',content:{label:'Rendeléseim megnyitása',href:'{{store.siteUrl}}',align:'left'}},
    ],
  },
  {
    id:'essential-closing',
    name:'Lezárás',
    description:'Finom elválasztó és márkázott lábléc.',
    category:'Rendszer',
    icon:'▂',
    blocks:[
      {type:'divider',content:{}},
      {type:'footer',content:{text:'{{store.name}} · tranzakciós értesítés'}},
    ],
  },
];

const balancedBlocks:EmailBlockBlueprint[]=[
  {type:'header',content:{showLogo:true}},
  {type:'heading',content:{text:'Köszönjük a rendelésed!',level:'h1',align:'left'}},
  {type:'text',content:{text:'Kedves {{customer.firstName}}!\nA(z) {{order.number}} rendelésed sikeresen rögzítettük.',align:'left'}},
  {type:'order-items',content:{title:'A rendelés tartalma'}},
  {type:'order-summary',content:{title:'Összesítés'}},
  {type:'payment-info',content:{title:'Banki átutalás adatai'},conditions:bankTransferCondition},
  {type:'address',content:{kind:'shipping',title:'Szállítási cím'}},
  {type:'address',content:{kind:'billing',title:'Számlázási cím'}},
  {type:'button',content:{label:'Rendeléseim megnyitása',href:'{{store.siteUrl}}',align:'left'}},
  {type:'footer',content:{text:'{{store.name}} · tranzakciós értesítés'}},
];

export const emailPresetLibrary:EmailPresetDefinition[]=[
  {
    id:'essential-balanced',
    name:'Essential · Kiegyensúlyozott',
    description:'A teljes rendelés-visszaigazolás klasszikus, jól áttekinthető felépítéssel.',
    badge:'Ajánlott',
    subject:'{{store.name}} · Rendelés visszaigazolása – {{order.number}}',
    preheader:'Köszönjük a rendelésed, {{customer.firstName}}! A(z) {{order.number}} rendelést rögzítettük.',
    design:{
      colors:{background:'#f3f6f0',surface:'#ffffff',primary:'#2f6f3e',secondary:'#eef3e8',text:'#17231a',muted:'#687268',border:'#dfe5dc'},
      typography:{fontFamily:'Arial, Helvetica, sans-serif',headingFontFamily:'Georgia, Times, serif',bodySize:14,smallSize:11,lineHeight:1.55},
      spacing:{xs:6,s:10,m:16,l:22,xl:30,xxl:38},
      radius:{button:8,card:16},
      container:{maxWidth:620},
    },
    blocks:balancedBlocks,
  },
  {
    id:'essential-compact',
    name:'Essential · Kompakt',
    description:'Rövidebb, gyorsan áttekinthető tranzakciós változat kevés vizuális sallanggal.',
    badge:'Kompakt',
    subject:'{{store.name}} · {{order.number}} rendelésed megérkezett',
    preheader:'A rendelésedet sikeresen rögzítettük.',
    design:{
      colors:{background:'#f6f7f5',surface:'#ffffff',primary:'#176f5e',secondary:'#f2f5f3',text:'#17231a',muted:'#6f7772',border:'#e0e5e2'},
      typography:{fontFamily:'Arial, Helvetica, sans-serif',headingFontFamily:'Arial, Helvetica, sans-serif',bodySize:13,smallSize:10,lineHeight:1.45},
      spacing:{xs:4,s:8,m:12,l:16,xl:22,xxl:28},
      radius:{button:6,card:10},
      container:{maxWidth:560},
    },
    blocks:[
      {type:'header',content:{showLogo:true}},
      {type:'heading',content:{text:'Rendelésed rögzítettük',level:'h1',align:'left'}},
      {type:'text',content:{text:'Szia {{customer.firstName}}! A(z) {{order.number}} rendelésed megérkezett hozzánk.',align:'left'}},
      {type:'order-items',content:{title:'Tételek'}},
      {type:'order-summary',content:{title:'Fizetendő'}},
      {type:'payment-info',content:{title:'Átutalási adatok'},conditions:bankTransferCondition},
      {type:'footer',content:{text:'{{store.name}} · rendelési értesítés'}},
    ],
  },
  {
    id:'essential-premium',
    name:'Essential · Prémium',
    description:'Tágasabb, elegánsabb változat erősebb márkaélménnyel és szerkesztőségi tipográfiával.',
    badge:'Prémium',
    subject:'{{store.name}} · Köszönjük a vásárlásod – {{order.number}}',
    preheader:'Minden rendben, {{customer.firstName}} — a rendelésedet megkaptuk.',
    design:{
      colors:{background:'#f5f2ec',surface:'#fffdf9',primary:'#176f5e',secondary:'#edf2ec',text:'#18231d',muted:'#6f756f',border:'#dedfd8'},
      typography:{fontFamily:'Arial, Helvetica, sans-serif',headingFontFamily:'Georgia, Times, serif',bodySize:15,smallSize:11,lineHeight:1.65},
      spacing:{xs:8,s:12,m:18,l:26,xl:36,xxl:52},
      radius:{button:10,card:20},
      container:{maxWidth:660},
    },
    blocks:[
      {type:'header',content:{showLogo:true}},
      {type:'spacer',content:{size:'s'}},
      {type:'heading',content:{text:'Köszönjük, hogy minket választottál!',level:'h1',align:'center'}},
      {type:'text',content:{text:'Kedves {{customer.firstName}}!\nA(z) {{order.number}} rendelésed biztonságosan megérkezett hozzánk.',align:'center'}},
      {type:'spacer',content:{size:'s'}},
      {type:'order-items',content:{title:'A csomagod tartalma'}},
      {type:'order-summary',content:{title:'Rendelés összesen'}},
      {type:'payment-info',content:{title:'Banki átutalás'},conditions:bankTransferCondition},
      {type:'address',content:{kind:'shipping',title:'Ide érkezik a csomag'}},
      {type:'button',content:{label:'Webshop megnyitása',href:'{{store.siteUrl}}',align:'center'}},
      {type:'divider',content:{}},
      {type:'footer',content:{text:'Köszönjük, hogy velünk vagy! · {{store.name}}'}},
    ],
  },
];
