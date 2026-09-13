import Link from 'next/link';
import {ExistingCommerceEngineLibrary} from '@/components/admin/existing-commerce-engine-library';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getStorefrontExistingCommerceBundleForInstance} from '@/lib/builder/storefront-existing-commerce-server';

export const dynamic='force-dynamic';
export default async function ExistingCommerceEnginesAdminPage(){const scope=await requireCurrentStoreContext('catalog.manage');const bundle=await getStorefrontExistingCommerceBundleForInstance(scope.instanceId);return <section className="adminMain"><span className="eyebrow">Storefront · Existing Engine Closure</span><h1 className="sectionTitle">Finder, Composer és Configurator</h1><p className="lead">A közös E3–E7 motorok merchant-barát konfigurációja. A termék-, ár-, készlet-, kompatibilitási bizonyíték- és rendelési authority továbbra is a közös katalógus/checkout rétegben marad.</p><div className="actions"><Link className="btn" href="/admin/tartalom">Vissza a tartalomhoz</Link><Link className="btn btnPrimary" href="/admin/tartalom/builder">Visual Builder</Link></div><ExistingCommerceEngineLibrary initialRecords={bundle.records.map(({id,engineKind,configKey,label})=>({id,engineKind,configKey,label}))} attributes={bundle.attributes}/></section>}
