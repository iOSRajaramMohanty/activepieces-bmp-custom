declare module '@activepieces/piece-ada-bmp' {
  import type { Piece, PieceAuth } from '@activepieces/pieces-framework';

  export const adaBmp: Piece<ReturnType<typeof PieceAuth.CustomAuth>>;
  export const adaBmpAuth: ReturnType<typeof PieceAuth.CustomAuth>;
  export default adaBmp;
}
