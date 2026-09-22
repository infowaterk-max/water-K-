import {describe,expect,it} from 'vitest';
import {resolveStorefrontTypography,sanitizeStorefrontTypographyValue} from '@/lib/builder/storefront-fidelity-typography';

describe('Visual Builder fidelity typography',()=>{
  it('resolves safe responsive typography with inheritance',()=>{
    const config={
      base:{fontToken:'display',fontWeight:700,lineHeight:.9,letterSpacingEm:-.04,maxWidthCh:14},
      mobile:{fluidSize:{minRem:2.4,maxRem:3.2,preferredVw:11},maxWidthCh:12,preserveLineBreaks:true},
    };
    expect(resolveStorefrontTypography(config,'desktop')).toMatchObject({
      fontFamily:'var(--shoporation-display-font, var(--shoporation-heading-font, Georgia, serif))',
      fontWeight:700,
      lineHeight:.9,
      letterSpacing:'-0.04em',
      maxWidth:'14ch',
    });
    expect(resolveStorefrontTypography(config,'mobile')).toMatchObject({
      fontSize:'clamp(2.4rem, 11vw, 3.2rem)',
      maxWidth:'12ch',
      whiteSpace:'pre-line',
    });
  });

  it('clamps expert numeric input to bounded typography ranges',()=>{
    expect(sanitizeStorefrontTypographyValue({fontSizeRem:999,fontWeight:2000,lineHeight:9,letterSpacingEm:-9,maxWidthCh:1000})).toMatchObject({
      fontSizeRem:12,
      fontWeight:900,
      lineHeight:2.5,
      letterSpacingEm:-.12,
      maxWidthCh:100,
    });
  });

  it('does not accept external font URLs or unknown typography enums',()=>{
    const sanitized=sanitizeStorefrontTypographyValue({fontToken:'https://evil.test/font.woff2',textTransform:'blink',textAlign:'justify',fontStyle:'oblique'});
    expect(sanitized).toEqual({});
  });

  it('normalizes an inverted fluid size range without emitting invalid CSS',()=>{
    const style=resolveStorefrontTypography({fluidSize:{minRem:6,maxRem:2,preferredVw:200}},'desktop');
    expect(style.fontSize).toBe('clamp(6rem, 20vw, 6rem)');
  });
});
