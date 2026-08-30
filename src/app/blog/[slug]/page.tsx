import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicContentBySlug } from '@/lib/content/server';

export const dynamic='force-dynamic';

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params,item=await getPublicContentBySlug('blog',slug);
  if(!item)return{};
  return{title:item.seoTitle??item.title,description:item.seoDescription??item.excerpt??undefined,alternates:{canonical:`/blog/${item.slug}`},openGraph:{type:'article',title:item.seoTitle??item.title,description:item.seoDescription??item.excerpt??undefined,url:`/blog/${item.slug}`,publishedTime:item.publishedAt??undefined,modifiedTime:item.updatedAt}};
}

export default async function BlogArticle({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params,item=await getPublicContentBySlug('blog',slug);if(!item)notFound();
  const base=(process.env.NEXT_PUBLIC_SITE_URL??'https://water-k-native.vercel.app').replace(/\/$/,'');
  const paragraphs=item.body.split(/\n\s*\n/).filter(Boolean);
  const structured={ '@context':'https://schema.org','@type':'BlogPosting',headline:item.title,description:item.seoDescription??item.excerpt??undefined,datePublished:item.publishedAt??item.createdAt,dateModified:item.updatedAt,mainEntityOfPage:`${base}/blog/${item.slug}`,publisher:{'@type':'Organization',name:'Water-K',url:base} };
  return <main className="section"><article className="shell confirmationShell"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured)}}/><span className="eyebrow">Blog</span><h1 className="sectionTitle">{item.title}</h1>{item.excerpt&&<p className="lead">{item.excerpt}</p>}<div className="featurePanel">{paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div></article></main>;
}
