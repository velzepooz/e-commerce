export const ContentDispositionEnum = {
  INLINE: 'INLINE',
  ATTACHMENT: 'ATTACHMENT',
} as const;

export type ContentDisposition =
  (typeof ContentDispositionEnum)[keyof typeof ContentDispositionEnum];
