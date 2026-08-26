# Water-K Native Store

A Water-K következő generációs, teljesen saját fejlesztésű webáruháza.

Ez a branch nem WordPress projekt. A korábbi WordPress prototípus külön branch-en marad archívumként.

## Első mérföldkő
A repository már tartalmazza a storefrontot, termékkatalógust, termékoldalakat, kosár/pénztár vázat, saját adminfelületet, Supabase sémát és a K&H/Foxpost/GLS/MPL adapterarchitektúrát.

## Indítás
1. `npm install`
2. `.env.example` alapján `.env.local`
3. Supabase projekt és migráció
4. `npm run dev`

Külső integrációk csak hivatalos sandbox/teszt hitelesítő adatok birtokában aktiválhatók.
