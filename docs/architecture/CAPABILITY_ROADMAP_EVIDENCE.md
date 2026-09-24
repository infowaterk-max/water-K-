# Capability Registry + Living Roadmap + Evidence Ledger

Ez a három registry egyetlen bizonyítási láncot alkot.

**Capability Registry** rögzíti, hogy a Shoperation ténylegesen milyen képességekkel rendelkezik, mely domain-ekhez tartoznak, ki a canonical authority, mely implementációk/contractok/API-k/DB/UI/permission/testek tartoznak hozzájuk, és milyen más capabilitykre támaszkodnak.

**Living Roadmap** nem kézi százaléklista. A capability állapotát a következő lifecycle szerint kezeli:

`planned → in-development → implemented-unverified → verified → accepted → production`

Egy capability csak akkor léphet előre, ha az Evidence Ledger megfelelő bizonyítékot tartalmaz.

**Evidence Ledger** a bizonyítási lánc append-only nyilvántartása:

`capability → implementation → contract → test → CI → acceptance → deployment/runtime`

Az Evidence Ledger nem authority. Azt bizonyítja, amit a canonical authority állít; nem írhatja át.

## Kapcsolat az Atlas 2.0-val

A következő self-knowledge leképezés alapja:

`file → domain → authority → capability → implementation/contract → evidence → roadmap state`

A capability-regiszter nem duplikálja a Domain Foundations truth ownershipot. A domain azt mondja meg, **ki birtokolja az igazságot**; a capability azt mondja meg, **milyen képesség épül erre az authority-ra és mivel bizonyítható**.
