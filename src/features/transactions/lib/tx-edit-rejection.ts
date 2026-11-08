// An expected, user-actionable refusal of a transaction edit (guard failed, row
// gone, pair changed underneath). The update action turns it into
// `{ ok: false, message }` because Next.js production builds replace the message
// of anything a Server Action throws with a generic one — the Vietnamese copy
// would never reach the user. Anything else still throws.
export class TxEditRejection extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TxEditRejection";
  }
}
