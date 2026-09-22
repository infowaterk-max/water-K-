export type CheckoutAccountBenefitFlags={
  loyalty:boolean;
  orderHistory:boolean;
  returns:boolean;
  digitalDownloads:boolean;
};

export type CheckoutAccountBenefit={key:keyof CheckoutAccountBenefitFlags;label:string};

const LABELS:Record<keyof CheckoutAccountBenefitFlags,string>={
  loyalty:'Hűségpontok jóváírása az arra jogosult vásárlások után.',
  orderHistory:'Rendelési előzményeid egy helyen.',
  returns:'Egyszerűbb visszaküldés és ügykövetés.',
  digitalDownloads:'Digitális letöltéseid és dokumentumaid a fiókodban.',
};

export function resolveCheckoutAccountBenefits(flags:CheckoutAccountBenefitFlags):CheckoutAccountBenefit[]{
  return (Object.keys(LABELS) as Array<keyof CheckoutAccountBenefitFlags>)
    .filter(key=>flags[key])
    .map(key=>({key,label:LABELS[key]}));
}
