import{formatHuf}from'@/lib/catalog';

export type AccountReturnCaseCard={
 id:string;
 orderNumber?:string|null;
 reason:string;
 status:string;
 refundAmountGrossHuf?:number|null;
 refundReference?:string|null;
 requestedAt:string;
};

const statusLabel:Record<string,string>={
 requested:'Beérkezett',
 approved:'Jóváhagyva',
 rejected:'Elutasítva',
 received:'Visszaérkezett',
 refund_pending:'Visszatérítés folyamatban',
 refunded:'Visszatérítve',
 closed:'Lezárva',
};

const humanReason=(value:string)=>value.replaceAll('_',' ');

export function AccountReturnCaseGrid({cases,emptyText='Még nincs visszaküldési vagy visszatérítési ügyed.'}:{cases:AccountReturnCaseCard[];emptyText?:string}){
 if(!cases.length)return <div className="accountReturnCaseGrid accountReturnCaseGridEmpty"><article className="accountReturnCaseTile accountReturnCaseTileEmpty"><span className="badge">Nincs aktív ügy</span><p className="muted">{emptyText}</p></article></div>;
 return <div className="accountReturnCaseGrid">{cases.map(item=><article className="accountReturnCaseTile" key={item.id}>
   <div className="accountReturnCaseTileHead"><div><span className="badge">{statusLabel[item.status]??item.status}</span><h3>{item.orderNumber??'Visszaküldési ügy'}</h3></div><time dateTime={item.requestedAt}>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(item.requestedAt))}</time></div>
   <dl className="accountReturnCaseMeta">
     <div><dt>Ok</dt><dd>{humanReason(item.reason)}</dd></div>
     <div><dt>Állapot</dt><dd>{statusLabel[item.status]??item.status}</dd></div>
     <div><dt>Visszatérítés</dt><dd>{item.refundAmountGrossHuf==null?'Még nincs':formatHuf(item.refundAmountGrossHuf)}{item.refundReference?<small>{item.refundReference}</small>:null}</dd></div>
   </dl>
 </article>)}</div>;
}
