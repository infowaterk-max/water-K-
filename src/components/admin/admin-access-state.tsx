import Link from 'next/link';
import { ADMIN_UI_ACCESS_CONTRACT_VERSION, type AdminUiAccessDecision } from '@/lib/admin/ui-access-contract';

type Props={
  decision:AdminUiAccessDecision;
  title?:string;
  description?:string;
  upgradeHref?:string;
};

export function AdminAccessStateNotice({
  decision,
  title,
  description,
  upgradeHref='/admin/csomag',
}:Props){
  if(decision.mode==='enabled'||decision.mode==='hidden')return null;

  const isReadOnly=decision.mode==='read-only';
  const resolvedTitle=title??(isReadOnly?'Csak olvasási jogosultság.':'Ehhez a funkcióhoz magasabb csomag szükséges.');
  const resolvedDescription=description??(isReadOnly
    ?'Ezt a nézetet megtekintheted, de módosító műveletet a jelenlegi jogosultsággal nem indíthatsz.'
    :'A komponens jelenlegi csomagban nem aktív. A csomagkezelésben ellenőrizheted az elérhető képességeket.');

  return <div
    className="adminAuditNotice"
    data-access-contract={ADMIN_UI_ACCESS_CONTRACT_VERSION}
    data-access-id={decision.id}
    data-access-state={decision.mode}
  >
    <strong>{resolvedTitle}</strong>
    <p>{resolvedDescription}</p>
    {decision.mode==='upgrade-required'&&<Link className="btn btnGhost" href={upgradeHref}>Csomagkezelés</Link>}
  </div>;
}
