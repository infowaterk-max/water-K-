export function normalizeHuTaxNumber(value:string){
  const trimmed=value.trim();
  const digits=trimmed.replace(/\D/g,'');
  if(digits.length===11)return `${digits.slice(0,8)}-${digits[8]}-${digits.slice(9)}`;
  return trimmed;
}

export function isValidHuTaxNumber(value:string){
  const normalized=normalizeHuTaxNumber(value);
  if(!/^\d{8}-\d-\d{2}$/.test(normalized))return false;
  const firstEight=normalized.slice(0,8);
  if(firstEight==='00000000')return false;
  const digits=[...firstEight].map(Number);
  const weights=[9,7,3,1,9,7,3];
  const sum=weights.reduce((total,weight,index)=>total+digits[index]*weight,0);
  const expected=(10-(sum%10))%10;
  return digits[7]===expected;
}
