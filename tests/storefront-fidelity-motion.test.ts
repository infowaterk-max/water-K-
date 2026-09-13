import {describe,expect,it} from 'vitest';
import {resolveStorefrontMotion,resolveStorefrontMotionStyles,sanitizeStorefrontMotionValue} from '@/lib/builder/storefront-fidelity-motion';

describe('Visual Builder fidelity motion',()=>{
  it('resolves responsive bounded motion without arbitrary keyframes',()=>{
    const config={base:{preset:'rise',durationMs:460,distancePx:28,easing:'decelerate'},mobile:{durationMs:300,distancePx:14}};
    expect(resolveStorefrontMotion(config,'desktop')).toMatchObject({preset:'rise',durationMs:460,distancePx:28,easing:'decelerate'});
    expect(resolveStorefrontMotion(config,'mobile')).toMatchObject({preset:'rise',durationMs:300,distancePx:14,easing:'decelerate'});
    const styles=resolveStorefrontMotionStyles(config,'mobile');
    expect(styles.initial).toMatchObject({opacity:0,transform:'translate3d(0, 14px, 0)'});
    expect(styles.active).toEqual({opacity:1,transform:'none'});
    expect(String(styles.transition.transition)).toContain('opacity 300ms');
    expect(String(styles.transition.transition)).toContain('transform 300ms');
  });

  it('clamps expensive timing and geometry values',()=>{
    expect(sanitizeStorefrontMotionValue({preset:'scale-in',durationMs:99_000,delayMs:50_000,distancePx:999,scaleFrom:.1})).toMatchObject({
      preset:'scale-in',durationMs:1200,delayMs:1000,distancePx:120,scaleFrom:.7,
    });
  });

  it('turns motion off for reduced-motion users',()=>{
    const motion=resolveStorefrontMotion({preset:'rise',durationMs:600,delayMs:300},'desktop',true);
    expect(motion).toMatchObject({preset:'none',durationMs:0,delayMs:0,reducedMotion:true});
    expect(resolveStorefrontMotionStyles({preset:'rise'},'desktop',true)).toEqual({initial:{},active:{},transition:{}});
  });

  it('rejects unknown motion scripts, easing and triggers',()=>{
    expect(sanitizeStorefrontMotionValue({preset:'javascript:alert(1)',easing:'spring(eval)',trigger:'scroll-script'})).toEqual({});
  });
});
