// Shared, serializable state for the client-side Office email composer.
// Never export a value from a 'use server' actions module.
export type OfficeComposerActionState={
  status:'idle'|'success'|'blocked'|'conflict'|'error';
  message:string;
  draftId?:string;
  revision?:number;
};
export const officeComposerInitialState:OfficeComposerActionState={status:'idle',message:''};
