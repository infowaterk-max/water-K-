import Link from 'next/link';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {updateStorefrontSocialLinksAction} from './actions';

export const dynamic='force-dynamic';

type Props={searchParams:Promise<{social?:string}>};
const notices:Record<string,{kind:'success'|'error';text:string}>={
  saved:{kind:'success',text:'A közösségi média hivatkozások mentve. A storefront lábléce automatikusan frissül.'},
  invalid:{kind:'error',text:'Legalább egy közösségi média URL érvénytelen. HTTPS címet adj meg, és a link a kiválasztott szolgáltató saját domainjére mutasson.'},
  forbidden:{kind:'error',text:'Nincs jogosultságod a webshop megjelenési beállításainak módosításához.'},
  error:{kind:'error',text:'A közösségi média beállításokat nem tekintjük elmentettnek. Próbáld újra.'},
};
const socialRecord=(value:unknown)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return{} as Record<string,string>;
  const source=value as Record<string,unknown>,result:Record<string,string>={};
  for(const key of ['facebook','instagram','youtube','tiktok','x','twitch','linkedin','pinterest']){
    if(typeof source[key]==='string')result[key]=String(source[key]);
  }
  return result;
};

export default async function StorefrontAppearanceSettingsPage({searchParams}:Props){
  const scope=await requireCurrentStoreContext('store.manage');
  const admin=createAdminClient();
  const[{data,error},query]=await Promise.all([
    admin.from('webshop_instances').select('brand_name,name,storefront_config').eq('id',scope.instanceId).maybeSingle(),
    searchParams,
  ]);
  const config=data?.storefront_config&&typeof data.storefront_config==='object'&&!Array.isArray(data.storefront_config)
    ?data.storefront_config as Record<string,unknown>
    :{};
  const social=socialRecord(config.socialLinks);
  const notice=query.social?notices[query.social]:null;

  return <section className="adminMain">
    <span className="eyebrow">Shoperation · Beállítások</span>
    <h1 className="sectionTitle">Webshop megjelenés és közösségi média</h1>
    <p className="lead">A storefront közös, tenant-szintű megjelenési adatai. A sablonok ugyanebből az authorityból olvassák a közösségi profilokat, ezért nem kell sablononként külön linkeket karbantartani.</p>

    {notice&&<div className={notice.kind==='success'?'successNotice':'errorNotice'} role={notice.kind==='error'?'alert':'status'}>{notice.text}</div>}
    {error&&<div className="errorNotice" role="alert">A webshop megjelenési adatai most nem tölthetők be. Biztonsági okból a mentés nem érhető el.</div>}

    {!error&&<article className="card">
      <div className="adminToolbar">
        <div><span className="eyebrow">Közösségi profilok</span><h2>{data?.brand_name||data?.name||'Webshop'}</h2></div>
        <Link className="btn btnGhost" href="/fiokom">Storefront ellenőrzése</Link>
      </div>
      <p className="muted">Csak a kitöltött profilok jelennek meg. Ha minden mező üres, a teljes „Kövess minket” blokk eltűnik a láblécből, így nem marad üres vagy nem kattintható díszelem.</p>
      <form action={updateStorefrontSocialLinksAction} className="adminForm">
        <label>Facebook URL<input name="facebook" type="url" inputMode="url" placeholder="https://www.facebook.com/..." defaultValue={social.facebook??''}/></label>
        <label>Instagram URL<input name="instagram" type="url" inputMode="url" placeholder="https://www.instagram.com/..." defaultValue={social.instagram??''}/></label>
        <label>YouTube URL<input name="youtube" type="url" inputMode="url" placeholder="https://www.youtube.com/@..." defaultValue={social.youtube??''}/></label>
        <label>TikTok URL<input name="tiktok" type="url" inputMode="url" placeholder="https://www.tiktok.com/@..." defaultValue={social.tiktok??''}/></label>
        <label>X URL<input name="x" type="url" inputMode="url" placeholder="https://x.com/..." defaultValue={social.x??''}/></label>
        <label>Twitch URL<input name="twitch" type="url" inputMode="url" placeholder="https://www.twitch.tv/..." defaultValue={social.twitch??''}/></label>
        <label>LinkedIn URL<input name="linkedin" type="url" inputMode="url" placeholder="https://www.linkedin.com/company/..." defaultValue={social.linkedin??''}/></label>
        <label>Pinterest URL<input name="pinterest" type="url" inputMode="url" placeholder="https://www.pinterest.com/..." defaultValue={social.pinterest??''}/></label>
        <div className="actions">
          <button className="btn btnPrimary" type="submit">Közösségi profilok mentése</button>
          <Link className="btn btnGhost" href="/admin/beallitasok">Vissza a beállításokhoz</Link>
        </div>
      </form>
    </article>}

    <article className="card">
      <strong>Megjelenítési szabály</strong>
      <p className="muted">A sablon csak a vizuális megjelenést adja. A profil URL-eket a webshop beállításai birtokolják. A storefront social komponens valódi linkeket renderel, hozzáférhető címkével; hiányzó URL esetén nem készít placeholder vagy # hivatkozást.</p>
    </article>
  </section>;
}
