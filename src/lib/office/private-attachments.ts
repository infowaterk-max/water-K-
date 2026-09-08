export const OFFICE_PRIVATE_ATTACHMENT_BUCKET='office-private';
export const OFFICE_PRIVATE_ATTACHMENT_MAX_FILES=5;
export const OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES=10*1024*1024;
export const OFFICE_PRIVATE_ATTACHMENT_SIGNED_DOWNLOAD_SECONDS=60;

export const OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES=[
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type OfficePrivateAttachmentMimeType=(typeof OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES)[number];

export type OfficePrivateAttachmentUploadReservation={
  attachmentId:string;
  path:string;
  name:string;
  contentType:OfficePrivateAttachmentMimeType;
  size:number;
  expiresAt:string;
  token:string;
};
