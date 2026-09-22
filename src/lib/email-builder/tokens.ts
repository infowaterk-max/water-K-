export type EmailDesignTokens={
  colors:{background:string;surface:string;primary:string;secondary:string;text:string;muted:string;border:string};
  typography:{fontFamily:string;headingFontFamily:string;bodySize:number;smallSize:number;lineHeight:number};
  spacing:{xs:number;s:number;m:number;l:number;xl:number;xxl:number};
  radius:{button:number;card:number};
  container:{maxWidth:number};
};

export const defaultEmailDesignTokens:EmailDesignTokens={
  colors:{background:'#f3f0e9',surface:'#fffdf9',primary:'#2a665b',secondary:'#e9efe9',text:'#1f2925',muted:'#6b756f',border:'#dddcd5'},
  typography:{fontFamily:'Arial, Helvetica, sans-serif',headingFontFamily:'Georgia, Times, serif',bodySize:15,smallSize:12,lineHeight:1.6},
  spacing:{xs:6,s:10,m:16,l:24,xl:36,xxl:52},
  radius:{button:12,card:20},
  container:{maxWidth:640},
};

export function mergeEmailDesignTokens(overrides:unknown):EmailDesignTokens{
  if(!overrides||typeof overrides!=='object')return defaultEmailDesignTokens;
  const source=overrides as Partial<EmailDesignTokens>;
  return{
    colors:{...defaultEmailDesignTokens.colors,...(source.colors??{})},
    typography:{...defaultEmailDesignTokens.typography,...(source.typography??{})},
    spacing:{...defaultEmailDesignTokens.spacing,...(source.spacing??{})},
    radius:{...defaultEmailDesignTokens.radius,...(source.radius??{})},
    container:{...defaultEmailDesignTokens.container,...(source.container??{})},
  };
}
