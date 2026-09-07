export type EmailDesignTokens={
  colors:{background:string;surface:string;primary:string;secondary:string;text:string;muted:string;border:string};
  typography:{fontFamily:string;headingFontFamily:string;bodySize:number;smallSize:number;lineHeight:number};
  spacing:{xs:number;s:number;m:number;l:number;xl:number;xxl:number};
  radius:{button:number;card:number};
  container:{maxWidth:number};
};

export const defaultEmailDesignTokens:EmailDesignTokens={
  colors:{background:'#f6f4ef',surface:'#ffffff',primary:'#25483f',secondary:'#dfe8e2',text:'#1f2925',muted:'#6e7772',border:'#e3e6e3'},
  typography:{fontFamily:'Arial, Helvetica, sans-serif',headingFontFamily:'Georgia, Times, serif',bodySize:16,smallSize:12,lineHeight:1.55},
  spacing:{xs:6,s:10,m:16,l:24,xl:32,xxl:48},
  radius:{button:10,card:14},
  container:{maxWidth:620},
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
