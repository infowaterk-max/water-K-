import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name:string; value:string; options?:CookieOptions };
const MUTATING=new Set(['POST','PUT','PATCH','DELETE']);
function nextResponse(request:NextRequest){return NextResponse.next({request:{headers:request.headers}})}
function blockedAdminMutation(request:NextRequest){if(!request.nextUrl.pathname.startsWith('/api/admin/')||!MUTATING.has(request.method))return false;const origin=request.headers.get('origin');if(!origin)return false;try{return new URL(origin).origin!==request.nextUrl.origin}catch{return true}}
function isAdminPage(request:NextRequest){return request.nextUrl.pathname==='/admin'||request.nextUrl.pathname.startsWith('/admin/')}
function withCookies(response:NextResponse,cookies:CookieToSet[]){cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));return response}
function accountRedirect(request:NextRequest,reason:'admin-config'|'login'|'forbidden',cookies:CookieToSet[]){const target=request.nextUrl.clone();target.pathname='/fiokom';target.search='';target.searchParams.set('reason',reason);return withCookies(NextResponse.redirect(target,307),cookies)}

export async function middleware(request:NextRequest){
  if(blockedAdminMutation(request))return NextResponse.json({error:'Cross-origin admin mutation blocked.'},{status:403});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){return isAdminPage(request)?accountRedirect(request,'admin-config',[]):nextResponse(request)}

  const pendingCookies:CookieToSet[]=[];
  const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll()},setAll(cookiesToSet:CookieToSet[]){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));pendingCookies.push(...cookiesToSet)}}});
  const{data:{user},error:authError}=await supabase.auth.getUser();

  if(isAdminPage(request)){
    if(authError||!user)return accountRedirect(request,'login',pendingCookies);
    const configuredSlug=process.env.WEBSHOP_INSTANCE_SLUG?.trim().toLowerCase()||null;
    const{data:allowed,error:accessError}=await supabase.rpc('can_access_admin_context',{p_instance_slug:configuredSlug});
    if(accessError||allowed!==true)return accountRedirect(request,'forbidden',pendingCookies);
  }

  return withCookies(nextResponse(request),pendingCookies);
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
